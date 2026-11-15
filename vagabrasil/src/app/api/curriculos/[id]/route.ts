import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Entrega um currículo por URL assinada de 5 minutos.
 * Acesso: o próprio candidato, membros de empresas para as quais ele se candidatou, ou administradores.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Não encontrado", { status: 404 });
  const current = await getCurrentUser();
  if (!current) return new NextResponse("Não autorizado", { status: 401 });
  if (!hasServiceRole()) return new NextResponse("Serviço indisponível", { status: 503 });
  if (!(await rateLimit("resume-view", 120, 3600, current.user.id))) return new NextResponse("Muitas requisições", { status: 429 });

  const supabase = await createClient();
  let allowed = false;
  if (current.profile.role === "candidate") {
    const { data } = await supabase.from("resumes").select("id").eq("id", id).eq("candidate_id", current.user.id).maybeSingle();
    allowed = Boolean(data);
  } else if (current.profile.role === "company") {
    // A view company_applicants só retorna candidaturas de vagas da empresa do usuário
    const { data } = await supabase.from("company_applicants").select("application_id").eq("resume_id", id).limit(1);
    allowed = Boolean(data?.length);
  } else if (current.profile.role === "admin") {
    allowed = true;
  }
  if (!allowed) return new NextResponse("Não encontrado", { status: 404 });

  const admin = createAdminClient();
  const { data: resume } = await admin.from("resumes").select("storage_path, file_name").eq("id", id).single();
  if (!resume) return new NextResponse("Não encontrado", { status: 404 });
  const { data: signed, error } = await admin.storage.from("resumes").createSignedUrl(resume.storage_path, 300, { download: false });
  if (error || !signed) return new NextResponse("Erro ao gerar link", { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
