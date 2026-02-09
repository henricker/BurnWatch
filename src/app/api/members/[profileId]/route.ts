import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RemoveMemberUseCase } from "@/modules/organizations/application/use-cases/remove-member-usecase";
import { MemberError, MemberForbiddenError } from "@/modules/organizations/domain/member";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let removedUserId: string;
  try {
    const useCase = new RemoveMemberUseCase(prisma);
    const result = await useCase.execute({
      requesterUserId: user.id,
      profileIdToRemove: profileId,
    });
    removedUserId = result.removedUserId;
  } catch (err) {
    if (err instanceof MemberForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof MemberError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(
      removedUserId,
    );
    if (deleteError) {
      if (process.env.NODE_ENV !== "test") {
        console.error(
          "[members DELETE] Supabase auth deleteUser failed:",
          deleteError,
        );
      }
      return NextResponse.json(
        { error: "Member removed but failed to revoke access." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
