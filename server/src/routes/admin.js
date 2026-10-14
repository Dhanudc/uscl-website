import { Router } from "express";
import { adminRequired, hashPassword } from "../middleware/auth.js";
import { documentUploadAuth } from "../middleware/documentUploadAuth.js";
import { getPublicApiBase, signDocumentUploadToken } from "../utils/documentUploadToken.js";
import { socialIconUpload, toSocialIconUrl, eventImageUpload, toEventImageUrl, memberImageUpload, toMemberImageUrl, rewardImageUpload, toRewardImageUrl, mapWithProfileImageUrl, withProfileImageUrl, paymentScreenshotUpload, portalImageUpload, portalVideoUpload, profilePhotoUpload, playerRegistrationUpload, playerDocumentsUpload, toProfileImageMeta } from "../middleware/upload.js";
import { AuditLog } from "../models/AuditLog.js";
import { LeaderboardEntry } from "../models/LeaderboardEntry.js";
import { Match } from "../models/Match.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { getSiteSettings, getPaymentGateway, getModuleVisibility, resolveReferralChallenge, normalizeReferralChallenge, assertReferralPlayerCodes, isRegistrationEnabled, isReferralProgramEnabled, isPlayerDocumentsUploadEnabled, isPlayerPayNowEnabled, normalizeModuleVisibility, normalizeSocials, normalizeUpcomingEvents, normalizeMembersIntro, publicBoardMembers, normalizeBoardMembers, publicKeyDates, normalizeKeyDates, normalizeNavLabels } from "../models/SiteSettings.js";
import { getGatewayStatus } from "../utils/paymentGateway.js";
import {
  applyPlayerDocumentSubmission,
  bankStatementCount,
  canAdminManagePlayerDocuments,
  normalizeRequestedDocKeys,
  normalizeDocumentsVerificationStatus,
  buildDocumentsVerificationFilterOr,
  promotePendingDocumentReviewsToInProgress,
  enrichRegistration,
  enrichRegistrationAsync,
  mapEnrichedRegistrationsAsync,
  playerDocumentDiskPath,
} from "../utils/playerDocuments.js";
import { sendUserPasswordResetEmail } from "../utils/passwordReset.js";
import fs from "fs";
import path from "path";
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
import { isValidPlayerRole, playerRoleLabel } from "../constants/playerRoles.js";
import { allocateNextPlayerCode, backfillMissingPlayerCodes } from "../utils/playerCode.js";
import { buildRegistrationsCsv, parseReportColumnIds } from "../utils/reportColumns.js";
import { mapReferredPlayer, resolveReferralCode } from "../utils/referrals.js";
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
  getSponsorPackageById,
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
    referralCount,
    referrerCount,
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
    PlayerRegistration.countDocuments({ referredByPlayerCode: { $type: "string", $ne: "" } }),
    PlayerRegistration.distinct("referredByUserId", { referredByUserId: { $ne: null } }),
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
      referralCount,
      referrerCount: Array.isArray(referrerCount) ? referrerCount.length : 0,
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

router.post("/users/:id/send-password-reset", adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot send player reset email for an admin account." });
    }
    if (!String(user.email || "").trim()) {
      return res.status(400).json({ error: "User has no email address." });
    }

    const result = await sendUserPasswordResetEmail(user);

    await writeAudit(req, {
      action: "user.password_reset_email",
      targetType: "user",
      targetId: user._id,
      targetLabel: `${user.name} <${user.email}>`,
      details: { sent: Boolean(result.sent) },
    });

    if (result.sent) {
      return res.json({
        ok: true,
        message: `Password reset email sent to ${user.email} from notifications@usclt20.com.`,
      });
    }

    return res.json({
      ok: true,
      message: "SMTP is not configured. Use this reset link (valid 1 hour):",
      resetLink: result.resetLink,
      email: user.email,
    });
  } catch (error) {
    console.error("admin send password reset error", error);
    return res.status(500).json({ error: "Unable to send password reset email." });
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

router.patch("/users/:id/contact", adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot edit admin account from this panel." });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required." });
    }

    if (email !== user.email) {
      const taken = await User.findOne({ email, _id: { $ne: user._id } }).lean();
      if (taken) {
        return res.status(409).json({ error: "Another account already uses this email." });
      }
    }

    const prev = { name: user.name, email: user.email, phone: user.phone || "" };
    user.name = name;
    user.email = email;
    user.phone = phone;
    await user.save();

    await PlayerRegistration.updateMany(
      { userId: user._id },
      { $set: { fullName: name, email, phone } }
    );

    await writeAudit(req, {
      action: "user.contact_update",
      targetType: "user",
      targetId: user._id,
      targetLabel: `${user.name} <${user.email}>`,
      details: { from: prev, to: { name, email, phone } },
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
    console.error("admin user contact update error", error);
    return res.status(500).json({ error: "Unable to update user details." });
  }
});

function parseAdminListParam(raw, allowed, { mapAccepted = false } = {}) {
  if (raw == null || raw === "") return null;
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (mapAccepted && s === "accepted" ? "verified" : s));
  const valid = parts.filter((p) => allowed.includes(p));
  return valid.length ? valid : null;
}

router.get("/registrations", adminRequired, async (req, res) => {
  const filter = {};
  const statusAllowed = ["pending", "verified", "rejected"];
  if (req.query.status === "") {
    filter.status = { $in: [] };
  } else {
    const statusList = parseAdminListParam(req.query.status, statusAllowed, { mapAccepted: true });
    if (statusList) {
      filter.status = statusList.length === 1 ? statusList[0] : { $in: statusList };
    } else if (req.query.status == null) {
      filter.status = { $in: ["pending", "verified"] };
    } else if (["pending", "verified", "rejected"].includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
  }

  const interestAllowed = ["player", "captain", "franchise", "sponsor"];
  if (req.query.interest === "") {
    filter.interest = { $in: [] };
  } else {
    const interestList = parseAdminListParam(req.query.interest, interestAllowed);
    if (interestList) {
      filter.interest = interestList.length === 1 ? interestList[0] : { $in: interestList };
    } else if (["player", "captain", "franchise", "sponsor"].includes(req.query.interest)) {
      filter.interest = String(req.query.interest);
    }
  }
  if (["not_listed", "unsold", "sold"].includes(req.query.auctionStatus)) {
    filter.auctionStatus = req.query.auctionStatus;
  }
  if (req.query.franchiseId) {
    filter.franchiseId = String(req.query.franchiseId);
  }

  const docStatusAllowed = ["in_progress", "uploaded", "verified", "rejected"];
  if (req.query.docStatus === "") {
    filter._id = { $in: [] };
  } else {
    const docList = parseAdminListParam(req.query.docStatus, docStatusAllowed);
    const or = buildDocumentsVerificationFilterOr(docList || []);
    if (or.length) {
      filter.$and = [...(filter.$and || []), { $or: or }];
    }
  }

  await promotePendingDocumentReviewsToInProgress();

  const registrations = await PlayerRegistration.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ registrations: await mapEnrichedRegistrationsAsync(registrations) });
});

router.get("/registrations/:id", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id).lean();
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    return res.json({ registration: await enrichRegistrationAsync(registration) });
  } catch (error) {
    console.error("admin registration get error", error);
    return res.status(500).json({ error: "Unable to load registration." });
  }
});

router.get("/reports/preview", adminRequired, async (req, res) => {
  try {
    await backfillMissingPlayerCodes();
    await promotePendingDocumentReviewsToInProgress();
    const filter = buildReportFilter(req.query);
    const registrations = await PlayerRegistration.find(filter).sort({ playerCode: 1, createdAt: 1 }).lean();
    return res.json({
      count: registrations.length,
      registrations: mapWithProfileImageUrl(registrations).slice(0, 50),
    });
  } catch (error) {
    console.error("reports preview error", error);
    return res.status(500).json({ error: "Unable to load report preview." });
  }
});

router.get("/reports/export", adminRequired, async (req, res) => {
  try {
    await backfillMissingPlayerCodes();
    await promotePendingDocumentReviewsToInProgress();
    const filter = buildReportFilter(req.query);
    const registrations = await PlayerRegistration.find(filter).sort({ playerCode: 1, createdAt: 1 }).lean();
    const columnIds = parseReportColumnIds(req.query.fields);
    const csv = buildRegistrationsCsv(registrations, columnIds);

    const bits = ["uscl-report"];
    if (filter.status) {
      const st = filter.status.$in ? filter.status.$in.join("-") : filter.status;
      bits.push(st === "verified" ? "accepted" : st);
    }
    if (filter.interest) {
      bits.push(filter.interest.$in ? filter.interest.$in.join("-") : filter.interest);
    }
    if (filter.paymentStatus) {
      bits.push(
        `pay-${filter.paymentStatus.$in ? filter.paymentStatus.$in.join("-") : filter.paymentStatus}`
      );
    }
    if (filter.auctionStatus) {
      bits.push(filter.auctionStatus.$in ? filter.auctionStatus.$in.join("-") : filter.auctionStatus);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${bits.join("-")}-${stamp}.csv`;

    await writeAudit(req, {
      action: "reports.export",
      targetType: "report",
      targetId: null,
      targetLabel: filename,
      details: {
        summary: `Exported ${registrations.length} row(s)`,
        filter,
        count: registrations.length,
      },
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error) {
    console.error("reports export error", error);
    return res.status(500).json({ error: "Unable to export report." });
  }
});

function applyListFilter(filter, key, raw, allowed, { mapAccepted = false } = {}) {
  const list = parseAdminListParam(raw, allowed, { mapAccepted });
  if (!list) return;
  filter[key] = list.length === 1 ? list[0] : { $in: list };
}

function buildReportFilter(query = {}) {
  const filter = {};
  applyListFilter(filter, "status", query.status, ["pending", "verified", "rejected"], { mapAccepted: true });
  applyListFilter(filter, "interest", query.interest, ["player", "captain", "franchise", "sponsor"]);
  applyListFilter(filter, "paymentStatus", query.paymentStatus, ["pending", "paid", "failed", "cancelled"]);
  applyListFilter(filter, "auctionStatus", query.auctionStatus, ["not_listed", "unsold", "sold"]);

  const docList = parseAdminListParam(query.docStatus, ["in_progress", "uploaded", "verified", "rejected"]);
  const docOr = buildDocumentsVerificationFilterOr(docList || []);
  if (docOr.length) {
    filter.$and = [...(filter.$and || []), { $or: docOr }];
  }

  return filter;
}

router.post("/registrations", adminRequired, (req, res) => {
  playerRegistrationUpload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Image upload failed due to size. Please try again or use a smaller file.",
        });
      }
      return res.status(400).json({ error: err.message || "Upload failed." });
    }

    try {
      const fullName = String(req.body.fullName || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").trim();
      const company = String(req.body.company || "").trim();
      const designation = String(req.body.designation || "").trim();
      const password = String(req.body.password || "");
      const interestRaw = String(req.body.interest || "player").trim().toLowerCase();
      const interest = ["player", "captain", "franchise", "sponsor"].includes(interestRaw)
        ? interestRaw
        : "player";
      const needsPlayingRole = interest === "player" || interest === "captain";
      const role = needsPlayingRole
        ? String(req.body.role || "").trim()
        : interest;
      const requirePaymentRaw = String(req.body.requirePayment || "").toLowerCase();
      const requirePayment =
        ["true", "on", "1", "yes"].includes(requirePaymentRaw) || req.body.requirePayment === true;
      const statusRaw = String(req.body.status || "verified").trim().toLowerCase();
      const status = ["pending", "verified", "rejected"].includes(statusRaw) ? statusRaw : "verified";
      const adminName = req.user?.name || req.user?.email || "admin";
      const photoFile = req.files?.photo?.[0];

      if (!fullName || !email || !phone || !company) {
        return res.status(400).json({ error: "Name, email, phone, and company are required." });
      }
      if (needsPlayingRole && !isValidPlayerRole(role)) {
        return res.status(400).json({ error: "Please select a valid playing role." });
      }

      let user = await User.findOne({ email });
      let createdUser = false;
      if (!user) {
        if (password.length < 6) {
          return res.status(400).json({
            error: "Password (min 6 characters) is required when creating a new account.",
          });
        }
        user = await User.create({
          name: fullName,
          email,
          phone,
          passwordHash: await hashPassword(password),
          role: "user",
          status: status === "verified" ? "approved" : status === "rejected" ? "rejected" : "pending",
        });
        createdUser = true;
      } else {
        if (user.role === "admin") {
          return res.status(400).json({ error: "Cannot create a registration for an admin account." });
        }
        user.name = fullName;
        user.phone = phone || user.phone;
        if (password.length >= 6) {
          user.passwordHash = await hashPassword(password);
          user.resetPasswordTokenHash = null;
          user.resetPasswordExpires = null;
        }
        if (status === "verified") user.status = "approved";
        else if (status === "rejected") user.status = "rejected";
        await user.save();
      }

      const existing = await PlayerRegistration.findOne({
        userId: user._id,
        interest,
        status: { $in: ["pending", "verified"] },
      });
      if (existing) {
        return res.status(409).json({
          error: `This user already has an active ${interest} registration.`,
        });
      }

      const referralResult = await resolveReferralCode(
        req.body.referralPlayerCode || req.body.referredByPlayerCode,
        { currentUserId: user._id }
      );
      if (!referralResult.ok) {
        return res.status(400).json({ error: referralResult.error });
      }

      let feeInr = await getRegistrationFeeInr(interest);
      let sponsorPackageId = "";
      let sponsorPackageTitle = "";
      if (interest === "sponsor") {
        sponsorPackageId = String(req.body.sponsorPackageId || "").trim();
        if (!sponsorPackageId) {
          return res.status(400).json({ error: "Sponsor package is required for sponsor registrations." });
        }
        const pkg = await getSponsorPackageById(sponsorPackageId);
        if (!pkg) {
          return res.status(400).json({ error: "Invalid sponsor package." });
        }
        feeInr = pkg.priceInr;
        sponsorPackageTitle = pkg.title;
      }

      let photo = null;
      let profileImage = "";
      if (photoFile) {
        await persistUploadedFile(photoFile, "profile");
        photo = toProfileImageMeta(photoFile);
        profileImage = photo.filename;
      }

      const paymentStatus = requirePayment ? "pending" : "paid";
      let registration = null;
      let lastCreateError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const playerCode = await allocateNextPlayerCode();
          const payload = {
            userId: user._id,
            playerCode,
            fullName,
            email,
            phone,
            company,
            designation,
            role,
            interest,
            sponsorPackageId,
            sponsorPackageTitle,
            agreedToTerms: true,
            paymentStatus,
            payNowEnabled: requirePayment,
            payNowEnabledBy: requirePayment ? adminName : "",
            payNowEnabledAt: requirePayment ? new Date() : null,
            payment: {
              provider: "admin",
              status: paymentStatus === "paid" ? "paid" : "pending",
              amountInr: feeInr,
              currency: "INR",
              orderId: "",
              paymentId: requirePayment ? "" : `admin-waived-${Date.now()}`,
              signature: "",
              paidAt: paymentStatus === "paid" ? new Date() : null,
            },
            status,
            auctionStatus: "not_listed",
            adminNotes: String(req.body.adminNotes || "").trim(),
            reviewedAt: status !== "pending" ? new Date() : null,
            ...referralResult.referral,
          };
          if (photo && profileImage) {
            payload.photo = photo;
            payload.profileImage = profileImage;
          }
          registration = await PlayerRegistration.create(payload);
          lastCreateError = null;
          break;
        } catch (createErr) {
          lastCreateError = createErr;
          // Retry only on duplicate playerCode collisions.
          if (createErr?.code !== 11000 || !/playerCode/i.test(String(createErr?.message || ""))) {
            throw createErr;
          }
        }
      }
      if (!registration) {
        throw lastCreateError || new Error("Unable to allocate a unique player ID.");
      }

      await recordPlayerActivity({
        registrationId: registration._id,
        userId: user._id,
        action: "registration.admin_created",
        summary: `${adminName} (admin) created ${interest} registration for ${fullName}${
          requirePayment ? " (payment required)" : " (payment waived)"
        }`,
        actorName: adminName,
        actorRole: "admin",
        details: {
          email,
          company,
          designation,
          role,
          paymentStatus,
          requirePayment,
          createdUser,
          playerCode: registration.playerCode,
        },
      });

      await writeAudit(req, {
        action: "registration.admin_created",
        targetType: "registration",
        targetId: registration._id,
        targetLabel: `${fullName} <${email}>`,
        details: {
          interest,
          requirePayment,
          paymentStatus,
          createdUser,
          status,
          playerCode: registration.playerCode,
        },
      });

      return res.status(201).json({
        registration: withProfileImageUrl(registration),
        createdUser,
        message: requirePayment
          ? "Registration created. Player can pay from their dashboard."
          : "Registration created without payment.",
      });
    } catch (error) {
      console.error("admin create registration error", error);
      if (error?.code === 11000) {
        return res.status(409).json({
          error: "A registration or account with these details already exists.",
        });
      }
      if (error?.name === "ValidationError") {
        const first = Object.values(error.errors || {})[0];
        return res.status(400).json({
          error: first?.message || "Invalid registration data.",
        });
      }
      return res.status(500).json({
        error: error?.message || "Unable to create registration.",
      });
    }
  });
});

router.patch("/registrations/:id/details", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const fullName = String(req.body.fullName ?? registration.fullName).trim();
    const email = String(req.body.email ?? registration.email).trim().toLowerCase();
    const phone = String(req.body.phone ?? registration.phone).trim();
    const company = String(req.body.company ?? registration.company).trim();
    const designation = String(req.body.designation ?? registration.designation ?? "").trim();
    const needsPlayingRole =
      registration.interest === "player" || registration.interest === "captain";
    let role = String(req.body.role ?? registration.role).trim();

    if (!fullName || !email || !phone || !company) {
      return res.status(400).json({ error: "Name, email, phone, and company are required." });
    }
    if (needsPlayingRole) {
      if (!isValidPlayerRole(role)) {
        return res.status(400).json({ error: "Please select a valid playing role." });
      }
    } else {
      role = registration.interest || registration.role;
    }

    if (registration.userId) {
      const user = await User.findById(registration.userId);
      if (user && user.role !== "admin" && email !== user.email) {
        const taken = await User.findOne({ email, _id: { $ne: user._id } }).lean();
        if (taken) {
          return res.status(409).json({ error: "Another account already uses this email." });
        }
      }
    }

    const prev = {
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      company: registration.company,
      designation: registration.designation || "",
      role: registration.role,
    };

    registration.fullName = fullName;
    registration.email = email;
    registration.phone = phone;
    registration.company = company;
    registration.designation = designation;
    registration.role = role;
    await registration.save();

    if (registration.userId) {
      const user = await User.findById(registration.userId);
      if (user && user.role !== "admin") {
        user.name = fullName;
        user.email = email;
        user.phone = phone;
        await user.save();
      }
    }

    const adminName = req.user?.name || req.user?.email || "admin";
    await recordPlayerActivity({
      registrationId: registration._id,
      userId: registration.userId,
      action: "registration.details_updated",
      summary: `${adminName} (admin) updated details for ${fullName}`,
      actorName: adminName,
      actorRole: "admin",
      details: { from: prev, to: { fullName, email, phone, company, designation, role } },
    });

    await writeAudit(req, {
      action: "registration.details_update",
      targetType: "registration",
      targetId: registration._id,
      targetLabel: `${fullName} <${email}>`,
      details: { from: prev, to: { fullName, email, phone, company, designation, role } },
    });

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("admin registration details update error", error);
    return res.status(500).json({ error: "Unable to update registration details." });
  }
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

    return res.json({ registration: await enrichRegistrationAsync(registration) });
  } catch (error) {
    console.error("enable-pay-now error", error);
    return res.status(500).json({ error: "Unable to enable Pay now." });
  }
});

router.patch("/registrations/:id/document-requests", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    if (!canAdminManagePlayerDocuments(registration)) {
      return res.status(403).json({ error: "Document requests are not available for this registration." });
    }
    const keys = normalizeRequestedDocKeys(
      req.body.documentsRequestedFromPlayer ?? req.body.requested ?? []
    );
    const adminName = req.user?.name || req.user?.email || "admin";
    registration.documentsRequestedFromPlayer = keys;
    registration.documentsRequestedAt = keys.length ? new Date() : null;
    registration.documentsRequestedBy = keys.length ? adminName : "";
    await registration.save();

    await recordPlayerActivity({
      registrationId: registration._id,
      userId: registration.userId,
      action: keys.length ? "documents.reupload_requested" : "documents.reupload_cleared",
      summary: keys.length
        ? `${adminName} (admin) requested re-upload: ${keys.join(", ")}`
        : `${adminName} (admin) cleared document re-upload requests`,
      actorName: adminName,
      actorRole: "admin",
      details: { requested: keys },
    });

    return res.json({ registration: await enrichRegistrationAsync(registration) });
  } catch (error) {
    console.error("document-requests error", error);
    return res.status(500).json({
      error: error?.message || "Unable to save document requests.",
    });
  }
});

router.patch("/registrations/:id/documents-verification", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    if (!canAdminManagePlayerDocuments(registration)) {
      return res.status(403).json({ error: "Document verification is not available for this registration." });
    }

    const decision = String(req.body.status || req.body.decision || "").toLowerCase();
    if (!["verified", "rejected", "in_progress"].includes(decision)) {
      return res.status(400).json({ error: 'Status must be "in_progress", "verified", or "rejected".' });
    }

    const adminName = req.user?.name || req.user?.email || "admin";
    const patch = {
      documentsVerificationStatus: decision,
      documentsVerificationAt: new Date(),
      documentsVerificationBy: decision === "in_progress" ? "" : adminName,
    };
    const updated = await PlayerRegistration.findByIdAndUpdate(
      registration._id,
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const activityAction =
      decision === "verified"
        ? "documents.verified"
        : decision === "rejected"
          ? "documents.rejected"
          : "documents.in_progress";
    const activitySummary =
      decision === "verified"
        ? `${adminName} (admin) marked documents verified for ${updated.fullName}`
        : decision === "rejected"
          ? `${adminName} (admin) rejected documents for ${updated.fullName}`
          : `${adminName} (admin) set document review to in progress for ${updated.fullName}`;
    await recordPlayerActivity({
      registrationId: updated._id,
      userId: updated.userId,
      action: activityAction,
      summary: activitySummary,
      actorName: adminName,
      actorRole: "admin",
      details: { status: decision },
    });

    const auditAction =
      decision === "verified"
        ? "registration.documents_verified"
        : decision === "rejected"
          ? "registration.documents_rejected"
          : "registration.documents_in_progress";
    await writeAudit(req, {
      action: auditAction,
      targetType: "registration",
      targetId: updated._id,
      targetLabel: `${updated.fullName} <${updated.email}>`,
      details: { status: decision, by: adminName },
    });

    return res.json({ registration: await enrichRegistrationAsync(updated) });
  } catch (error) {
    console.error("documents-verification error", error);
    const msg = error?.message || "Unable to update document verification.";
    return res.status(500).json({ error: msg });
  }
});

router.patch("/registrations/:id/documents-button", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    const override = String(req.body.documentsButtonOverride || req.body.override || "auto").toLowerCase();
    if (!["auto", "show", "hide"].includes(override)) {
      return res.status(400).json({ error: "Override must be auto, show, or hide." });
    }
    registration.documentsButtonOverride = override;
    await registration.save();
    return res.json({ registration: await enrichRegistrationAsync(registration) });
  } catch (error) {
    console.error("documents-button override error", error);
    return res.status(500).json({ error: "Unable to update documents button." });
  }
});

async function prepareAdminPlayerDocumentsUpload(req, res, next) {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    if (!canAdminManagePlayerDocuments(registration)) {
      return res.status(403).json({
        error: "Documents are only available for pending or accepted players and captains.",
      });
    }
    req.registrationDoc = registration;
    req.playerDocumentCode = registration.playerCode;
    req._bankStatementBaseIndex = bankStatementCount(registration);
    return next();
  } catch (error) {
    console.error("admin player documents prep error", error);
    return res.status(500).json({ error: "Unable to upload documents." });
  }
}

router.post("/registrations/:id/documents/upload-token", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    if (!canAdminManagePlayerDocuments(registration)) {
      return res.status(403).json({
        error: "Documents are only available for pending or accepted players and captains.",
      });
    }
    const token = signDocumentUploadToken({
      user: req.user,
      registrationId: registration._id,
      admin: true,
    });
    return res.json({
      directApiBase: getPublicApiBase(req),
      token,
    });
  } catch (error) {
    console.error("admin documents upload-token error", error);
    return res.status(500).json({ error: "Unable to start upload." });
  }
});

router.post(
  "/registrations/:id/documents",
  documentUploadAuth({ requireAdmin: true }),
  prepareAdminPlayerDocumentsUpload,
  (req, res) => {
    playerDocumentsUpload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload failed." });
      }
      try {
        const registration = req.registrationDoc;
        if (!registration) {
          return res.status(404).json({ error: "Registration not found." });
        }

        const applied = applyPlayerDocumentSubmission(registration, req.files, req.body);
        if (applied.error) {
          return res.status(400).json({ error: applied.error });
        }
        await registration.save();

        const adminName = req.user?.name || req.user?.email || "admin";
        await recordPlayerActivity({
          registrationId: registration._id,
          userId: registration.userId,
          action: "documents.submitted",
          summary: `${adminName} (admin) uploaded verification documents for ${registration.fullName}`,
          actorName: adminName,
          actorRole: "admin",
          details: { count: registration.playerDocuments.length },
        });

        return res.json({ registration: await enrichRegistrationAsync(registration) });
      } catch (error) {
        console.error("admin player documents upload error", error);
        return res.status(500).json({ error: "Unable to save documents." });
      }
    });
  }
);

router.get("/registrations/:id/documents/:filename", adminRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id).lean();
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }
    const filename = path.basename(String(req.params.filename || ""));
    const allowed = (registration.playerDocuments || []).some((row) => row.filename === filename);
    if (!allowed) {
      return res.status(404).json({ error: "Document not found." });
    }
    const full = playerDocumentDiskPath(filename);
    if (!full || !fs.existsSync(full)) {
      return res.status(404).json({ error: "Document not found." });
    }
    return res.sendFile(full);
  } catch (error) {
    console.error("admin player document download error", error);
    return res.status(500).json({ error: "Unable to open document." });
  }
});

/** Admin: change / replace a registration profile image. */
router.patch("/registrations/:id/profile-image", adminRequired, (req, res) => {
  profilePhotoUpload(req, res, async (err) => {
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
      if (!req.file) {
        return res.status(400).json({ error: "Please choose a profile picture." });
      }

      req.body.fullName = registration.fullName;
      const hadPhoto = Boolean(registration.profileImage || registration.photo?.filename);
      await persistUploadedFile(req.file, "profile");
      const photo = toProfileImageMeta(req.file);
      registration.profileImage = photo.filename;
      registration.photo = photo;
      await registration.save();

      const adminName = req.user?.name || req.user?.email || "admin";
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: hadPhoto ? "profile.image_updated" : "profile.image_added",
        summary: `${adminName} (admin) ${hadPhoto ? "changed" : "added"} profile picture for ${registration.fullName}`,
        actorName: adminName,
        actorRole: "admin",
        details: { profileImage: photo.filename },
      });

      await writeAudit(req, {
        action: "registration.profile_image",
        targetType: "registration",
        targetId: registration._id,
        targetLabel: registration.fullName,
        details: {
          summary: hadPhoto ? "Changed profile image" : "Added profile image",
          profileImage: photo.filename,
        },
      });

      return res.json({ registration: withProfileImageUrl(registration) });
    } catch (error) {
      console.error("admin profile-image update error", error);
      return res.status(500).json({ error: "Unable to update profile picture." });
    }
  });
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

router.get("/referrals", adminRequired, async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    const referred = await PlayerRegistration.find({
      referredByPlayerCode: { $type: "string", $ne: "" },
    })
      .select(
        "playerCode fullName email phone interest status createdAt userId referredByPlayerCode referredByUserId referredByName"
      )
      .sort({ createdAt: -1 })
      .lean();

    const grouped = new Map();
    for (const row of referred) {
      const key = String(row.referredByUserId || row.referredByPlayerCode);
      if (!grouped.has(key)) {
        grouped.set(key, {
          userId: row.referredByUserId || null,
          playerCode: row.referredByPlayerCode || "",
          name: row.referredByName || "",
          count: 0,
        });
      }
      const bucket = grouped.get(key);
      bucket.count += 1;
      if (!bucket.playerCode && row.referredByPlayerCode) bucket.playerCode = row.referredByPlayerCode;
      if (!bucket.name && row.referredByName) bucket.name = row.referredByName;
    }

    const topReferrers = Array.from(grouped.values())
      .sort((a, b) => b.count - a.count || String(a.playerCode).localeCompare(String(b.playerCode)))
      .slice(0, 50);

    const referrerIds = topReferrers.map((r) => r.userId).filter(Boolean);
    const [users, referrerRegs] = await Promise.all([
      referrerIds.length
        ? User.find({ _id: { $in: referrerIds } }).select("name email").lean()
        : [],
      referrerIds.length
        ? PlayerRegistration.find({ userId: { $in: referrerIds } })
            .select("userId playerCode email")
            .lean()
        : [],
    ]);
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const codesByUser = new Map();
    for (const reg of referrerRegs) {
      const id = String(reg.userId);
      if (!codesByUser.has(id)) codesByUser.set(id, []);
      if (reg.playerCode) codesByUser.get(id).push(reg.playerCode);
    }

    return res.json({
      referralProgramEnabled: isReferralProgramEnabled(settings),
      stats: {
        referredCount: referred.length,
        referrerCount: grouped.size,
      },
      topReferrers: topReferrers.map((row) => {
        const user = row.userId ? userById.get(String(row.userId)) : null;
        return {
          userId: row.userId,
          playerCode: row.playerCode,
          playerCodes: row.userId ? codesByUser.get(String(row.userId)) || [row.playerCode] : [row.playerCode],
          name: user?.name || row.name || "",
          email: user?.email || "",
          count: row.count,
        };
      }),
      referrals: referred.map(mapReferredPlayer),
    });
  } catch (error) {
    console.error("admin referrals error", error);
    return res.status(500).json({ error: "Unable to load referrals." });
  }
});

router.get("/player-lookup", adminRequired, async (req, res) => {
  try {
    const raw = String(req.query.playerCode || "").trim();
    if (!raw) return res.status(400).json({ error: "Enter a Player ID." });
    const digits = raw.replace(/\D/g, "");
    const keys = [...new Set([raw, digits && String(Number(digits)).padStart(4, "0")].filter(Boolean))];
    const player = await PlayerRegistration.findOne({ playerCode: { $in: keys } })
      .select("playerCode fullName company profileImage photo")
      .lean();
    if (!player) return res.status(404).json({ error: `No player found for Player ID ${raw}.` });
    const { profileImagePublicUrl } = await import("../middleware/upload.js");
    return res.json({
      player: {
        playerCode: player.playerCode,
        name: player.fullName,
        company: player.company || "",
        image: profileImagePublicUrl(player.profileImage || player.photo?.filename || ""),
      },
    });
  } catch (error) {
    console.error("player lookup error", error);
    return res.status(500).json({ error: "Unable to look up that Player ID." });
  }
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
        playerDocumentsUploadEnabled: isPlayerDocumentsUploadEnabled(settings),
        playerPayNowEnabled: isPlayerPayNowEnabled(settings),
        referralProgramEnabled: isReferralProgramEnabled(settings),
        moduleVisibility: getModuleVisibility(settings),
        navLabels: normalizeNavLabels(settings.navLabels),
        paymentGateway: getPaymentGateway(settings),
        paymentGatewayStatus: getGatewayStatus(),
        whatsappGroupUrl: settings.whatsappGroupUrl || "",
        referralChallenge: await resolveReferralChallenge(settings),
        upcomingEvents: normalizeUpcomingEvents(settings.upcomingEvents),
        keyDates: publicKeyDates(settings.keyDates),
        membersIntro: normalizeMembersIntro(settings.membersIntro),
        boardMembers: publicBoardMembers(settings.boardMembers),
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
      settings.socials = normalizeSocials(
        req.body.socials.map((s) => ({
          label: String(s.label || "").trim(),
          href: String(s.href || "#").trim() || "#",
          iconUrl: String(s.iconUrl || "").trim(),
        })),
        req.body.contact || settings.contact
      );
      auditBits.push(`${settings.socials.length} social links`);
    }

    if (typeof req.body.whatsappGroupUrl === "string") {
      settings.whatsappGroupUrl = String(req.body.whatsappGroupUrl).trim();
      auditBits.push("WhatsApp group link");
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

    if (typeof req.body.playerDocumentsUploadEnabled === "boolean") {
      settings.playerDocumentsUploadEnabled = req.body.playerDocumentsUploadEnabled;
      auditBits.push(
        req.body.playerDocumentsUploadEnabled ? "player document uploads on" : "player document uploads off"
      );
    }

    if (typeof req.body.playerPayNowEnabled === "boolean") {
      settings.playerPayNowEnabled = req.body.playerPayNowEnabled;
      auditBits.push(req.body.playerPayNowEnabled ? "player Pay now on" : "player Pay now off");
    }

    if (typeof req.body.referralProgramEnabled === "boolean") {
      settings.referralProgramEnabled = req.body.referralProgramEnabled;
      auditBits.push(
        req.body.referralProgramEnabled ? "referral program on" : "referral program off"
      );
    }

    if (req.body.navLabels && typeof req.body.navLabels === "object") {
      settings.navLabels = normalizeNavLabels(req.body.navLabels);
      settings.markModified("navLabels");
      auditBits.push("header names");
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

    if (req.body.referralChallenge && typeof req.body.referralChallenge === "object") {
      const nextChallenge = normalizeReferralChallenge(req.body.referralChallenge);
      const missingCodes = await assertReferralPlayerCodes(nextChallenge.winners);
      if (missingCodes.length) {
        return res.status(400).json({
          error: `No player found for Player ID: ${missingCodes.join(", ")}`,
        });
      }
      settings.referralChallenge = nextChallenge;
      settings.markModified("referralChallenge");
      auditBits.push(
        `referral winners (${settings.referralChallenge.winners?.length || 0})`
      );
    }

    if (req.body.membersIntro && typeof req.body.membersIntro === "object") {
      settings.membersIntro = normalizeMembersIntro(req.body.membersIntro);
      settings.markModified("membersIntro");
      auditBits.push("members intro");
    }

    if (Array.isArray(req.body.boardMembers)) {
      settings.boardMembers = normalizeBoardMembers(req.body.boardMembers);
      settings.markModified("boardMembers");
      auditBits.push(`board members (${settings.boardMembers.length})`);
    }

    if (Array.isArray(req.body.keyDates)) {
      settings.keyDates = normalizeKeyDates(req.body.keyDates);
      settings.markModified("keyDates");
      auditBits.push(`key dates (${settings.keyDates.length})`);
    }

    if (Array.isArray(req.body.upcomingEvents)) {
      settings.upcomingEvents = normalizeUpcomingEvents(req.body.upcomingEvents);
      settings.markModified("upcomingEvents");
      auditBits.push(`upcoming events (${settings.upcomingEvents.length})`);
    }

    if (req.body.paymentGateway) {
      const gateway = String(req.body.paymentGateway || "").trim().toLowerCase();
      if (gateway === "razorpay" || gateway === "cashfree" || gateway === "qr") {
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
        playerDocumentsUploadEnabled: isPlayerDocumentsUploadEnabled(settings),
        playerPayNowEnabled: isPlayerPayNowEnabled(settings),
        referralProgramEnabled: isReferralProgramEnabled(settings),
        moduleVisibility: getModuleVisibility(settings),
        navLabels: normalizeNavLabels(settings.navLabels),
        paymentGateway: getPaymentGateway(settings),
        paymentGatewayStatus: getGatewayStatus(),
        whatsappGroupUrl: settings.whatsappGroupUrl || "",
        referralChallenge: await resolveReferralChallenge(settings),
        upcomingEvents: normalizeUpcomingEvents(settings.upcomingEvents),
        keyDates: publicKeyDates(settings.keyDates),
        membersIntro: normalizeMembersIntro(settings.membersIntro),
        boardMembers: publicBoardMembers(settings.boardMembers),
      },
    });
  } catch (error) {
    console.error("admin settings put", error);
    return res.status(500).json({ error: "Unable to save settings." });
  }
});

router.post("/settings/reward-image", adminRequired, (req, res) => {
  rewardImageUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Image upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please choose an image." });
    }
    return res.json({ imageUrl: toRewardImageUrl(req.file) });
  });
});

router.post("/settings/member-image", adminRequired, (req, res) => {
  memberImageUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Image upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please choose an image." });
    }
    return res.json({ imageUrl: toMemberImageUrl(req.file) });
  });
});

router.post("/settings/event-image", adminRequired, (req, res) => {
  eventImageUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Image upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please choose an image." });
    }
    return res.json({ imageUrl: toEventImageUrl(req.file) });
  });
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
