import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { User } from "@/models/User";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, token, and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({
      email,
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(password);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return NextResponse.json({ message: "Password updated. You can log in now." });
  } catch (error) {
    console.error("reset-password error", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
