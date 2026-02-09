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

export interface CreateInviteParams {
  adminId: string;
  organizationId: string;
  guestEmail: string;
  targetRole: Role;
  emailRedirectTo?: string;
}
