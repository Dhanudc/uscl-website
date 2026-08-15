import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlayerRegistration } from "@/models/PlayerRegistration";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const interest = searchParams.get("interest");

  const filter: Record<string, string> = {};
  if (status && ["pending", "verified", "rejected"].includes(status)) {
    filter.status = status;
  }
  if (interest && ["player", "franchise", "sponsor"].includes(interest)) {
    filter.interest = interest;
  }

  await connectDB();
  const registrations = await PlayerRegistration.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ registrations });
}
