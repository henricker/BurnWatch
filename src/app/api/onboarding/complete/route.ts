import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/modules/organizations/application/onboardingService";

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
    await completeOnboarding(prisma, {
      userId: user.id,
      organizationName: body.name,
      firstName: body.firstName,
      lastName: body.lastName,
      avatarPath: body.avatarPath ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to complete onboarding.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

