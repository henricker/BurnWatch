import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteOrganizationUseCase } from "@/modules/organizations/application/use-cases/delete-organization-usecase";
import { UpdateOrganizationNameUseCase } from "@/modules/organizations/application/use-cases/update-organization-name-usecase";
import {
  OrganizationError,
  OrganizationForbiddenError,
  OrganizationNotFoundError,
} from "@/modules/organizations/domain/organization";
import { prisma } from "@/lib/prisma";

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

  try {
    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await useCase.execute(user.id, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OrganizationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof OrganizationForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof OrganizationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

/**
 * DELETE: Delete the organization and all related data. Only OWNER.
 * Deletes all members' Supabase Auth users, then the organization (cascade).
 */
export async function DELETE() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const useCase = new DeleteOrganizationUseCase(prisma);
    await useCase.execute(user.id, {
      supabaseAdmin: admin ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OrganizationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof OrganizationForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof OrganizationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
