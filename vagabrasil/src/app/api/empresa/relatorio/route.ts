import { NextResponse } from "next/server";
import { companyActionContext } from "@/lib/company-auth";
import { planAllows } from "@/lib/plan";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Evita injeção de fórmulas em planilhas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const ctx = await companyActionContext();
  if ("error" in ctx) return new NextResponse(ctx.error, { status: 403 });
  if (!planAllows(ctx.plan, "advanced_metrics")) return new NextResponse("Disponível no plano Empresarial", { status: 403 });
  const { data } = await ctx.supabase.rpc("company_job_report", { p_company: ctx.company.id });
  const header = ["vaga", "status", "publicada_em", "visualizacoes", "candidaturas", "em_processo", "aprovados", "reprovados"];
  const lines = (data ?? []).map((r: Record<string, unknown>) =>
    [r.title, r.status, r.published_at, r.views, r.applications, r.in_process, r.approved, r.rejected].map(csvCell).join(";"));
  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-vagas-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
