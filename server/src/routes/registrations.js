import { Router } from "express";
import { approvedRequired } from "../middleware/auth.js";
import { playerRegistrationUpload, paymentScreenshotUpload, profilePhotoUpload, toProfileImageMeta, withProfileImageUrl, mapWithProfileImageUrl } from "../middleware/upload.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { isValidPlayerRole } from "../constants/playerRoles.js";
import { recordPlayerActivity } from "../utils/activity.js";
import {
  getRegistrationFeeInr,
  getRazorpayClient,
  getRazorpayConfig,
  verifyRazorpaySignature,
} from "../utils/razorpay.js";

const router = Router();

router.get("/payment-config", (_req, res) => {
  const { keyId, configured } = getRazorpayConfig();
  return res.json({
    feeInr: getRegistrationFeeInr(),
    currency: "INR",
    keyId: configured ? keyId : "",
    configured,
  });
});

router.post("/create-order", approvedRequired, async (req, res) => {
  try {
    const existing = await PlayerRegistration.findOne({
      userId: req.user.userId,
      interest: "player",
      status: { $in: ["pending", "verified"] },
    });
    if (existing) {
      return res.status(409).json({ error: "You already have an active player registration." });
    }

    const feeInr = getRegistrationFeeInr();
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: feeInr * 100,
      currency: "INR",
      receipt: `uscl_${String(req.user.userId).slice(-8)}_${Date.now()}`.slice(0, 40),
      notes: {
        userId: String(req.user.userId),
        purpose: "player_registration",
      },
    });

    const { keyId } = getRazorpayConfig();
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      feeInr,
      keyId,
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
      const fullName = String(req.body.fullName || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").trim();
      const company = String(req.body.company || "").trim();
      const role = String(req.body.role || "").trim();
      const interest = req.body.interest || "player";
      const utrNumber = String(req.body.utrNumber || "")
        .trim()
        .toUpperCase();
      const agreedRaw = String(req.body.agreedToTerms || "").toLowerCase();
      const agreedToTerms =
        ["true", "on", "1", "yes"].includes(agreedRaw) || req.body.agreedToTerms === true;

      const razorpayOrderId = String(req.body.razorpayOrderId || "").trim();
      const razorpayPaymentId = String(req.body.razorpayPaymentId || "").trim();
      const razorpaySignature = String(req.body.razorpaySignature || "").trim();

      const photoFile = req.files?.photo?.[0];
      const screenshotFile = req.files?.paymentScreenshot?.[0];

      if (!fullName || !email || !phone || !company || !role) {
        return res.status(400).json({ error: "Please fill all required registration fields." });
      }
      if (!isValidPlayerRole(role)) {
        return res.status(400).json({ error: "Please select a valid playing role." });
      }
      if (!agreedToTerms) {
        return res.status(400).json({ error: "You must agree to the eligibility terms." });
      }
      if (!photoFile) {
        return res.status(400).json({ error: "Please upload a player photo." });
      }

      if (utrNumber) {
        const utrExists = await PlayerRegistration.findOne({ utrNumber }).lean();
        if (utrExists) {
          return res.status(409).json({ error: "UTR already exist" });
        }
      }

      const hasRazorpay =
        Boolean(razorpayOrderId) && Boolean(razorpayPaymentId) && Boolean(razorpaySignature);

      const requestedStatus = String(req.body.paymentStatus || "").trim().toLowerCase();
      let paymentStatus = "pending";
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
      } else if (requestedStatus === "cancelled") {
        paymentStatus = "cancelled";
      } else if (requestedStatus === "failed" || requestedStatus === "pending") {
        paymentStatus = requestedStatus;
      } else {
        // Gateway failed/cancelled without ids — mark failed
        paymentStatus = "failed";
      }

      const existing = await PlayerRegistration.findOne({
        userId: req.user.userId,
        interest: "player",
        status: { $in: ["pending", "verified"] },
      });

      if (interest === "player" && existing) {
        return res.status(409).json({ error: "You already have an active player registration." });
      }

      if (hasRazorpay) {
        const paidExists = await PlayerRegistration.findOne({
          "payment.paymentId": razorpayPaymentId,
        });
        if (paidExists) {
          return res.status(409).json({ error: "This payment was already used for a registration." });
        }
      }

      const feeInr = getRegistrationFeeInr();
      const photo = toProfileImageMeta(photoFile);
      const registration = await PlayerRegistration.create({
        userId: req.user.userId,
        fullName,
        email,
        phone,
        company,
        role,
        interest,
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
          provider: "razorpay",
          status: paymentStatus === "paid" ? "paid" : paymentStatus === "pending" ? "pending" : "failed",
          amountInr: feeInr,
          currency: "INR",
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
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

    const feeInr = getRegistrationFeeInr();
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: feeInr * 100,
      currency: "INR",
      receipt: `uscl_pay_${String(registration._id).slice(-8)}_${Date.now()}`.slice(0, 40),
      notes: {
        userId: String(req.user.userId),
        registrationId: String(registration._id),
        purpose: "player_registration_retry",
      },
    });

    const { keyId } = getRazorpayConfig();
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      feeInr,
      keyId,
    });
  } catch (error) {
    console.error("create-payment-order error", error);
    return res.status(500).json({
      error: error.message || "Unable to create payment order.",
    });
  }
});

/** Confirm Razorpay payment (or record failed/cancelled) for an existing registration. */
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
    const requestedStatus = String(req.body.paymentStatus || "").trim().toLowerCase();

    const hasRazorpay =
      Boolean(razorpayOrderId) && Boolean(razorpayPaymentId) && Boolean(razorpaySignature);

    let paymentStatus = "pending";
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

    const feeInr = Number(registration.payment?.amountInr) || getRegistrationFeeInr();
    const prevStatus = current;

    registration.paymentStatus = paymentStatus;
    registration.payment = {
      ...(registration.payment?.toObject?.() || registration.payment || {}),
      provider: "razorpay",
      status: paymentStatus === "paid" ? "paid" : paymentStatus === "pending" ? "pending" : "failed",
      amountInr: feeInr,
      currency: "INR",
      orderId: razorpayOrderId || registration.payment?.orderId || "",
      paymentId: razorpayPaymentId || registration.payment?.paymentId || "",
      signature: razorpaySignature || registration.payment?.signature || "",
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
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
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
