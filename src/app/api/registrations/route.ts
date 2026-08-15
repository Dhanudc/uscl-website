import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlayerRegistration } from "@/models/PlayerRegistration";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  await connectDB();
  const registrations = await PlayerRegistration.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ registrations });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const company = String(body.company || "").trim();
    const role = String(body.role || "").trim();
    const experienceYears = Number(body.experienceYears);
    const city = String(body.city || "").trim();
    const battingStyle = String(body.battingStyle || "").trim();
    const bowlingStyle = String(body.bowlingStyle || "").trim();
    const interest = (body.interest || "player") as "player" | "franchise" | "sponsor";
    const agreedToTerms = Boolean(body.agreedToTerms);

    if (!fullName || !email || !phone || !company || !role || Number.isNaN(experienceYears)) {
      return NextResponse.json(
        { error: "Please fill all required registration fields." },
        { status: 400 }
      );
    }

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: "You must agree to the eligibility terms." },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await PlayerRegistration.findOne({
      userId: session.userId,
      interest: "player",
      status: { $in: ["pending", "verified"] },
    });

    if (interest === "player" && existing) {
      return NextResponse.json(
        { error: "You already have an active player registration." },
        { status: 409 }
      );
    }

    const registration = await PlayerRegistration.create({
      userId: session.userId,
      fullName,
      email,
      phone,
      company,
      role,
      experienceYears,
      city,
      battingStyle,
      bowlingStyle,
      interest,
      agreedToTerms,
      status: "pending",
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error("registration error", error);
    return NextResponse.json({ error: "Unable to submit registration." }, { status: 500 });
  }
}
