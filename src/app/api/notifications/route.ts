import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GetProfileByUserIdUseCase } from "@/modules/organizations/application/use-cases/get-profile-by-user-id-usecase";
import type { NotificationSettings } from "@/modules/notifications/domain/types";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/modules/notifications/domain/types";

function parseSettings(settings: unknown): NotificationSettings {
  if (settings == null || typeof settings !== "object") {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  const o = settings as Record<string, unknown>;
  return {
    anomaly: typeof o.anomaly === "boolean" ? o.anomaly : DEFAULT_NOTIFICATION_SETTINGS.anomaly,
    dailySummary:
      typeof o.dailySummary === "boolean" ? o.dailySummary : DEFAULT_NOTIFICATION_SETTINGS.dailySummary,
    limitWarning:
      typeof o.limitWarning === "boolean" ? o.limitWarning : DEFAULT_NOTIFICATION_SETTINGS.limitWarning,
  };
}

/**
 * GET: Return notification settings and webhook URLs for the current org.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: profile.organizationId },
    select: {
      slackWebhookUrl: true,
      discordWebhookUrl: true,
      notificationSettings: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    slackWebhookUrl: org.slackWebhookUrl ?? "",
    discordWebhookUrl: org.discordWebhookUrl ?? "",
    notificationSettings: parseSettings(org.notificationSettings),
  });
}

/**
 * PATCH: Update notification settings and/or webhook URLs.
 * Body: { slackWebhookUrl?: string, discordWebhookUrl?: string, notificationSettings?: { anomaly?: boolean, dailySummary?: boolean, limitWarning?: boolean } }
 */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let body: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    notificationSettings?: { anomaly?: boolean; dailySummary?: boolean; limitWarning?: boolean };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.OrganizationUpdateInput = {};

  if (typeof body.slackWebhookUrl === "string") {
    const trimmed = body.slackWebhookUrl.trim();
    data.slackWebhookUrl = trimmed === "" ? null : trimmed;
  }
  if (typeof body.discordWebhookUrl === "string") {
    const trimmed = body.discordWebhookUrl.trim();
    data.discordWebhookUrl = trimmed === "" ? null : trimmed;
  }
  if (body.notificationSettings != null && typeof body.notificationSettings === "object") {
    const s = body.notificationSettings;
    data.notificationSettings = {
      anomaly: typeof s.anomaly === "boolean" ? s.anomaly : DEFAULT_NOTIFICATION_SETTINGS.anomaly,
      dailySummary:
        typeof s.dailySummary === "boolean" ? s.dailySummary : DEFAULT_NOTIFICATION_SETTINGS.dailySummary,
      limitWarning:
        typeof s.limitWarning === "boolean" ? s.limitWarning : DEFAULT_NOTIFICATION_SETTINGS.limitWarning,
    } as Prisma.InputJsonValue;
  }

  await prisma.organization.update({
    where: { id: profile.organizationId },
    data,
  });

  return NextResponse.json({ ok: true });
}
