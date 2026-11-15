import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
) {
  const { error } = await createAdminClient()
    .from("admin_logs")
    .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
  if (error) console.error("[audit]", error.message);
}
