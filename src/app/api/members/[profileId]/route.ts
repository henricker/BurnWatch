import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  removeMember,
  MemberError,
  MemberForbiddenError,
} from "@/modules/organizations/application/memberService";

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

  const targetProfile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });

  if (!targetProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  try {
    await removeMember(prisma, {
      requesterUserId: user.id,
      profileIdToRemove: profileId,
    });
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
      targetProfile.userId,
    );
    if (deleteError) {
      console.error(
        "[members DELETE] Supabase auth deleteUser failed:",
        deleteError,
      );
      return NextResponse.json(
        { error: "Member removed but failed to revoke access." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
