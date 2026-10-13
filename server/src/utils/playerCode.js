import { Counter } from "../models/Counter.js";
import { PlayerRegistration } from "../models/PlayerRegistration.js";

export function formatPlayerCode(seq) {
  const n = Math.max(0, Number(seq) || 0);
  return String(n).padStart(4, "0");
}

/** Sync counter to the highest existing playerCode (safe to call often). */
export async function syncPlayerCodeCounter() {
  const [agg] = await PlayerRegistration.aggregate([
    { $match: { playerCode: { $type: "string", $ne: "" } } },
    {
      $group: {
        _id: null,
        maxSeq: {
          $max: {
            $convert: { input: "$playerCode", to: "int", onError: 0, onNull: 0 },
          },
        },
      },
    },
  ]);

  const maxSeq = Number(agg?.maxSeq || 0);
  const current = await Counter.findOne({ key: "playerCode" }).lean();
  if (!current || Number(current.seq || 0) < maxSeq) {
    await Counter.findOneAndUpdate(
      { key: "playerCode" },
      { $set: { seq: maxSeq } },
      { upsert: true, new: true }
    );
  }
  return maxSeq;
}

/** Assign serial codes to any registrations missing playerCode (oldest first). */
export async function backfillMissingPlayerCodes() {
  const missing = await PlayerRegistration.find({
    $or: [{ playerCode: { $exists: false } }, { playerCode: null }, { playerCode: "" }],
  })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id");

  if (!missing.length) {
    await syncPlayerCodeCounter();
    return 0;
  }

  await syncPlayerCodeCounter();
  let assigned = 0;
  for (const row of missing) {
    const code = await allocateNextPlayerCode({ skipSync: true });
    const result = await PlayerRegistration.updateOne(
      {
        _id: row._id,
        $or: [{ playerCode: { $exists: false } }, { playerCode: null }, { playerCode: "" }],
      },
      { $set: { playerCode: code } }
    );
    if (result.modifiedCount) assigned += 1;
  }
  return assigned;
}

/** Atomically allocate the next serial player code (0001, 0002, …). */
export async function allocateNextPlayerCode({ skipSync = false } = {}) {
  if (!skipSync) await syncPlayerCodeCounter();
  const counter = await Counter.findOneAndUpdate(
    { key: "playerCode" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return formatPlayerCode(counter.seq);
}

export function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

