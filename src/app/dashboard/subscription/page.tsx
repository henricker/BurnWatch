import { getSessionProfile } from "@/lib/auth-server";

import { SubscriptionView } from "./SubscriptionView";

export default async function SubscriptionPage() {
  await getSessionProfile();
  return <SubscriptionView />;
}
