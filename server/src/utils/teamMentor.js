import mongoose from "mongoose";
import { User } from "../models/User.js";
import { TeamMentor } from "../models/TeamMentor.js";
import { hashPassword } from "../middleware/auth.js";
import { withProfileImageUrl } from "../middleware/upload.js";
import { FRANCHISES, getFranchiseName, resolveFranchiseId } from "./franchises.js";

/** Squad / franchise views — name and photo only (no email or mobile). */
export function mentorPublicView(mentor) {
  if (!mentor) return null;
  const m = mentor.profileImageUrl || mentor.profileImage ? mentor : withProfileImageUrl(mentor);
  return {
    _id: m._id,
    fullName: m.fullName,
    profileImage: m.profileImage,
    profileImageUrl: m.profileImageUrl,
    photo: m.photo,
    franchiseId: resolveFranchiseId(m.franchiseId),
    squadRole: "mentor",
  };
}

/** Mentor dashboard / captain manage form — includes login fields. */
export function mentorPortalProfile(mentor) {
  if (!mentor) return null;
  const m = mentor.profileImageUrl || mentor.profileImage ? mentor : withProfileImageUrl(mentor);
  const fid = resolveFranchiseId(m.franchiseId);
  return {
    ...mentorPublicView(m),
    email: m.email,
    phone: m.phone,
    franchiseId: fid,
    franchiseName: getFranchiseName(fid),
    role: "mentor",
  };
}

export function isValidFranchiseId(franchiseId) {
  const id = resolveFranchiseId(String(franchiseId || "").trim());
  return FRANCHISES.some((f) => f.id === id);
}

export async function findMentorByUserId(userId) {
  const id = String(userId || "").trim();
  if (!id) return null;
  const user = await User.findById(id).select("email").lean();
  const email = String(user?.email || "").trim().toLowerCase();

  const or = [];
  if (mongoose.isValidObjectId(id)) {
    const oid = new mongoose.Types.ObjectId(id);
    or.push({ userId: id }, { userId: oid });
  } else {
    or.push({ userId: id });
  }
  if (email) or.push({ email });

  let row = or.length ? await TeamMentor.findOne({ $or: or }).lean() : null;
  if (!row && email) {
    row = await TeamMentor.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }).lean();
  }
  if (row && String(row.userId || "") !== id) {
    await TeamMentor.updateOne({ _id: row._id }, { $set: { userId: id } });
    row = { ...row, userId: id };
  }
  return row ? withProfileImageUrl(row) : null;
}

export async function resolveMentorProfileForUser(userId) {
  const row = await findMentorByUserId(userId);
  return mentorPortalProfile(row);
}

/** Mentor updates their own login profile (name, email, mobile, password, photo). */
export async function updateMentorSelfProfile(userId, { fullName, email, phone, password, photoFile }) {
  const existing = await findMentorByUserId(userId);
  if (!existing?.franchiseId) {
    return { error: "NOT_MENTOR", status: 403, message: "No team mentor profile found for this account." };
  }
  return upsertTeamMentor({
    franchiseId: existing.franchiseId,
    fullName,
    email,
    phone,
    password,
    photoFile,
  });
}

export async function getMentorForFranchise(franchiseId) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return null;
  const doc = await TeamMentor.findOne({ franchiseId: fid }).lean();
  return doc ? withProfileImageUrl(doc) : null;
}

export async function getMentorsByFranchiseIds(franchiseIds) {
  const ids = [...new Set((franchiseIds || []).map((id) => resolveFranchiseId(id)).filter(Boolean))];
  if (!ids.length) return {};
  const rows = await TeamMentor.find({ franchiseId: { $in: ids } }).lean();
  const map = {};
  for (const row of rows) {
    map[resolveFranchiseId(row.franchiseId)] = withProfileImageUrl(row);
  }
  return map;
}

/**
 * Create or update the single mentor for a franchise (admin or team captain).
 */
export async function upsertTeamMentor({
  franchiseId,
  fullName,
  email,
  phone,
  password,
  photoFile,
  addedByRegistrationId,
}) {
  const fid = resolveFranchiseId(franchiseId);
  if (!isValidFranchiseId(fid)) {
    return { error: "INVALID_TEAM", status: 400, message: "Invalid franchise team." };
  }

  const name = String(fullName || "").trim();
  const emailNorm = String(email || "").trim().toLowerCase();
  const phoneVal = String(phone || "").trim();

  if (!name || !emailNorm || !phoneVal) {
    return { error: "VALIDATION", status: 400, message: "Name, email, and mobile number are required." };
  }

  const existing = await TeamMentor.findOne({ franchiseId: fid });
  const pass = String(password || "");
  if (pass.length > 0 && pass.length < 6) {
    return {
      error: "VALIDATION",
      status: 400,
      message: "Password must be at least 6 characters.",
    };
  }

  if (!existing && pass.length < 6) {
    return {
      error: "VALIDATION",
      status: 400,
      message: "Password (min 6 characters) is required when adding a mentor.",
    };
  }

  const isUpdate = Boolean(existing);
  let user = null;
  if (existing?.userId) {
    user = await User.findById(existing.userId);
  }
  if (!user) {
    user = await User.findOne({ email: emailNorm });
  }

  if (user) {
    if (user.role === "admin") {
      return { error: "FORBIDDEN", status: 400, message: "Cannot use an admin account for a mentor." };
    }
    if (emailNorm !== String(user.email || "").toLowerCase()) {
      const taken = await User.findOne({ email: emailNorm, _id: { $ne: user._id } }).lean();
      if (taken) {
        return {
          error: "VALIDATION",
          status: 400,
          message: "That email is already used by another account.",
        };
      }
      user.email = emailNorm;
    }
    user.name = name;
    user.phone = phoneVal || user.phone;
    if (pass.length >= 6) {
      user.passwordHash = await hashPassword(pass);
      user.resetPasswordTokenHash = null;
      user.resetPasswordExpires = null;
    }
    if (user.status !== "approved") user.status = "approved";
    await user.save();
  } else {
    if (isUpdate) {
      return {
        error: "VALIDATION",
        status: 400,
        message: "Mentor login account is missing. Contact league admin.",
      };
    }
    if (pass.length < 6) {
      return {
        error: "VALIDATION",
        status: 400,
        message: "Password (min 6 characters) is required when creating a new account.",
      };
    }
    user = await User.create({
      name,
      email: emailNorm,
      phone: phoneVal,
      passwordHash: await hashPassword(pass),
      role: "user",
      status: "approved",
    });
  }

  let mentor = existing;
  if (!mentor) {
    mentor = new TeamMentor({
      franchiseId: fid,
      fullName: name,
      email: emailNorm,
      phone: phoneVal,
      userId: user._id,
      addedByRegistrationId: addedByRegistrationId || null,
    });
  } else {
    mentor.fullName = name;
    mentor.email = emailNorm;
    mentor.phone = phoneVal;
    mentor.userId = user._id;
    if (addedByRegistrationId) mentor.addedByRegistrationId = addedByRegistrationId;
  }

  if (photoFile?.filename) {
    mentor.profileImage = photoFile.filename;
    mentor.photo = {
      filename: photoFile.filename,
      mimetype: photoFile.mimetype || "",
      size: photoFile.size || 0,
    };
  }

  await mentor.save();
  return {
    mentor: withProfileImageUrl(mentor.toObject()),
    updated: isUpdate,
  };
}
