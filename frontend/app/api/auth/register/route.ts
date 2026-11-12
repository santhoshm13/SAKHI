import { NextResponse } from "next/server";
import { createManualAccount } from "@/lib/userAccounts";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const key = clientKey(req, "auth_register");
    const rl = rateLimit(key, 10, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please wait ${rl.retryAfter}s and try again.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = await createManualAccount({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          email: result.user.email,
          name: result.user.name,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("/api/auth/register error:", err);
    return NextResponse.json(
      { error: "Unable to create account right now. Please try again." },
      { status: 500 }
    );
  }
}

