import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { setLocaleCookie } from "@/lib/i18n-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompleteOnboardingUseCase } from "@/modules/organizations/application/use-cases/complete-onboarding-usecase";

interface OnboardingBody {
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarPath?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          userError?.message ??
          "No authenticated user found while completing onboarding.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json()) as OnboardingBody;
  if (!body.name) {
    return NextResponse.json(
      { error: "Organization name is required." },
      { status: 400 },
    );
  }

  try {
    const useCase = new CompleteOnboardingUseCase(prisma);
    const result = await useCase.execute({
      userId: user.id,
      organizationName: body.name,
      firstName: body.firstName,
      lastName: body.lastName,
      avatarPath: body.avatarPath ?? null,
    });

    const response = NextResponse.json({ ok: true });
    if (result.locale != null) {
      setLocaleCookie(response, result.locale);
    }
    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to complete onboarding.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
