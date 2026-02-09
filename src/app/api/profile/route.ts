import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { setLocaleCookie } from "@/lib/i18n-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UpdateProfileUseCase } from "@/modules/organizations/application/use-cases/update-profile-usecase";
import { ProfileNotFoundError } from "@/modules/organizations/domain/profile";

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

  try {
    const useCase = new UpdateProfileUseCase(prisma);
    const updated = await useCase.execute(user.id, organizationId, {
      firstName,
      lastName,
      avatarPath,
      theme,
      locale,
    });

    const response = NextResponse.json({
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatarPath: updated.avatarPath,
      theme: updated.theme,
      locale: updated.locale,
    });
    if (locale !== undefined) {
      setLocaleCookie(response, updated.locale ?? "pt");
    }
    return response;
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      return NextResponse.json(
        { error: "Profile not found for this organization" },
        { status: 404 },
      );
    }
    throw err;
  }
}
