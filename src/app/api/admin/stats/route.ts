import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlayerRegistration } from "@/models/PlayerRegistration";
import { User } from "@/models/User";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await connectDB();

  const [
    usersCount,
    registrationsCount,
    pendingCount,
    verifiedCount,
    rejectedCount,
    franchiseCount,
    sponsorCount,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    PlayerRegistration.countDocuments(),
    PlayerRegistration.countDocuments({ status: "pending" }),
    PlayerRegistration.countDocuments({ status: "verified" }),
    PlayerRegistration.countDocuments({ status: "rejected" }),
    PlayerRegistration.countDocuments({ interest: "franchise" }),
    PlayerRegistration.countDocuments({ interest: "sponsor" }),
  ]);

  return NextResponse.json({
    stats: {
      usersCount,
      registrationsCount,
      pendingCount,
      verifiedCount,
      rejectedCount,
      franchiseCount,
      sponsorCount,
    },
  });
}
