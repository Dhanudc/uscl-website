import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await connectDB();
  const users = await User.find()
    .select("name email phone role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}
