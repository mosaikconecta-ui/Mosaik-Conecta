import { requireCompany } from "@/lib/auth";
import { NotificationsList } from "@/components/notifications-list";

export const metadata = { title: "Notificações" };

export default async function Page() {
  const { userId } = await requireCompany();
  return <NotificationsList userId={userId} />;
}
