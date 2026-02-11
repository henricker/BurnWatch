import type { PrismaClient } from "@prisma/client";

import type { NotificationLocale } from "./notificationMessages";

/**
 * Returns the preferred locale of the organization's OWNER (first profile with role OWNER).
 * Falls back to "en" if no owner or no locale set.
 */
export async function getOwnerLocale(
  prisma: PrismaClient,
  organizationId: string,
): Promise<NotificationLocale> {
  const owner = await prisma.profile.findFirst({
    where: { organizationId, role: "OWNER" },
    select: { locale: true },
    orderBy: { createdAt: "asc" },
  });
  const locale = owner?.locale?.trim();
  if (locale === "pt" || locale === "en" || locale === "es") return locale;
  return "en";
}
