import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlayerRegistration } from "@/models/PlayerRegistration";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || "");
    const adminNotes = String(body.adminNotes || "").trim();

    if (!["pending", "verified", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    await connectDB();
    const registration = await PlayerRegistration.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    return NextResponse.json({ registration });
  } catch (error) {
    console.error("admin registration update error", error);
    return NextResponse.json({ error: "Unable to update registration." }, { status: 500 });
  }
}
