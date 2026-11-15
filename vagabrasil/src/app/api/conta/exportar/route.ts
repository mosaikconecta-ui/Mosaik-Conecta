import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/** Portabilidade de dados (LGPD art. 18, V). */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return new NextResponse("Não autorizado", { status: 401 });
  if (!(await rateLimit("export", 5, 3600, current.user.id))) return new NextResponse("Muitas requisições", { status: 429 });
  const supabase = await createClient();
  const uid = current.user.id;
  const [candidate, applications, saved, resumes, notifications] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", uid).maybeSingle(),
    supabase.from("applications").select("id, job_id, status, cover_letter, created_at, application_events(to_status, created_at)").eq("candidate_id", uid),
    supabase.from("saved_jobs").select("job_id, created_at").eq("candidate_id", uid),
    supabase.from("resumes").select("id, file_name, size_bytes, created_at").eq("candidate_id", uid),
    supabase.from("notifications").select("type, title, body, created_at, read_at").eq("user_id", uid),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    profile: current.profile,
    candidate: candidate.data,
    applications: applications.data,
    saved_jobs: saved.data,
    resumes: resumes.data,
    notifications: notifications.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vagabrasil-meus-dados.json"`,
      "Cache-Control": "no-store",
    },
  });
}
