import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GetProfileByUserIdUseCase } from "@/modules/organizations/application/use-cases/get-profile-by-user-id-usecase";
import { TestWebhookConnectionUseCase } from "@/modules/notifications/application/use-cases/test-webhook-connection-usecase";
import type { WebhookChannel } from "@/modules/notifications/application/use-cases/test-webhook-connection-usecase";

/**
 * POST: Send a test message to the Slack or Discord webhook.
 * Body: { channel: "slack" | "discord", webhookUrl?: string }
 * If webhookUrl is provided, tests that URL (e.g. from input before saving). Otherwise uses saved URL.
 */
export async function POST(request: Request) {
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

  let body: { channel?: string; webhookUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel = body.channel === "slack" || body.channel === "discord" ? body.channel : null;
  if (!channel) {
    return NextResponse.json(
      { error: "Body must include channel: 'slack' or 'discord'" },
      { status: 400 },
    );
  }

  const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : undefined;

  const useCase = new TestWebhookConnectionUseCase(prisma);
  const result = await useCase.execute({
    organizationId: profile.organizationId,
    channel: channel as WebhookChannel,
    webhookUrl: webhookUrl || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
