import { NextResponse } from "next/server";

import { EncryptionService } from "@/lib/security/encryption";

export async function GET() {
  try {
    const service = EncryptionService.fromEnv();

    const original = "BurnWatch encryption roundtrip";
    const ciphertext = service.encrypt(original);
    const decrypted = service.decrypt(ciphertext);

    const ok = decrypted === original;

    return NextResponse.json({
      ok,
      original,
      decrypted,
      ciphertext,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown encryption error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

