import { Router } from "express";
import { createHash, randomBytes } from "crypto";
import { User } from "../models/User.js";
import {
  authRequired,
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyPassword,
} from "../middleware/auth.js";

const router = Router();

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role === "admin" ? "admin" : "user",
    status: user.role === "admin" ? "approved" : user.status || "pending",
    createdAt: user.createdAt,
  };
}

router.post("/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "user",
      status: "approved",
    });

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: "user",
      status: "approved",
    });
    setAuthCookie(res, token);

    return res.json({
      user: publicUser(user),
      message: "Account created. Submit player registration for admin review.",
    });
  } catch (error) {
    console.error("signup error", error);
    return res.status(500).json({ error: "Unable to create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password." });

    if (user.role === "admin") {
      return res.status(403).json({
        error: "Admin accounts must use the Admin Portal login.",
        adminLogin: "/admin/login",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "Your account was rejected by admin. Contact support if needed.",
      });
    }

    // Treat older pending accounts as approved (player registration is the only review step)
    if (user.status === "pending") {
      user.status = "approved";
      await user.save();
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: "user",
      status: "approved",
    });
    setAuthCookie(res, token);

    return res.json({ user: publicUser({ ...user.toObject(), status: "approved", role: "user" }) });
  } catch (error) {
    console.error("login error", error);
    return res.status(500).json({ error: "Unable to sign in." });
  }
});

router.post("/admin-login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Invalid admin email or password." });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid admin email or password." });

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: "admin",
      status: "approved",
    });
    setAuthCookie(res, token, { admin: true });

    return res.json({ user: publicUser({ ...user.toObject(), role: "admin", status: "approved" }) });
  } catch (error) {
    console.error("admin-login error", error);
    return res.status(500).json({ error: "Unable to sign in to admin portal." });
  }
});

router.post("/logout", (req, res) => {
  const portal = String(req.headers["x-uscl-portal"] || "").toLowerCase();
  clearAuthCookie(res, { admin: portal === "admin" });
  return res.json({ ok: true });
});

router.get("/me", authRequired, async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "name email phone role status createdAt adminNotes"
  );
  if (!user) {
    const portal = String(req.headers["x-uscl-portal"] || "").toLowerCase();
    clearAuthCookie(res, { admin: portal === "admin" });
    return res.status(401).json({ user: null });
  }
  return res.json({ user: publicUser(user) });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required." });

    const generic = {
      message: "If an account exists for that email, you can continue with a password reset.",
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.json(generic);
    }

    if (user.role === "admin") {
      return res.json({
        message: "Admin accounts cannot use player password reset. Use the Admin login page.",
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    // No email service configured yet — return the link so the player can reset now.
    // When SMTP is added later, send this link by email and stop returning resetLink.
    return res.json({
      message: "Reset link created. Open it within 1 hour to set a new password.",
      resetLink,
      email,
    });
  } catch (error) {
    console.error("forgot-password error", error);
    return res.status(500).json({ error: "Unable to process request." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!email || !token || !password) {
      return res.status(400).json({ error: "Email, token, and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({
      email,
      role: { $ne: "admin" },
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired." });
    }

    user.passwordHash = await hashPassword(password);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: "Password updated. You can sign in now." });
  } catch (error) {
    console.error("reset-password error", error);
    return res.status(500).json({ error: "Unable to reset password." });
  }
});

export default router;
