import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(error) };
}

const DB_MESSAGES: Record<string, string> = {
  NO_ACTIVE_PLAN: "Sua empresa precisa de um plano ativo para publicar vagas.",
  PLAN_JOB_LIMIT: "Você atingiu o limite de vagas ativas do seu plano. Encerre uma vaga ou faça upgrade.",
  PLAN_FEATURED_LIMIT: "Seu plano não possui mais vagas em destaque disponíveis.",
  PLAN_RECRUITER_LIMIT: "Seu plano atingiu o limite de recrutadores.",
  COMPANY_SUSPENDED: "Sua empresa está suspensa. Entre em contato com o suporte.",
  DEADLINE_PASSED: "O prazo de inscrição já passou. Atualize a data antes de publicar.",
  JOB_NOT_OPEN: "Esta vaga não está aceitando candidaturas.",
  JOB_EXPIRED: "O prazo de inscrição desta vaga terminou.",
  DEMO_JOB: "Esta é uma vaga de demonstração e não aceita candidaturas.",
  JOB_REMOVED: "Esta vaga foi removida pela moderação e não pode ser alterada.",
  JOB_NOT_ACTIVE: "Somente vagas ativas podem ser destacadas.",
  FORBIDDEN_STATUS: "Alteração de status não permitida.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  ONLY_COMPANY_ACCOUNTS: "Apenas contas empresariais podem cadastrar empresas.",
  ALREADY_MEMBER: "Sua conta já está vinculada a uma empresa.",
  INVALID_RESUME: "Currículo inválido.",
};

export function dbErrorMessage(error: { message?: string; code?: string } | null | undefined, fallback = "Não foi possível concluir. Tente novamente.") {
  if (!error) return fallback;
  const msg = error.message ?? "";
  for (const [code, text] of Object.entries(DB_MESSAGES)) if (msg.includes(code)) return text;
  if (error.code === "23505") {
    if (msg.includes("cnpj")) return "Este CNPJ já está cadastrado.";
    if (msg.includes("applications")) return "Você já se candidatou a esta vaga.";
    return "Registro duplicado.";
  }
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  console.error("[db]", error);
  return fallback;
}
