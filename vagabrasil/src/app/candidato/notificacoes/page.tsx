import { requireCandidate } from "@/lib/auth";
import { NotificationsList } from "@/components/notifications-list";

export const metadata = { title: "Notificações" };

export default async function Page() {
  const { profile } = await requireCandidate();
  return <NotificationsList userId={profile.id} />;
}
