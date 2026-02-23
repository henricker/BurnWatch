export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

export class StripeProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeProviderError";
  }
}

export class UpgradeRequiredError extends Error {
  constructor(message: string = "Upgrade to Pro to access this feature.") {
    super(message);
    this.name = "UpgradeRequiredError";
  }
}

export class PlanLimitReachedError extends Error {
  constructor(message: string = "Plan member limit reached. Upgrade to Pro for unlimited members.") {
    super(message);
    this.name = "PlanLimitReachedError";
  }
}

export class SyncRateLimitError extends Error {
  constructor(message: string = "Manual sync is limited on your plan. Try again later or upgrade to Pro.") {
    super(message);
    this.name = "SyncRateLimitError";
  }
}
