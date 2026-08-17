import { Router } from "express";
import { adminRequired, hashPassword } from "../middleware/auth.js";
import { socialIconUpload, toSocialIconUrl, mapWithProfileImageUrl, withProfileImageUrl, paymentScreenshotUpload } from "../middleware/upload.js";
import { AuditLog } from "../models/AuditLog.js";
import { LeaderboardEntry } from "../models/LeaderboardEntry.js";
import { Match } from "../models/Match.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { getSiteSettings } from "../models/SiteSettings.js";
import { User } from "../models/User.js";
import { PlayerActivity } from "../models/PlayerActivity.js";
import { writeAudit } from "../utils/audit.js";
import { recordPlayerActivity } from "../utils/activity.js";
import { FRANCHISES, getFranchiseName } from "../utils/franchises.js";
import { buildPointsTable } from "../utils/points.js";
import { persistUploadedFile } from "../utils/mediaStore.js";

function statusLabel(status) {
  if (status === "verified") return "accepted";
  return status || "pending";
}

const router = Router();

router.get("/stats", adminRequired, async (_req, res) => {
  const [
    usersCount,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    registrationsCount,
    pendingRegs,
    verifiedRegs,
    rejectedRegs,
    auctionSold,
    auctionUnsold,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    User.countDocuments({ role: { $ne: "admin" }, status: "pending" }),
    User.countDocuments({ role: { $ne: "admin" }, status: "approved" }),
    User.countDocuments({ role: { $ne: "admin" }, status: "rejected" }),
    PlayerRegistration.countDocuments(),
    PlayerRegistration.countDocuments({ status: "pending" }),
    PlayerRegistration.countDocuments({ status: "verified" }),
    PlayerRegistration.countDocuments({ status: "rejected" }),
    PlayerRegistration.countDocuments({ auctionStatus: "sold" }),
    PlayerRegistration.countDocuments({ auctionStatus: "unsold" }),
  ]);

  return res.json({
    stats: {
      usersCount,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      registrationsCount,
      pendingRegs,
      verifiedRegs,
      rejectedRegs,
      auctionSold,
      auctionUnsold,
    },
  });
});

router.get("/franchises", adminRequired, (_req, res) => {
  return res.json({ franchises: FRANCHISES });
});

router.get("/users", adminRequired, async (req, res) => {
  const filter = { role: { $ne: "admin" } };
  if (["pending", "approved", "rejected"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const users = await User.find(filter)
    .select("name email phone role status adminNotes createdAt reviewedAt")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ users });
});

router.patch("/users/:id", adminRequired, async (req, res) => {
  try {
    const status = String(req.body.status || "");
    const adminNotes = String(req.body.adminNotes || "").trim();

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot change admin account status." });
    }

    const prev = user.status;
    user.status = status;
    user.adminNotes = adminNotes;
    user.reviewedAt = new Date();
    await user.save();

    await writeAudit(req, {
      action: `user.${status}`,
      targetType: "user",
      targetId: user._id,
      targetLabel: `${user.name} <${user.email}>`,
      details: { from: prev, to: status, adminNotes },
    });

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        adminNotes: user.adminNotes,
        createdAt: user.createdAt,
        reviewedAt: user.reviewedAt,
      },
    });
  } catch (error) {
    console.error("admin user update error", error);
    return res.status(500).json({ error: "Unable to update user." });
  }
});

router.post("/users/:id/password", adminRequired, async (req, res) => {
  try {
    const password = String(req.body.password || "");
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot change admin password from this panel." });
    }

    user.passwordHash = await hashPassword(password);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    await writeAudit(req, {
      action: "user.password_reset",
      targetType: "user",
      targetId: user._id,
      targetLabel: `${user.name} <${user.email}>`,
      details: { note: "Admin set a new password" },
    });

    return res.json({
      ok: true,
      message: `Password updated for ${user.email}. Share the new password with the player.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("admin password update error", error);
    return res.status(500).json({ error: "Unable to update password." });
  }
});

router.get("/registrations", adminRequired, async (req, res) => {
  const filter = {};
  if (["pending", "verified", "rejected"].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (["player", "captain", "franchise", "sponsor"].includes(req.query.interest)) {
    filter.interest = req.query.interest;
  }
  if (["not_listed", "unsold", "sold"].includes(req.query.auctionStatus)) {
    filter.auctionStatus = req.query.auctionStatus;
  }
  if (req.query.franchiseId) {
    filter.franchiseId = String(req.query.franchiseId);
  }

  const registrations = await PlayerRegistration.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ registrations: mapWithProfileImageUrl(registrations) });
});

router.get("/teams", adminRequired, async (_req, res) => {
  const sold = await PlayerRegistration.find({
    status: "verified",
    auctionStatus: "sold",
    franchiseId: { $ne: "" },
  })
    .select(
      "fullName email phone company role city franchiseId franchiseName basePrice soldPrice auctionStatus interest photo profileImage paymentStatus payment utrNumber paymentScreenshot"
    )
    .sort({ fullName: 1 })
    .lean();

  const byTeam = {};
  for (const f of FRANCHISES) {
    byTeam[f.id] = [];
  }
  for (const player of sold) {
    if (!byTeam[player.franchiseId]) byTeam[player.franchiseId] = [];
    byTeam[player.franchiseId].push(withProfileImageUrl(player));
  }

  return res.json({
    teams: FRANCHISES.map((f) => ({
      ...f,
      playerCount: byTeam[f.id]?.length || 0,
      players: byTeam[f.id] || [],
    })),
  });
});

router.get("/registrations/:id/activities", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id)
      .select("_id fullName email")
      .lean();
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const activities = await PlayerActivity.find({ registrationId: registration._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      registration: {
        _id: registration._id,
        fullName: registration.fullName,
        email: registration.email,
      },
      activities,
    });
  } catch (error) {
    console.error("admin activities error", error);
    return res.status(500).json({ error: "Unable to load activities." });
  }
});

router.patch("/registrations/:id/payment-details", adminRequired, (req, res) => {
  paymentScreenshotUpload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Image upload failed due to size. Please try again or use a smaller file.",
        });
      }
      return res.status(400).json({ error: err.message || "Upload failed." });
    }

    try {
      const registration = await PlayerRegistration.findById(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found." });
      }

      // Screenshot filename uses record (player) name via multer helper + fullName in form body
      req.body.fullName = registration.fullName;

      const prevUtr = String(registration.utrNumber || "").trim().toUpperCase();
      const prevShot = String(registration.paymentScreenshot || "").trim();

      const utrNumber = String(req.body.utrNumber || "")
        .trim()
        .toUpperCase();
      const newShot = req.file?.filename || "";

      const utrChanged = Boolean(utrNumber) && utrNumber !== prevUtr;
      const shotChanged = Boolean(newShot);

      if (!utrChanged && !shotChanged) {
        return res.status(400).json({
          error: "No payment changes to save. Update UTR or upload a new screenshot.",
        });
      }

      if (utrChanged) {
        const utrExists = await PlayerRegistration.findOne({
          utrNumber,
          _id: { $ne: registration._id },
        }).lean();
        if (utrExists) {
          return res.status(409).json({ error: "UTR already exist" });
        }
        registration.utrNumber = utrNumber;
      }

      if (shotChanged) {
        await persistUploadedFile(req.file, "payment");
        registration.paymentScreenshot = newShot;
      }

      if (!registration.utrNumber && !registration.paymentScreenshot) {
        return res.status(400).json({ error: "Please add a UTR number or payment screenshot." });
      }

      const addedAt = new Date();
      const adminName = req.user?.name || req.user?.email || "admin";
      registration.paymentDetailsAddedBy = adminName;
      registration.paymentDetailsAddedAt = addedAt;

      await registration.save();

      const bits = [];
      if (utrChanged) bits.push(prevUtr ? "updated UTR" : "UTR");
      if (shotChanged) bits.push(prevShot ? "updated payment screenshot" : "payment screenshot");
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: prevUtr || prevShot ? "payment.details_updated" : "payment.details_added",
        summary: `${adminName} (admin) ${bits.join(" and ")} for ${registration.fullName}`,
        actorName: adminName,
        actorRole: "admin",
        details: {
          utrChanged,
          shotChanged,
          utrNumber: registration.utrNumber || "",
          paymentScreenshot: registration.paymentScreenshot || "",
        },
      });

      await writeAudit(req, {
        action: "registration.payment_details",
        targetType: "registration",
        targetId: registration._id,
        targetLabel: `${registration.fullName} <${registration.email}>`,
        details: {
          utrNumber: registration.utrNumber || "",
          paymentScreenshot: registration.paymentScreenshot || "",
          addedBy: adminName,
          addedAt: addedAt.toISOString(),
        },
      });

      return res.json({ registration: withProfileImageUrl(registration) });
    } catch (error) {
      console.error("admin payment-details error", error);
      if (error?.code === 11000 && String(error?.message || "").includes("utrNumber")) {
        return res.status(409).json({ error: "UTR already exist" });
      }
      return res.status(500).json({ error: "Unable to update payment details." });
    }
  });
});

router.patch("/registrations/:id/enable-pay-now", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const paymentStatus = String(
      registration.paymentStatus || registration.payment?.status || "pending"
    ).toLowerCase();
    if (paymentStatus === "paid") {
      return res.status(400).json({ error: "Payment is already completed." });
    }

    if (registration.payNowEnabled) {
      return res.json({ registration: withProfileImageUrl(registration) });
    }

    const adminName = req.user?.name || req.user?.email || "admin";
    registration.payNowEnabled = true;
    registration.payNowEnabledBy = adminName;
    registration.payNowEnabledAt = new Date();
    await registration.save();

    await recordPlayerActivity({
      registrationId: registration._id,
      userId: registration.userId,
      action: "payment.pay_now_enabled",
      summary: `${adminName} (admin) enabled Pay now for ${registration.fullName}`,
      actorName: adminName,
      actorRole: "admin",
      details: { payNowEnabled: true },
    });

    await writeAudit(req, {
      action: "registration.pay_now_enabled",
      targetType: "registration",
      targetId: registration._id,
      targetLabel: `${registration.fullName} <${registration.email}>`,
      details: { enabledBy: adminName },
    });

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("enable-pay-now error", error);
    return res.status(500).json({ error: "Unable to enable Pay now." });
  }
});

router.patch("/registrations/:id", adminRequired, async (req, res) => {
  try {
    const status = String(req.body.status || "");
    const adminNotes = String(req.body.adminNotes || "").trim();
    const franchiseId = String(req.body.franchiseId || "").trim();

    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const prev = registration.status;
    const prevFranchiseId = String(registration.franchiseId || "").trim();
    const prevFranchiseName = String(registration.franchiseName || "").trim();
    const statusChanged = prev !== status;
    const notesChanged = String(registration.adminNotes || "").trim() !== adminNotes;
    const adminName = req.user?.name || req.user?.email || "admin";

    if (registration.interest === "franchise") {
      const nextFranchiseId = franchiseId || String(registration.franchiseId || "").trim();
      if (status === "verified" && !nextFranchiseId) {
        return res.status(400).json({ error: "Assign a franchise team before accepting." });
      }
      if (nextFranchiseId) {
        const taken = await PlayerRegistration.findOne({
          _id: { $ne: registration._id },
          interest: "franchise",
          status: { $in: ["pending", "verified"] },
          franchiseId: nextFranchiseId,
        }).lean();
        if (taken) {
          return res.status(409).json({
            error: `${getFranchiseName(nextFranchiseId) || "This team"} is already assigned.`,
          });
        }
        registration.franchiseId = nextFranchiseId;
        registration.franchiseName = getFranchiseName(nextFranchiseId);
      }
    }

    const teamChanged =
      registration.interest === "franchise" &&
      String(registration.franchiseId || "") !== prevFranchiseId;

    if (!statusChanged && !notesChanged && !teamChanged) {
      return res.json({ registration: withProfileImageUrl(registration) });
    }

    registration.status = status;
    registration.adminNotes = adminNotes;
    if (statusChanged) {
      registration.reviewedAt = new Date();
    }
    if (status === "verified" && registration.auctionStatus === "not_listed") {
      // ready for auction pool after accept
    }
    await registration.save();

    if (registration.userId && statusChanged) {
      const userStatus =
        status === "verified" ? "approved" : status === "rejected" ? "rejected" : "pending";
      await User.findByIdAndUpdate(registration.userId, {
        status: userStatus,
        adminNotes: adminNotes || undefined,
        reviewedAt: new Date(),
      });
    }

    if (statusChanged) {
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: `registration.status_${status}`,
        summary: `${adminName} (admin) moved ${registration.fullName} from ${statusLabel(prev)} to ${statusLabel(status)}`,
        actorName: adminName,
        actorRole: "admin",
        details: { from: prev, to: status, adminNotes },
      });
    }

    if (teamChanged) {
      const teamName = registration.franchiseName || getFranchiseName(registration.franchiseId);
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: "franchise.team_assigned",
        summary: prevFranchiseId
          ? `${adminName} (admin) changed team from ${prevFranchiseName || prevFranchiseId} to ${teamName}`
          : `${adminName} (admin) assigned team ${teamName}`,
        actorName: adminName,
        actorRole: "admin",
        details: {
          fromFranchiseId: prevFranchiseId,
          fromFranchiseName: prevFranchiseName,
          toFranchiseId: registration.franchiseId,
          toFranchiseName: teamName,
          assignedBy: adminName,
        },
      });
    }

    await writeAudit(req, {
      action: `registration.${status === "verified" ? "approved" : status}`,
      targetType: "registration",
      targetId: registration._id,
      targetLabel: `${registration.fullName} <${registration.email}>`,
      details: { from: prev, to: status, adminNotes },
    });

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("admin update error", error);
    return res.status(500).json({ error: "Unable to update registration." });
  }
});

router.patch("/registrations/:id/auction", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ error: "Registration not found." });
    if (registration.status !== "verified") {
      return res.status(400).json({ error: "Only accepted players can be assigned in auction." });
    }

    const auctionStatus = String(req.body.auctionStatus || "not_listed");
    if (!["not_listed", "unsold", "sold"].includes(auctionStatus)) {
      return res.status(400).json({ error: "Invalid auction status." });
    }

    const franchiseId = String(req.body.franchiseId || "").trim();
    const basePrice = Number(req.body.basePrice || 0);
    const soldPrice = Number(req.body.soldPrice || 0);

    if (auctionStatus === "sold" && !franchiseId) {
      return res.status(400).json({ error: "Select a franchise for sold players." });
    }

    const prev = {
      auctionStatus: registration.auctionStatus || "not_listed",
      franchiseId: registration.franchiseId || "",
      franchiseName: registration.franchiseName || "",
      basePrice: Number(registration.basePrice || 0),
      soldPrice: Number(registration.soldPrice || 0),
    };

    let nextFranchiseId = franchiseId;
    let nextFranchiseName = getFranchiseName(franchiseId);
    let nextBase = Number.isFinite(basePrice) ? basePrice : 0;
    let nextSold = Number.isFinite(soldPrice) ? soldPrice : 0;

    if (auctionStatus === "unsold") {
      nextFranchiseId = "";
      nextFranchiseName = "";
      nextSold = 0;
    }

    const next = {
      auctionStatus,
      franchiseId: nextFranchiseId,
      franchiseName: nextFranchiseName,
      basePrice: nextBase,
      soldPrice: nextSold,
    };

    const unchanged =
      prev.auctionStatus === next.auctionStatus &&
      prev.franchiseId === next.franchiseId &&
      prev.basePrice === next.basePrice &&
      prev.soldPrice === next.soldPrice;

    if (unchanged) {
      return res.json({ registration: withProfileImageUrl(registration), unchanged: true });
    }

    registration.auctionStatus = next.auctionStatus;
    registration.franchiseId = next.franchiseId;
    registration.franchiseName = next.franchiseName;
    registration.basePrice = next.basePrice;
    registration.soldPrice = next.soldPrice;
    await registration.save();

    await writeAudit(req, {
      action: "registration.auction_update",
      targetType: "registration",
      targetId: registration._id,
      targetLabel: `${registration.fullName} <${registration.email}>`,
      details: {
        summary: `Assigned to ${next.franchiseName || "no team"} · ${next.auctionStatus} · base ₹${next.basePrice} · sold ₹${next.soldPrice}`,
        from: prev,
        to: next,
      },
    });

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("auction update error", error);
    return res.status(500).json({ error: "Unable to update auction assignment." });
  }
});

router.get("/audit-logs", adminRequired, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  return res.json({ logs });
});

router.get("/settings", adminRequired, async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({
      settings: {
        contact: settings.contact,
        socials: settings.socials,
      },
    });
  } catch (error) {
    console.error("admin settings get", error);
    return res.status(500).json({ error: "Unable to load settings." });
  }
});

router.put("/settings", adminRequired, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    const contact = req.body.contact || {};
    const socials = Array.isArray(req.body.socials) ? req.body.socials : settings.socials;

    settings.contact = {
      email: String(contact.email || "").trim() || settings.contact.email,
      phone: String(contact.phone || "").trim() || settings.contact.phone,
      address: String(contact.address || "").trim() || settings.contact.address,
    };

    settings.socials = socials
      .map((s) => ({
        label: String(s.label || "").trim(),
        href: String(s.href || "#").trim() || "#",
        iconUrl: String(s.iconUrl || "").trim(),
      }))
      .filter((s) => s.label);

    await settings.save();

    await writeAudit(req, {
      action: "settings.update",
      targetType: "settings",
      targetId: settings._id,
      targetLabel: "Site contact & social media",
      details: {
        summary: `Updated contact (${settings.contact.email}) and ${settings.socials.length} social links`,
      },
    });

    return res.json({
      settings: {
        contact: settings.contact,
        socials: settings.socials,
      },
    });
  } catch (error) {
    console.error("admin settings put", error);
    return res.status(500).json({ error: "Unable to save settings." });
  }
});

router.post("/settings/social-icon", adminRequired, (req, res) => {
  socialIconUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Icon upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please choose an icon image." });
    }
    return res.json({ iconUrl: toSocialIconUrl(req.file) });
  });
});

function parseMatchBody(body) {
  const teamAId = String(body.teamAId || "").trim();
  const teamBId = String(body.teamBId || "").trim();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const status = ["upcoming", "live", "completed", "cancelled"].includes(body.status)
    ? body.status
    : "upcoming";
  const stage = ["league", "semi", "final", "other"].includes(body.stage) ? body.stage : "league";

  if (!teamAId || !teamBId || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { error: "Team A, Team B, and schedule date/time are required." };
  }
  if (teamAId === teamBId) {
    return { error: "Team A and Team B must be different." };
  }

  const winnerId = String(body.winnerId || "").trim();
  return {
    data: {
      matchNumber: Number(body.matchNumber) || 0,
      stage,
      teamAId,
      teamAName: getFranchiseName(teamAId) || String(body.teamAName || "").trim(),
      teamBId,
      teamBName: getFranchiseName(teamBId) || String(body.teamBName || "").trim(),
      scheduledAt,
      venue: String(body.venue || "").trim(),
      status,
      teamAScore: String(body.teamAScore || "").trim(),
      teamBScore: String(body.teamBScore || "").trim(),
      winnerId,
      winnerName: winnerId ? getFranchiseName(winnerId) : "",
      resultSummary: String(body.resultSummary || "").trim(),
    },
  };
}

router.get("/matches", adminRequired, async (_req, res) => {
  const matches = await Match.find().sort({ scheduledAt: 1 }).lean();
  return res.json({ matches, points: buildPointsTable(matches), franchises: FRANCHISES });
});

router.post("/matches", adminRequired, async (req, res) => {
  try {
    const parsed = parseMatchBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const match = await Match.create(parsed.data);
    await writeAudit(req, {
      action: "match.create",
      targetType: "match",
      targetId: match._id,
      targetLabel: `${match.teamAName} vs ${match.teamBName}`,
      details: { summary: `Fixture #${match.matchNumber || "-"} · ${match.status}` },
    });
    return res.status(201).json({ match });
  } catch (error) {
    console.error("match create", error);
    return res.status(500).json({ error: "Unable to create match." });
  }
});

router.patch("/matches/:id", adminRequired, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found." });
    const parsed = parseMatchBody({ ...match.toObject(), ...req.body });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    Object.assign(match, parsed.data);
    await match.save();
    await writeAudit(req, {
      action: "match.update",
      targetType: "match",
      targetId: match._id,
      targetLabel: `${match.teamAName} vs ${match.teamBName}`,
      details: { summary: `Updated · ${match.status}` },
    });
    return res.json({ match });
  } catch (error) {
    console.error("match update", error);
    return res.status(500).json({ error: "Unable to update match." });
  }
});

router.delete("/matches/:id", adminRequired, async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found." });
    await writeAudit(req, {
      action: "match.delete",
      targetType: "match",
      targetId: match._id,
      targetLabel: `${match.teamAName} vs ${match.teamBName}`,
      details: { summary: "Match deleted" },
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error("match delete", error);
    return res.status(500).json({ error: "Unable to delete match." });
  }
});

router.get("/leaderboard", adminRequired, async (_req, res) => {
  const entries = await LeaderboardEntry.find().sort({ category: 1, sortOrder: 1, value: -1 }).lean();
  return res.json({ entries, franchises: FRANCHISES });
});

router.post("/leaderboard", adminRequired, async (req, res) => {
  try {
    const playerName = String(req.body.playerName || "").trim();
    if (!playerName) return res.status(400).json({ error: "Player name is required." });
    const teamId = String(req.body.teamId || "").trim();
    const category = ["batting", "bowling", "mvp"].includes(req.body.category)
      ? req.body.category
      : "batting";
    const entry = await LeaderboardEntry.create({
      category,
      playerName,
      teamId,
      teamName: getFranchiseName(teamId),
      value: Number(req.body.value) || 0,
      matches: Number(req.body.matches) || 0,
      note: String(req.body.note || "").trim(),
      sortOrder: Number(req.body.sortOrder) || 0,
    });
    return res.status(201).json({ entry });
  } catch (error) {
    console.error("leaderboard create", error);
    return res.status(500).json({ error: "Unable to add leaderboard entry." });
  }
});

router.delete("/leaderboard/:id", adminRequired, async (req, res) => {
  try {
    const entry = await LeaderboardEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found." });
    return res.json({ ok: true });
  } catch (error) {
    console.error("leaderboard delete", error);
    return res.status(500).json({ error: "Unable to delete entry." });
  }
});

export default router;
