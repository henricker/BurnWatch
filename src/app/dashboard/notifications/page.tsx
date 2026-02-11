import { getSessionProfile } from "@/lib/auth-server";

import { NotificationsView } from "./NotificationsView";

export default async function NotificationsPage() {
  await getSessionProfile();
  return <NotificationsView />;
}
