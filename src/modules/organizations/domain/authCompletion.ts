export type NextDestination = "/dashboard" | "/onboarding";

export interface CompleteAuthResult {
  next: NextDestination;
  locale?: string | null;
}
