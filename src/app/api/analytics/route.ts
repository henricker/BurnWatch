import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/modules/organizations/application/profileService";
import {
  getDashboardAnalytics,
  type DateRangeKey,
  type ProviderFilterKey,
} from "@/modules/analytics/application/analyticsService";

export const dynamic = "force-dynamic";

const DATE_RANGES: DateRangeKey[] = ["7D", "30D", "MTD"];
const PROVIDER_FILTERS: ProviderFilterKey[] = ["ALL", "VERCEL", "AWS", "GCP"];

/**
 * GET /api/analytics?dateRange=MTD&providerFilter=ALL
 * Returns dashboard analytics for the current user's organization.
 * All monetary values are in cents (integers).
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUserId(prisma, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateRange = (searchParams.get("dateRange") ?? "MTD") as DateRangeKey;
  const providerFilter = (searchParams.get("providerFilter") ?? "ALL") as ProviderFilterKey;

  if (!DATE_RANGES.includes(dateRange)) {
    return NextResponse.json(
      { error: "Invalid dateRange. Use 7D, 30D, or MTD." },
      { status: 400 }
    );
  }
  if (!PROVIDER_FILTERS.includes(providerFilter)) {
    return NextResponse.json(
      { error: "Invalid providerFilter. Use ALL, VERCEL, AWS, or GCP." },
      { status: 400 }
    );
  }

  const result = await getDashboardAnalytics(prisma, {
    organizationId: profile.organizationId,
    dateRange,
    providerFilter,
  });

  return NextResponse.json(result);
}
