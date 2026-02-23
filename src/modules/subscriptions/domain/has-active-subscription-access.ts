export function hasActiveSubscriptionAccess(organization: {
  subscriptionId: string | null;
  subscription: {
    cancelAt: Date | null;
    currentPeriodEnd: Date | null;
  } | null;
}, now: Date = new Date()): boolean {
  if (!organization.subscriptionId || !organization.subscription) return false;

  const endDate = organization.subscription.cancelAt ?? organization.subscription.currentPeriodEnd;
  if (!endDate) return false;

  return now <= endDate;
}
