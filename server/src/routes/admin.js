import { Router } from "express";
import { adminRequired, hashPassword } from "../middleware/auth.js";
import { socialIconUpload, toSocialIconUrl, mapWithProfileImageUrl, withProfileImageUrl, paymentScreenshotUpload, portalImageUpload, portalVideoUpload } from "../middleware/upload.js";
import { AuditLog } from "../models/AuditLog.js";
import { LeaderboardEntry } from "../models/LeaderboardEntry.js";
import { Match } from "../models/Match.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { getSiteSettings, getPaymentGateway, getModuleVisibility, isRegistrationEnabled, normalizeModuleVisibility } from "../models/SiteSettings.js";
import { getGatewayStatus } from "../utils/paymentGateway.js";
import { normalizeRegistrationFees, getRegistrationFeeInr } from "../utils/registrationFees.js";
import { User } from "../models/User.js";
import { PlayerActivity } from "../models/PlayerActivity.js";
import { writeAudit } from "../utils/audit.js";
import {
  sendRegistrationConfirmedEmail,
  sendRegistrationRejectedEmail,
} from "../utils/mail.js";
import { recordPlayerActivity } from "../utils/activity.js";
import { FRANCHISES, getFranchiseName } from "../utils/franchises.js";
import { buildPointsTable } from "../utils/points.js";
import { persistUploadedFile } from "../utils/mediaStore.js";
import {
  isValidImageSectionId,
  isValidVideoSectionId,
  MAX_IMAGES_PER_SECTION,
  MAX_VIDEOS_PER_SECTION,
} from "../constants/portalMedia.js";
import {
  buildPortalMediaResponse,
  countSectionImages,
  deletePortalMediaFile,
  findPortalImageItem,
  findPortalVideoBySection,
  findPortalVideoItem,
  newPortalMediaItemId,
} from "../utils/portalMedia.js";
import {
  getSponsorPackageConfig,
  listSponsorPackagesPublic,
  normalizeSponsorPackagesInput,
} from "../utils/sponsorPackages.js";

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

router.patch("/registrations/:id/mark-payment-paid", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const current = String(
      registration.paymentStatus || registration.payment?.status || "pending"
    ).toLowerCase();
    if (current === "paid") {
      return res.json({ registration: withProfileImageUrl(registration) });
    }

    const hasUtr = Boolean(String(registration.utrNumber || "").trim());
    const hasShot = Boolean(String(registration.paymentScreenshot || "").trim());
    if (!hasUtr && !hasShot) {
      return res.status(400).json({
        error: "Add a UTR number or payment screenshot before marking as paid.",
      });
    }

    const feeInr =
      Number(registration.payment?.amountInr) ||
      (await getRegistrationFeeInr(registration.interest || "player"));
    const adminName = req.user?.name || req.user?.email || "admin";
    const paidAt = new Date();
    const prevPayment = registration.payment?.toObject?.() || registration.payment || {};
    const provider = prevPayment.paymentId ? "razorpay" : "offline";

    registration.paymentStatus = "paid";
    registration.payNowEnabled = false;
    registration.payment = {
      ...prevPayment,
      provider,
      status: "paid",
      amountInr: feeInr,
      currency: "INR",
      paidAt,
    };

    await registration.save();

    await recordPlayerActivity({
      registrationId: registration._id,
      userId: registration.userId,
      action: "payment.marked_paid",
      summary: `${adminName} (admin) marked payment as paid for ${registration.fullName}`,
      actorName: adminName,
      actorRole: "admin",
      details: {
        from: current,
        to: "paid",
        amountInr: feeInr,
        utrNumber: registration.utrNumber || "",
        provider,
      },
    });

    await writeAudit(req, {
      action: "registration.payment_marked_paid",
      targetType: "registration",
      targetId: registration._id,
      targetLabel: `${registration.fullName} <${registration.email}>`,
      details: {
        summary: `Marked ${registration.fullName} payment as paid (₹${feeInr})`,
        amountInr: feeInr,
        utrNumber: registration.utrNumber || "",
        markedBy: adminName,
        markedAt: paidAt.toISOString(),
      },
    });

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("mark-payment-paid error", error);
    return res.status(500).json({ error: "Unable to mark payment as paid." });
  }
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

      if (status === "verified") {
        sendRegistrationConfirmedEmail({
          to: registration.email,
          fullName: registration.fullName,
          interest: registration.interest,
          franchiseName: registration.franchiseName,
          adminNotes,
        });
      } else if (status === "rejected") {
        sendRegistrationRejectedEmail({
          to: registration.email,
          fullName: registration.fullName,
          interest: registration.interest,
          adminNotes,
        });
      }
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
        registrationFees: normalizeRegistrationFees(settings.registrationFees),
        sponsorPackages: await getSponsorPackageConfig(),
        registrationEnabled: isRegistrationEnabled(settings),
        moduleVisibility: getModuleVisibility(settings),
        paymentGateway: getPaymentGateway(settings),
        paymentGatewayStatus: getGatewayStatus(),
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
    const auditBits = [];

    if (req.body.contact) {
      const contact = req.body.contact || {};
      settings.contact = {
        email: String(contact.email || "").trim() || settings.contact.email,
        phone: String(contact.phone || "").trim() || settings.contact.phone,
        address: String(contact.address || "").trim() || settings.contact.address,
      };
      auditBits.push(`contact (${settings.contact.email})`);
    }

    if (Array.isArray(req.body.socials)) {
      settings.socials = req.body.socials
        .map((s) => ({
          label: String(s.label || "").trim(),
          href: String(s.href || "#").trim() || "#",
          iconUrl: String(s.iconUrl || "").trim(),
        }))
        .filter((s) => s.label);
      auditBits.push(`${settings.socials.length} social links`);
    }

    if (req.body.registrationFees) {
      settings.registrationFees = normalizeRegistrationFees(req.body.registrationFees);
      auditBits.push("registration fees");
    }

    if (Array.isArray(req.body.sponsorPackages)) {
      settings.sponsorPackages = normalizeSponsorPackagesInput(req.body.sponsorPackages);
      auditBits.push("sponsor packages");
    }

    if (typeof req.body.registrationEnabled === "boolean") {
      settings.registrationEnabled = req.body.registrationEnabled;
      auditBits.push(
        req.body.registrationEnabled ? "registration shown" : "registration hidden"
      );
    }

    if (req.body.moduleVisibility && typeof req.body.moduleVisibility === "object") {
      settings.moduleVisibility = normalizeModuleVisibility(req.body.moduleVisibility);
      const hidden = Object.entries(settings.moduleVisibility)
        .filter(([, on]) => !on)
        .map(([key]) => key);
      auditBits.push(
        hidden.length ? `modules hidden: ${hidden.join(", ")}` : "all modules shown"
      );
    }

    if (req.body.paymentGateway) {
      const gateway = String(req.body.paymentGateway || "").trim().toLowerCase();
      if (gateway === "razorpay" || gateway === "cashfree") {
        settings.paymentGateway = gateway;
        auditBits.push(`payment gateway (${gateway})`);
      }
    }

    await settings.save();

    await writeAudit(req, {
      action: "settings.update",
      targetType: "settings",
      targetId: settings._id,
      targetLabel: "Site settings",
      details: {
        summary: auditBits.length
          ? `Updated ${auditBits.join(", ")}`
          : "Updated site settings",
      },
    });

    return res.json({
      settings: {
        contact: settings.contact,
        socials: settings.socials,
        registrationFees: normalizeRegistrationFees(settings.registrationFees),
        sponsorPackages: await getSponsorPackageConfig(),
        registrationEnabled: isRegistrationEnabled(settings),
        moduleVisibility: getModuleVisibility(settings),
        paymentGateway: getPaymentGateway(settings),
        paymentGatewayStatus: getGatewayStatus(),
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

router.get("/sponsors", adminRequired, async (_req, res) => {
  try {
    const packages = await listSponsorPackagesPublic();
    const buyers = await PlayerRegistration.find({
      interest: "sponsor",
      paymentStatus: "paid",
    })
      .select(
        "fullName company email phone sponsorPackageId sponsorPackageTitle paymentStatus status createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ packages, buyers });
  } catch (error) {
    console.error("admin sponsors get", error);
    return res.status(500).json({ error: "Unable to load sponsor data." });
  }
});

router.put("/sponsors/packages", adminRequired, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    settings.sponsorPackages = normalizeSponsorPackagesInput(req.body.packages);
    await settings.save();

    await writeAudit(req, {
      action: "sponsor_packages.update",
      targetType: "settings",
      targetId: settings._id,
      targetLabel: "Sponsor packages",
      details: { summary: "Updated sponsor package prices and slot limits" },
    });

    const packages = await listSponsorPackagesPublic();
    return res.json({ packages });
  } catch (error) {
    console.error("admin sponsors put", error);
    return res.status(500).json({ error: "Unable to save sponsor packages." });
  }
});

router.get("/portal-media", adminRequired, async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    if (!settings.portalMedia) {
      settings.portalMedia = { images: [], videos: [] };
    }
    return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
  } catch (error) {
    console.error("admin portal-media get", error);
    return res.status(500).json({ error: "Unable to load portal media." });
  }
});

router.post("/portal-media/images", adminRequired, (req, res) => {
  portalImageUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Image upload failed." });
    }
    try {
      const sectionId = String(req.body.sectionId || "").trim();
      if (!isValidImageSectionId(sectionId)) {
        if (req.file) await deletePortalMediaFile(req.file.filename, "image");
        return res.status(400).json({ error: "Invalid image section." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Please choose an image file." });
      }

      const settings = await getSiteSettings();
      if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
      if (!Array.isArray(settings.portalMedia.images)) settings.portalMedia.images = [];

      if (countSectionImages(settings.portalMedia, sectionId) >= MAX_IMAGES_PER_SECTION) {
        await deletePortalMediaFile(req.file.filename, "image");
        return res.status(400).json({
          error: `This section already has the maximum of ${MAX_IMAGES_PER_SECTION} images.`,
        });
      }

      const title = String(req.body.title || "").trim();
      const caption = String(req.body.caption || "").trim();
      const item = {
        id: newPortalMediaItemId(),
        sectionId,
        filename: req.file.filename,
        title,
        caption,
      };
      settings.portalMedia.images.push(item);
      await settings.save();

      await writeAudit(req, {
        action: "portal_media.image_upload",
        targetType: "portal_media",
        targetId: item.id,
        targetLabel: `${sectionId}: ${title || item.filename}`,
        details: { sectionId, filename: item.filename },
      });

      return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
    } catch (error) {
      console.error("portal-media image upload", error);
      if (req.file) await deletePortalMediaFile(req.file.filename, "image");
      return res.status(500).json({ error: "Unable to upload image." });
    }
  });
});

router.patch("/portal-media/images/:itemId", adminRequired, (req, res) => {
  portalImageUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Image update failed." });
    }
    try {
      const settings = await getSiteSettings();
      if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
      const item = findPortalImageItem(settings.portalMedia, req.params.itemId);
      if (!item) {
        if (req.file) await deletePortalMediaFile(req.file.filename, "image");
        return res.status(404).json({ error: "Image not found." });
      }

      const title = String(req.body.title ?? item.title ?? "").trim();
      const caption = String(req.body.caption ?? item.caption ?? "").trim();
      item.title = title;
      item.caption = caption;

      if (req.file) {
        const prevFilename = item.filename;
        item.filename = req.file.filename;
        await deletePortalMediaFile(prevFilename, "image");
      }

      await settings.save();

      await writeAudit(req, {
        action: "portal_media.image_update",
        targetType: "portal_media",
        targetId: item.id,
        targetLabel: `${item.sectionId}: ${item.title || item.filename}`,
        details: { sectionId: item.sectionId, filename: item.filename },
      });

      return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
    } catch (error) {
      console.error("portal-media image update", error);
      if (req.file) await deletePortalMediaFile(req.file.filename, "image");
      return res.status(500).json({ error: "Unable to update image." });
    }
  });
});

router.delete("/portal-media/images/:itemId", adminRequired, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
    const images = settings.portalMedia.images || [];
    const index = images.findIndex((item) => item.id === req.params.itemId);
    if (index === -1) {
      return res.status(404).json({ error: "Image not found." });
    }

    const [removed] = images.splice(index, 1);
    settings.portalMedia.images = images;
    await settings.save();
    await deletePortalMediaFile(removed.filename, "image");

    await writeAudit(req, {
      action: "portal_media.image_delete",
      targetType: "portal_media",
      targetId: removed.id,
      targetLabel: `${removed.sectionId}: ${removed.title || removed.filename}`,
      details: { sectionId: removed.sectionId, filename: removed.filename },
    });

    return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
  } catch (error) {
    console.error("portal-media image delete", error);
    return res.status(500).json({ error: "Unable to delete image." });
  }
});

router.post("/portal-media/videos", adminRequired, (req, res) => {
  portalVideoUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Video upload failed." });
    }
    try {
      const sectionId = String(req.body.sectionId || "").trim();
      if (!isValidVideoSectionId(sectionId)) {
        if (req.file) await deletePortalMediaFile(req.file.filename, "video");
        return res.status(400).json({ error: "Invalid video section." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Please choose a video file." });
      }

      const settings = await getSiteSettings();
      if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
      if (!Array.isArray(settings.portalMedia.videos)) settings.portalMedia.videos = [];

      const existing = findPortalVideoBySection(settings.portalMedia, sectionId);
      if (existing) {
        await deletePortalMediaFile(req.file.filename, "video");
        return res.status(400).json({
          error: `This section already has a video. Edit or delete it before uploading another.`,
        });
      }

      const title = String(req.body.title || "").trim();
      const caption = String(req.body.caption || "").trim();
      const item = {
        id: newPortalMediaItemId(),
        sectionId,
        filename: req.file.filename,
        title,
        caption,
      };
      settings.portalMedia.videos.push(item);
      await settings.save();

      await writeAudit(req, {
        action: "portal_media.video_upload",
        targetType: "portal_media",
        targetId: item.id,
        targetLabel: `${sectionId}: ${title || item.filename}`,
        details: { sectionId, filename: item.filename },
      });

      return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
    } catch (error) {
      console.error("portal-media video upload", error);
      if (req.file) await deletePortalMediaFile(req.file.filename, "video");
      return res.status(500).json({ error: "Unable to upload video." });
    }
  });
});

router.patch("/portal-media/videos/:itemId", adminRequired, (req, res) => {
  portalVideoUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Video update failed." });
    }
    try {
      const settings = await getSiteSettings();
      if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
      const item = findPortalVideoItem(settings.portalMedia, req.params.itemId);
      if (!item) {
        if (req.file) await deletePortalMediaFile(req.file.filename, "video");
        return res.status(404).json({ error: "Video not found." });
      }

      const title = String(req.body.title ?? item.title ?? "").trim();
      const caption = String(req.body.caption ?? item.caption ?? "").trim();
      item.title = title;
      item.caption = caption;

      if (req.file) {
        const prevFilename = item.filename;
        item.filename = req.file.filename;
        await deletePortalMediaFile(prevFilename, "video");
      }

      await settings.save();

      await writeAudit(req, {
        action: "portal_media.video_update",
        targetType: "portal_media",
        targetId: item.id,
        targetLabel: `${item.sectionId}: ${item.title || item.filename}`,
        details: { sectionId: item.sectionId, filename: item.filename },
      });

      return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
    } catch (error) {
      console.error("portal-media video update", error);
      if (req.file) await deletePortalMediaFile(req.file.filename, "video");
      return res.status(500).json({ error: "Unable to update video." });
    }
  });
});

router.delete("/portal-media/videos/:itemId", adminRequired, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    if (!settings.portalMedia) settings.portalMedia = { images: [], videos: [] };
    const videos = settings.portalMedia.videos || [];
    const index = videos.findIndex((item) => item.id === req.params.itemId);
    if (index === -1) {
      return res.status(404).json({ error: "Video not found." });
    }

    const [removed] = videos.splice(index, 1);
    settings.portalMedia.videos = videos;
    await settings.save();
    await deletePortalMediaFile(removed.filename, "video");

    await writeAudit(req, {
      action: "portal_media.video_delete",
      targetType: "portal_media",
      targetId: removed.id,
      targetLabel: `${removed.sectionId}: ${removed.title || removed.filename}`,
      details: { sectionId: removed.sectionId, filename: removed.filename },
    });

    return res.json({ portalMedia: buildPortalMediaResponse(settings.portalMedia) });
  } catch (error) {
    console.error("portal-media video delete", error);
    return res.status(500).json({ error: "Unable to delete video." });
  }
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
