export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileError";
  }
}

export class ProfileNotFoundError extends ProfileError {
  constructor(message: string = "Profile not found") {
    super(message);
    this.name = "ProfileNotFoundError";
  }
}

export interface ProfileByUserIdResult {
  id: string;
  organizationId: string;
  role: string;
  locale: string | null;
}

export interface ProfileByUserAndOrgResult {
  id: string;
  organizationId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  theme: string | null;
  locale: string | null;
}

export interface UpdateProfileParams {
  firstName?: string | null;
  lastName?: string | null;
  avatarPath?: string | null;
  theme?: string | null;
  locale?: string | null;
}

export interface UpdateProfileResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  theme: string | null;
  locale: string | null;
}
