import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(session.userId).select(
      "name email phone role createdAt"
    );

    if (!user) {
      await clearSessionCookie();
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role === "admin" ? "admin" : "user",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("auth/me error", error);
    return NextResponse.json({ user: null, error: "Database unavailable" }, { status: 500 });
  }
}
