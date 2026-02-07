import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canDeleteOrganization, canUpdateOrganizationName } from "@/lib/roles";

/**
 * PATCH: Update organization name. Requires OWNER or ADMIN.
 * Body: { name: string }
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

  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "name is required and must be non-empty" },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!canUpdateOrganizationName(profile.role)) {
    return NextResponse.json(
      { error: "Only Owner or Admin can update organization name" },
      { status: 403 },
    );
  }

  await prisma.organization.update({
    where: { id: profile.organizationId },
    data: { name },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE: Delete the organization and all related data. Only OWNER.
 * Deletes all members' Supabase Auth users, then the organization (cascade).
 */
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!canDeleteOrganization(profile.role)) {
    return NextResponse.json(
      { error: "Only the organization owner can delete it" },
      { status: 403 },
    );
  }

  const organizationId = profile.organizationId;

  // All profiles in this org (to delete their auth users)
  const members = await prisma.profile.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const admin = createSupabaseAdminClient();
  if (admin) {
    for (const { userId } of members) {
      await admin.auth.admin.deleteUser(userId).catch((err) => {
        console.error("[DELETE /api/organization] deleteUser failed:", userId, err);
      });
    }
  }

  await prisma.organization.delete({
    where: { id: organizationId },
  });

  return NextResponse.json({ ok: true });
}
