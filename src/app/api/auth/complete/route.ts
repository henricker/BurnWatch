import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeAuthForUser } from "@/modules/organizations/application/authCompletionService";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  // Prefer Bearer token from client (magic link callback may not have set cookies yet).
  const authHeader = request.headers.get("Authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  const {
    data: { user },
    error: userError,
  } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          userError?.message ??
          "No authenticated user found while completing auth.",
      },
      { status: 401 },
    );
  }

  const email = user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Authenticated user does not have an email." },
      { status: 400 },
    );
  }

  const result = await completeAuthForUser(prisma, {
    userId: user.id,
    email,
  });

  return NextResponse.json(result);
}

