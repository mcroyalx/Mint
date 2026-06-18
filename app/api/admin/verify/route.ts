import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== "string" || passcode.length !== 4) {
      return NextResponse.json({ ok: false, error: "Invalid passcode format" }, { status: 400 });
    }

    const expectedHash = process.env.ADMIN_PASSCODE_HASH;
    if (!expectedHash) {
      return NextResponse.json({ ok: false, error: "Admin access not configured" }, { status: 503 });
    }

    const inputHash = createHash("sha256").update(passcode).digest("hex");

    if (inputHash !== expectedHash.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Incorrect passcode" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Admin verify error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
