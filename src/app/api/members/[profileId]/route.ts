import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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

  try {
    await removeMember(prisma, {
      requesterUserId: user.id,
      profileIdToRemove: profileId,
    });
    return NextResponse.json({ ok: true });
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
}
