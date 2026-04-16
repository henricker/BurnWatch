import type { Role } from "@prisma/client";

export class InviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteError";
  }
}

export class InviteForbiddenError extends InviteError {
  constructor(message: string) {
    super(message);
    this.name = "InviteForbiddenError";
  }
}

export class InviteValidationError extends InviteError {
  constructor(message: string) {
    super(message);
    this.name = "InviteValidationError";
  }
}

export class PlanLimitReachedError extends InviteError {
  constructor(message: string = "Plan member limit reached. Upgrade to Pro for unlimited members.") {
    super(message);
    this.name = "PlanLimitReachedError";
  }
}

export interface CreateInviteParams {
  adminId: string;
  organizationId: string;
  guestEmail: string;
  targetRole: Role;
  emailRedirectTo?: string;
}
