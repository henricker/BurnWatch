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
