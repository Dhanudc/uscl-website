import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
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

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "user",
    });

    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: "user",
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "user",
      },
    });
  } catch (error) {
    console.error("signup error", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
