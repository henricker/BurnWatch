import type { PrismaClient } from "@prisma/client";

import { canDeleteOrganization } from "@/lib/roles";

import type { SupabaseAdminLike } from "../../../domain/organization";
import {
  OrganizationForbiddenError,
  OrganizationNotFoundError,
} from "../../../domain/organization";

export class DeleteOrganizationUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    userId: string,
    options?: { supabaseAdmin?: SupabaseAdminLike | null },
  ): Promise<void> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!profile) {
      throw new OrganizationNotFoundError();
    }

    if (!canDeleteOrganization(profile.role)) {
      throw new OrganizationForbiddenError(
        "Only the organization owner can delete it",
      );
    }

    const organizationId = profile.organizationId;

    const members = await this.prisma.profile.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    const admin = options?.supabaseAdmin ?? null;
    if (admin) {
      for (const { userId: memberUserId } of members) {
        await admin.auth.admin.deleteUser(memberUserId).catch((err) => {
          if (process.env.NODE_ENV !== "test") {
            console.error("[OrganizationService] deleteUser failed:", memberUserId, err);
          }
        });
      }
    }

    await this.prisma.organization.delete({
      where: { id: organizationId },
    });
  }
}
