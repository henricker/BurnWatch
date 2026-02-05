import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { setLocaleCookie } from "@/lib/i18n-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarPath?: string | null;
    theme?: string | null;
    locale?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { organizationId, firstName, lastName, avatarPath, theme, locale } =
    body;
  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found for this organization" },
      { status: 404 },
    );
  }

  const validThemes = ["light", "dark", "system"] as const;
  const validLocales = ["pt", "en", "es"] as const;

  const updateData: {
    firstName?: string | null;
    lastName?: string | null;
    avatarPath?: string | null;
    theme?: string | null;
    locale?: string | null;
  } = {};

  if (firstName !== undefined) {
    updateData.firstName =
      firstName === "" ? null : (firstName ?? "").trim() || null;
  }
  if (lastName !== undefined) {
    updateData.lastName =
      lastName === "" ? null : (lastName ?? "").trim() || null;
  }
  if (avatarPath !== undefined) {
    updateData.avatarPath = avatarPath === "" ? null : avatarPath || null;
  }
  if (theme !== undefined) {
    updateData.theme =
      theme && validThemes.includes(theme as (typeof validThemes)[number])
        ? theme
        : "system";
  }
  if (locale !== undefined) {
    updateData.locale =
      locale && validLocales.includes(locale as (typeof validLocales)[number])
        ? locale
        : "pt";
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: updateData,
  });

  const response = NextResponse.json({
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    avatarPath: updated.avatarPath,
    theme: updated.theme,
    locale: updated.locale,
  });
  if (updateData.locale !== undefined) {
    setLocaleCookie(response, updated.locale);
  }
  return response;
}
