export interface SupabaseAdminAuth {
  deleteUser(userId: string): Promise<{ error: unknown }>;
}

export interface SupabaseAdminLike {
  auth: { admin: SupabaseAdminAuth };
}

export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
  }
}

export class OrganizationNotFoundError extends OrganizationError {
  constructor(message: string = "Profile not found") {
    super(message);
    this.name = "OrganizationNotFoundError";
  }
}

export class OrganizationForbiddenError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationForbiddenError";
  }
}
