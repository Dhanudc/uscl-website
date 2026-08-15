import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email });

    // Always return a success-style message to avoid email enumeration,
    // but include a reset link when the account exists (no email service yet).
    if (!user) {
      return NextResponse.json({
        message: "If an account exists for that email, a reset link is ready.",
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const origin = new URL(request.url).origin;
    const resetLink = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    return NextResponse.json({
      message: "Password reset link created. Use it within 1 hour.",
      resetLink,
    });
  } catch (error) {
    console.error("forgot-password error", error);
    return NextResponse.json({ error: "Unable to process request." }, { status: 500 });
  }
}
