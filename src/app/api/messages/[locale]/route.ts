import { NextResponse } from "next/server";
import { isValidLocale, type Locale } from "@/i18n/locales";

import messagesEn from "@messages/en.json";
import messagesEs from "@messages/es.json";
import messagesPt from "@messages/pt.json";

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  pt: messagesPt as Record<string, unknown>,
  en: messagesEn as Record<string, unknown>,
  es: messagesEs as Record<string, unknown>,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  return NextResponse.json(MESSAGES[locale]);
}
