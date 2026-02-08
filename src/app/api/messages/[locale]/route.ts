import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";
import { isValidLocale } from "@/i18n/locales";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const path = join(process.cwd(), "messages", `${locale}.json`);
  const raw = readFileSync(path, "utf-8");
  const messages = JSON.parse(raw) as Record<string, unknown>;
  return NextResponse.json(messages);
}
