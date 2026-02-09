export class MemberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberError";
  }
}

export class MemberForbiddenError extends MemberError {
  constructor(message: string) {
    super(message);
    this.name = "MemberForbiddenError";
  }
}

export interface RemoveMemberParams {
  requesterUserId: string;
  profileIdToRemove: string;
}

export interface RemoveMemberResult {
  removedUserId: string;
}
