import { Router } from "express";
import { approvedRequired } from "../middleware/auth.js";
import { playerRegistrationUpload, paymentScreenshotUpload, profilePhotoUpload, toProfileImageMeta, withProfileImageUrl, mapWithProfileImageUrl } from "../middleware/upload.js";
import { persistUploadedFile } from "../utils/mediaStore.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { isValidPlayerRole, playerRoleLabel } from "../constants/playerRoles.js";
import { getFranchiseName } from "../utils/franchises.js";
import { recordPlayerActivity } from "../utils/activity.js";
import {
  getRegistrationFeeInr,
  getRegistrationFees,
  normalizeRegistrationFees,
  REGISTRATION_INTERESTS,
} from "../utils/registrationFees.js";
import {
  assertSponsorPackageAvailable,
  getSponsorPackageById,
} from "../utils/sponsorPackages.js";
import { verifyRazorpaySignature } from "../utils/razorpay.js";
import {
  createGatewayOrder,
  getActivePaymentGateway,
  getGatewayPublicConfig,
  verifyGatewayPayment,
} from "../utils/paymentGateway.js";
import { sendRegistrationReceivedEmail } from "../utils/mail.js";
import { getSiteSettings, isRegistrationEnabled } from "../models/SiteSettings.js";

const router = Router();

async function assertRegistrationOpen(res) {
  const settings = await getSiteSettings();
  if (!isRegistrationEnabled(settings)) {
    res.status(403).json({ error: "Registration is currently closed." });
    return false;
  }
  return true;
}

router.get("/payment-config", async (req, res) => {
  try {
    const interest = String(req.query.interest || "").trim().toLowerCase();
    const sponsorPackageId = String(req.query.sponsorPackageId || "").trim();
    const fees = await getRegistrationFees();
    const gateway = await getActivePaymentGateway();
    const { provider, keyId, configured, mode } = getGatewayPublicConfig(gateway);
    let feeInr = REGISTRATION_INTERESTS.includes(interest) ? fees[interest] : fees.player;
    let sponsorPackage = null;

    if (interest === "sponsor") {
      if (!sponsorPackageId) {
        return res.json({
          feeInr: null,
          fees,
          currency: "INR",
          provider,
          keyId,
          configured,
          mode,
          requiresPackage: true,
          sponsorPackage: null,
        });
      }
      const pkg = await getSponsorPackageById(sponsorPackageId);
      if (!pkg) {
        return res.status(400).json({ error: "Invalid or unavailable sponsor package." });
      }
      feeInr = pkg.priceInr;
      sponsorPackage = {
        id: pkg.id,
        title: pkg.title,
        priceInr: pkg.priceInr,
        priceLabel: pkg.priceLabel || undefined,
      };
    }

    return res.json({
      feeInr,
      fees,
      currency: "INR",
      provider,
      keyId,
      configured,
      mode,
      sponsorPackage,
    });
  } catch (error) {
    console.error("payment-config error", error);
    return res.status(500).json({ error: "Unable to load payment config." });
  }
});

router.post("/create-order", approvedRequired, async (req, res) => {
  try {
    if (!(await assertRegistrationOpen(res))) return;

    const interestRaw = String(req.body.interest || "player").trim().toLowerCase();
    const interest = REGISTRATION_INTERESTS.includes(interestRaw) ? interestRaw : "player";
    const sponsorPackageId = String(req.body.sponsorPackageId || "").trim();

    const existing = await PlayerRegistration.findOne({
      userId: req.user.userId,
      interest,
      status: { $in: ["pending", "verified"] },
    });
    if (existing) {
      return res.status(409).json({
        error: `You already have an active ${interest} registration.`,
      });
    }

    let feeInr = await getRegistrationFeeInr(interest);
    let sponsorPackage = null;

    if (interest === "sponsor") {
      if (!sponsorPackageId) {
        return res.status(400).json({ error: "Please select a sponsor package to buy." });
      }
      const check = await assertSponsorPackageAvailable(sponsorPackageId);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
      feeInr = check.pkg.priceInr;
      sponsorPackage = { id: check.pkg.id, title: check.pkg.title };
    }

    const gateway = await getActivePaymentGateway();
    const receipt = `uscl_${String(req.user.userId).slice(-8)}_${Date.now()}`.slice(0, 40);
    const order = await createGatewayOrder(gateway, {
      feeInr,
      receipt,
      notes: {
        userId: String(req.user.userId),
        interest,
        sponsorPackageId: sponsorPackage?.id || "",
        purpose: sponsorPackage ? "sponsor_package" : `${interest}_registration`,
      },
      customer: {
        id: String(req.user.userId),
        email: req.user.email || "",
        phone: req.user.phone || "",
      },
    });

    return res.json({
      ...order,
      sponsorPackage,
    });
  } catch (error) {
    console.error("create-order error", error);
    return res.status(500).json({
      error: error.message || "Unable to create payment order.",
    });
  }
});

router.get("/", approvedRequired, async (req, res) => {
  const registrations = await PlayerRegistration.find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ registrations: mapWithProfileImageUrl(registrations) });
});

function isPaid(reg) {
  const top = String(reg?.paymentStatus || "").toLowerCase();
  const nested = String(reg?.payment?.status || "").toLowerCase();
  return top === "paid" || nested === "paid";
}

async function getFranchiseOwnerRecord(userId) {
  return PlayerRegistration.findOne({
    userId,
    interest: "franchise",
    status: "verified",
  }).lean();
}

/** Franchise owner: sold players for the team admin assigned. */
router.get("/squad", approvedRequired, async (req, res) => {
  try {
    const owner = await getFranchiseOwnerRecord(req.user.userId);
    if (!owner) {
      return res.status(403).json({ error: "No verified franchise registration found." });
    }
    if (!isPaid(owner)) {
      return res.status(403).json({ error: "Franchise payment is not complete yet." });
    }
    if (!owner.franchiseId) {
      return res.status(400).json({ error: "Admin has not assigned a franchise team yet." });
    }

    const players = await PlayerRegistration.find({
      status: "verified",
      auctionStatus: "sold",
      franchiseId: owner.franchiseId,
      interest: { $in: ["player", "captain"] },
    })
      .select(
        "fullName email phone company role interest photo profileImage soldPrice franchiseName auctionStatus paymentStatus payment"
      )
      .sort({ fullName: 1 })
      .lean();

    return res.json({
      team: {
        id: owner.franchiseId,
        name: owner.franchiseName || getFranchiseName(owner.franchiseId),
      },
      players: mapWithProfileImageUrl(players),
    });
  } catch (error) {
    console.error("franchise squad error", error);
    return res.status(500).json({ error: "Unable to load franchise players." });
  }
});

/** Franchise owner: one bought player's details (read-only dashboard). */
router.get("/squad/:playerId", approvedRequired, async (req, res) => {
  try {
    const owner = await getFranchiseOwnerRecord(req.user.userId);
    if (!owner) {
      return res.status(403).json({ error: "No verified franchise registration found." });
    }
    if (!isPaid(owner)) {
      return res.status(403).json({ error: "Franchise payment is not complete yet." });
    }
    if (!owner.franchiseId) {
      return res.status(400).json({ error: "Admin has not assigned a franchise team yet." });
    }

    const player = await PlayerRegistration.findOne({
      _id: req.params.playerId,
      status: "verified",
      auctionStatus: "sold",
      franchiseId: owner.franchiseId,
      interest: { $in: ["player", "captain"] },
    }).lean();

    if (!player) {
      return res.status(404).json({ error: "Player not found on your squad." });
    }

    return res.json({ player: withProfileImageUrl(player) });
  } catch (error) {
    console.error("franchise squad player error", error);
    return res.status(500).json({ error: "Unable to load player." });
  }
});

router.post("/", approvedRequired, (req, res) => {
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
      if (!(await assertRegistrationOpen(res))) return;

      const fullName = String(req.body.fullName || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").trim();
      const company = String(req.body.company || "").trim();
      const interestRaw = String(req.body.interest || "player").trim().toLowerCase();
      const interest = ["player", "captain", "franchise", "sponsor"].includes(interestRaw)
        ? interestRaw
        : "player";
      const needsPlayingRole = interest === "player" || interest === "captain";
      const role = needsPlayingRole
        ? String(req.body.role || "").trim()
        : interest; // franchise / sponsor — no playing role
      const utrNumber = String(req.body.utrNumber || "")
        .trim()
        .toUpperCase();
      const agreedRaw = String(req.body.agreedToTerms || "").toLowerCase();
      const agreedToTerms =
        ["true", "on", "1", "yes"].includes(agreedRaw) || req.body.agreedToTerms === true;

      const razorpayOrderId = String(req.body.razorpayOrderId || "").trim();
      const razorpayPaymentId = String(req.body.razorpayPaymentId || "").trim();
      const razorpaySignature = String(req.body.razorpaySignature || "").trim();
      const cashfreeOrderId = String(req.body.cashfreeOrderId || "").trim();
      const paymentProvider = String(req.body.paymentProvider || "").trim().toLowerCase();

      const photoFile = req.files?.photo?.[0];
      const screenshotFile = req.files?.paymentScreenshot?.[0];

      if (!fullName || !email || !phone || !company || !role) {
        return res.status(400).json({ error: "Please fill all required registration fields." });
      }
      if (needsPlayingRole && !isValidPlayerRole(role)) {
        return res.status(400).json({ error: "Please select a valid playing role." });
      }
      if (!agreedToTerms) {
        return res.status(400).json({ error: "You must agree to the eligibility terms." });
      }
      if (!photoFile) {
        return res.status(400).json({ error: "Please upload a photo." });
      }

      await persistUploadedFile(photoFile, "profile");
      if (screenshotFile) await persistUploadedFile(screenshotFile, "payment");

      if (utrNumber) {
        const utrExists = await PlayerRegistration.findOne({ utrNumber }).lean();
        if (utrExists) {
          return res.status(409).json({ error: "UTR already exist" });
        }
      }

      const gateway = await getActivePaymentGateway();
      const hasRazorpay =
        Boolean(razorpayOrderId) && Boolean(razorpayPaymentId) && Boolean(razorpaySignature);
      const hasCashfree = Boolean(cashfreeOrderId);

      const requestedStatus = String(req.body.paymentStatus || "").trim().toLowerCase();
      let paymentStatus = "pending";
      let verifiedPayment = null;

      if (hasRazorpay) {
        const paymentOk = verifyRazorpaySignature({
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
        });
        if (!paymentOk) {
          return res.status(400).json({ error: "Payment verification failed." });
        }
        paymentStatus = "paid";
        verifiedPayment = {
          provider: "razorpay",
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
        };
      } else if (hasCashfree) {
        const paymentOk = await verifyGatewayPayment("cashfree", { orderId: cashfreeOrderId });
        if (!paymentOk.ok) {
          return res.status(400).json({ error: "Payment verification failed." });
        }
        paymentStatus = "paid";
        verifiedPayment = paymentOk;
      } else if (requestedStatus === "cancelled") {
        paymentStatus = "cancelled";
      } else if (requestedStatus === "failed" || requestedStatus === "pending") {
        paymentStatus = requestedStatus;
      } else if (paymentProvider && requestedStatus === "paid") {
        return res.status(400).json({ error: "Payment verification failed." });
      } else {
        paymentStatus = "failed";
      }

      const existing = await PlayerRegistration.findOne({
        userId: req.user.userId,
        interest,
        status: { $in: ["pending", "verified"] },
      });

      if (existing) {
        return res.status(409).json({
          error: `You already have an active ${interest} registration.`,
        });
      }

      if (verifiedPayment?.paymentId) {
        const paidExists = await PlayerRegistration.findOne({
          "payment.paymentId": verifiedPayment.paymentId,
        });
        if (paidExists) {
          return res.status(409).json({ error: "This payment was already used for a registration." });
        }
      }

      const sponsorPackageId = String(req.body.sponsorPackageId || "").trim();
      let sponsorPackageTitle = "";
      let feeInr = await getRegistrationFeeInr(interest);

      if (interest === "sponsor") {
        if (!sponsorPackageId) {
          return res.status(400).json({ error: "Please select a sponsor package to buy." });
        }
        if (paymentStatus === "paid") {
          const check = await assertSponsorPackageAvailable(sponsorPackageId);
          if (!check.ok) {
            return res.status(400).json({ error: check.error });
          }
          feeInr = check.pkg.priceInr;
          sponsorPackageTitle = check.pkg.title;
        } else {
          const pkg = await getSponsorPackageById(sponsorPackageId);
          if (!pkg) {
            return res.status(400).json({ error: "Invalid sponsor package." });
          }
          feeInr = pkg.priceInr;
          sponsorPackageTitle = pkg.title;
        }
      }

      const photo = toProfileImageMeta(photoFile);
      const registration = await PlayerRegistration.create({
        userId: req.user.userId,
        fullName,
        email,
        phone,
        company,
        role,
        interest,
        sponsorPackageId: interest === "sponsor" ? sponsorPackageId : "",
        sponsorPackageTitle: interest === "sponsor" ? sponsorPackageTitle : "",
        agreedToTerms,
        profileImage: photo.filename,
        photo,
        utrNumber,
        paymentScreenshot: screenshotFile?.filename || "",
        paymentStatus,
        paymentDetailsAddedBy:
          utrNumber || screenshotFile?.filename ? fullName : "",
        paymentDetailsAddedAt:
          utrNumber || screenshotFile?.filename ? new Date() : null,
        payment: {
          provider: verifiedPayment?.provider || gateway,
          status: paymentStatus === "paid" ? "paid" : paymentStatus === "pending" ? "pending" : "failed",
          amountInr: feeInr,
          currency: "INR",
          orderId: verifiedPayment?.orderId || cashfreeOrderId || razorpayOrderId || "",
          paymentId: verifiedPayment?.paymentId || razorpayPaymentId || "",
          signature: verifiedPayment?.signature || razorpaySignature || "",
          paidAt: paymentStatus === "paid" ? new Date() : null,
        },
        status: "pending",
        auctionStatus: "not_listed",
      });

      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: "registration.submitted",
        summary: `${fullName} (player) submitted registration form`,
        actorName: fullName,
        actorRole: "player",
        details: {
          email,
          role,
          company,
          paymentStatus,
          hasUtr: Boolean(utrNumber),
          hasPaymentScreenshot: Boolean(screenshotFile?.filename),
        },
      });

      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: "profile.image_added",
        summary: `${fullName} (player) added profile picture`,
        actorName: fullName,
        actorRole: "player",
        details: { profileImage: photo.filename },
      });

      if (utrNumber || screenshotFile?.filename) {
        const bits = [];
        if (utrNumber) bits.push("UTR");
        if (screenshotFile?.filename) bits.push("payment screenshot");
        await recordPlayerActivity({
          registrationId: registration._id,
          userId: registration.userId,
          action: "payment.details_added",
          summary: `${fullName} (player) added ${bits.join(" and ")}`,
          actorName: fullName,
          actorRole: "player",
          details: {
            utrNumber: utrNumber || "",
            paymentScreenshot: screenshotFile?.filename || "",
          },
        });
      }

      sendRegistrationReceivedEmail({
        to: email,
        fullName,
        interest,
        role: needsPlayingRole ? playerRoleLabel(role) : "",
        company,
        paymentStatus,
        feeInr,
      });

      return res.status(201).json({ registration: withProfileImageUrl(registration) });
    } catch (error) {
      console.error("registration error", error);
      if (error?.code === 11000 && String(error?.message || "").includes("utrNumber")) {
        return res.status(409).json({ error: "UTR already exist" });
      }
      return res.status(500).json({ error: "Unable to submit registration." });
    }
  });
});

/** Update optional UTR + payment screenshot on an existing registration. */
router.patch("/:id/payment-details", approvedRequired, (req, res) => {
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
      const registration = await PlayerRegistration.findOne({
        _id: req.params.id,
        userId: req.user.userId,
      });
      if (!registration) {
        return res.status(404).json({ error: "Registration not found." });
      }

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

      const actorName = registration.fullName || req.user.name || "player";
      registration.paymentDetailsAddedBy = actorName;
      registration.paymentDetailsAddedAt = new Date();

      await registration.save();

      const bits = [];
      if (utrChanged) bits.push(prevUtr ? "updated UTR" : "UTR");
      if (shotChanged) bits.push(prevShot ? "updated payment screenshot" : "payment screenshot");
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: prevUtr || prevShot ? "payment.details_updated" : "payment.details_added",
        summary: `${actorName} (player) ${bits.join(" and ")}`,
        actorName,
        actorRole: "player",
        details: {
          utrChanged,
          shotChanged,
          utrNumber: registration.utrNumber || "",
          paymentScreenshot: registration.paymentScreenshot || "",
        },
      });

      return res.json({ registration: withProfileImageUrl(registration) });
    } catch (error) {
      console.error("payment-details update error", error);
      if (error?.code === 11000 && String(error?.message || "").includes("utrNumber")) {
        return res.status(409).json({ error: "UTR already exist" });
      }
      return res.status(500).json({ error: "Unable to update payment details." });
    }
  });
});

/** Create Razorpay order for an existing unpaid registration. */
router.post("/:id/create-payment-order", approvedRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const status = String(registration.paymentStatus || registration.payment?.status || "pending").toLowerCase();
    if (status === "paid") {
      return res.status(400).json({ error: "Payment is already completed for this registration." });
    }
    if (!registration.payNowEnabled) {
      return res.status(400).json({
        error: "Online payment is not enabled yet. Please wait for admin to enable Pay now.",
      });
    }

    const gateway = await getActivePaymentGateway();
    const feeInr = await getRegistrationFeeInr(registration.interest || "player");
    const receipt = `uscl_pay_${String(registration._id).slice(-8)}_${Date.now()}`.slice(0, 40);
    const order = await createGatewayOrder(gateway, {
      feeInr,
      receipt,
      notes: {
        userId: String(req.user.userId),
        registrationId: String(registration._id),
        purpose: "player_registration_retry",
      },
      customer: {
        id: String(req.user.userId),
        email: registration.email || req.user.email || "",
        phone: registration.phone || req.user.phone || "",
      },
    });

    return res.json(order);
  } catch (error) {
    console.error("create-payment-order error", error);
    return res.status(500).json({
      error: error.message || "Unable to create payment order.",
    });
  }
});

/** Confirm online payment (or record failed/cancelled) for an existing registration. */
router.patch("/:id/confirm-payment", approvedRequired, async (req, res) => {
  try {
    const registration = await PlayerRegistration.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const current = String(registration.paymentStatus || registration.payment?.status || "pending").toLowerCase();
    if (current === "paid") {
      return res.json({ registration: withProfileImageUrl(registration) });
    }

    const razorpayOrderId = String(req.body.razorpayOrderId || "").trim();
    const razorpayPaymentId = String(req.body.razorpayPaymentId || "").trim();
    const razorpaySignature = String(req.body.razorpaySignature || "").trim();
    const cashfreeOrderId = String(req.body.cashfreeOrderId || "").trim();
    const requestedStatus = String(req.body.paymentStatus || "").trim().toLowerCase();
    const gateway = await getActivePaymentGateway();

    const hasRazorpay =
      Boolean(razorpayOrderId) && Boolean(razorpayPaymentId) && Boolean(razorpaySignature);
    const hasCashfree = Boolean(cashfreeOrderId);

    let paymentStatus = "pending";
    let verifiedPayment = null;

    if (hasRazorpay) {
      const paymentOk = verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });
      if (!paymentOk) {
        return res.status(400).json({ error: "Payment verification failed." });
      }

      const paidExists = await PlayerRegistration.findOne({
        "payment.paymentId": razorpayPaymentId,
        _id: { $ne: registration._id },
      }).lean();
      if (paidExists) {
        return res.status(409).json({ error: "This payment was already used for a registration." });
      }

      paymentStatus = "paid";
      verifiedPayment = {
        provider: "razorpay",
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      };
    } else if (hasCashfree) {
      const paymentOk = await verifyGatewayPayment("cashfree", { orderId: cashfreeOrderId });
      if (!paymentOk.ok) {
        return res.status(400).json({ error: "Payment verification failed." });
      }

      const paidExists = await PlayerRegistration.findOne({
        "payment.paymentId": paymentOk.paymentId,
        _id: { $ne: registration._id },
      }).lean();
      if (paidExists) {
        return res.status(409).json({ error: "This payment was already used for a registration." });
      }

      paymentStatus = "paid";
      verifiedPayment = paymentOk;
    } else if (requestedStatus === "cancelled") {
      paymentStatus = "cancelled";
    } else if (requestedStatus === "failed" || requestedStatus === "pending") {
      paymentStatus = requestedStatus;
    } else {
      paymentStatus = "failed";
    }

    // Only persist failed/cancelled if status actually changes; always persist paid
    if (paymentStatus !== "paid" && paymentStatus === current) {
      return res.json({ registration: withProfileImageUrl(registration) });
    }

    const feeInr =
      Number(registration.payment?.amountInr) ||
      (await getRegistrationFeeInr(registration.interest || "player"));
    const prevStatus = current;

    registration.paymentStatus = paymentStatus;
    registration.payment = {
      ...(registration.payment?.toObject?.() || registration.payment || {}),
      provider: verifiedPayment?.provider || gateway,
      status: paymentStatus === "paid" ? "paid" : paymentStatus === "pending" ? "pending" : "failed",
      amountInr: feeInr,
      currency: "INR",
      orderId: verifiedPayment?.orderId || cashfreeOrderId || razorpayOrderId || registration.payment?.orderId || "",
      paymentId: verifiedPayment?.paymentId || razorpayPaymentId || registration.payment?.paymentId || "",
      signature: verifiedPayment?.signature || razorpaySignature || registration.payment?.signature || "",
      paidAt: paymentStatus === "paid" ? new Date() : registration.payment?.paidAt || null,
    };

    if (paymentStatus === "paid") {
      registration.payNowEnabled = false;
    }

    await registration.save();

    const actorName = registration.fullName || req.user.name || "player";
    if (paymentStatus === "paid") {
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: "payment.gateway_paid",
        summary: `${actorName} (player) completed online payment`,
        actorName,
        actorRole: "player",
        details: {
          from: prevStatus,
          to: paymentStatus,
          orderId: verifiedPayment?.orderId || razorpayOrderId || cashfreeOrderId,
          paymentId: verifiedPayment?.paymentId || razorpayPaymentId,
          amountInr: feeInr,
        },
      });
    } else if (paymentStatus !== prevStatus) {
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: `payment.gateway_${paymentStatus}`,
        summary: `${actorName} (player) payment ${paymentStatus}`,
        actorName,
        actorRole: "player",
        details: { from: prevStatus, to: paymentStatus },
      });
    }

    return res.json({ registration: withProfileImageUrl(registration) });
  } catch (error) {
    console.error("confirm-payment error", error);
    return res.status(500).json({ error: "Unable to update payment." });
  }
});

/** Update / add profile picture on an existing registration. */
router.patch("/:id/profile-image", approvedRequired, (req, res) => {
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
      const registration = await PlayerRegistration.findOne({
        _id: req.params.id,
        userId: req.user.userId,
      });
      if (!registration) {
        return res.status(404).json({ error: "Registration not found." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Please choose a profile picture." });
      }

      const hadPhoto = Boolean(registration.profileImage || registration.photo?.filename);
      await persistUploadedFile(req.file, "profile");
      const photo = toProfileImageMeta(req.file);
      registration.profileImage = photo.filename;
      registration.photo = photo;
      await registration.save();

      const actorName = registration.fullName || req.user.name || "player";
      await recordPlayerActivity({
        registrationId: registration._id,
        userId: registration.userId,
        action: hadPhoto ? "profile.image_updated" : "profile.image_added",
        summary: `${actorName} (player) ${hadPhoto ? "updated" : "added"} profile picture`,
        actorName,
        actorRole: "player",
        details: { profileImage: photo.filename },
      });

      return res.json({ registration: withProfileImageUrl(registration) });
    } catch (error) {
      console.error("profile-image update error", error);
      return res.status(500).json({ error: "Unable to update profile picture." });
    }
  });
});

export default router;
