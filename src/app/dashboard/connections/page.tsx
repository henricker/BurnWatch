import { getSessionProfile } from "@/lib/auth-server";

import { ConnectionsView } from "./ConnectionsView";

export default async function ConnectionsPage() {
  await getSessionProfile(); // ensure auth + profile (layout may already do this, but explicit for clarity)
  return <ConnectionsView />;
}
