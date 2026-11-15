import { requireStaff } from "@/lib/auth";
import { env, integrations } from "@/lib/env";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { aliexpressAdapter, cjAdapter } from "@/lib/suppliers/platforms";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireStaff("dashboard");
  const lastWebhook = await db.webhookEvent.findFirst({ where: { provider: "mercadopago" }, orderBy: { createdAt: "desc" } });
  const rows: { name: string; ok: boolean; status: string; how: string }[] = [
    { name: "Mercado Pago — pagamentos", ok: integrations.mercadoPago(), status: integrations.mercadoPago() ? (integrations.mercadoPagoSandbox() ? "Ativo (sandbox/teste)" : "Ativo (produção)") : "Não configurado", how: "MERCADOPAGO_ACCESS_TOKEN (credencial de teste TEST-… durante o desenvolvimento)" },
    { name: "Mercado Pago — webhook", ok: integrations.mercadoPagoWebhook(), status: integrations.mercadoPagoWebhook() ? `Assinatura configurada${lastWebhook ? ` · último evento ${formatDateTime(lastWebhook.createdAt)}` : " · nenhum evento recebido"}` : "Sem chave secreta: todas as notificações são rejeitadas", how: `MERCADOPAGO_WEBHOOK_SECRET · URL: ${env.siteUrl}/api/webhooks/mercadopago` },
    { name: "E-mail transacional (Resend)", ok: integrations.email(), status: integrations.email() ? "Ativo" : "Não configurado — e-mails não são enviados", how: "RESEND_API_KEY e EMAIL_FROM (domínio verificado)" },
    { name: "Google Analytics 4", ok: integrations.ga4(), status: integrations.ga4() ? `Ativo (${env.ga4Id}) — carrega após consentimento` : "Não configurado", how: "NEXT_PUBLIC_GA4_ID (G-XXXXXXX)" },
    { name: "Meta Pixel", ok: integrations.metaPixel(), status: integrations.metaPixel() ? "Ativo — carrega após consentimento" : "Não configurado", how: "NEXT_PUBLIC_META_PIXEL_ID" },
    { name: "WhatsApp (atendimento/recuperação)", ok: integrations.whatsapp(), status: integrations.whatsapp() ? "Ativo (links wa.me)" : "Número não configurado", how: "NEXT_PUBLIC_WHATSAPP_NUMBER (ex.: 5511999999999)" },
    { name: "Tarefas agendadas (cron)", ok: env.cronSecret.length > 0, status: env.cronSecret ? "Protegido por CRON_SECRET" : "CRON_SECRET ausente — endpoint bloqueado", how: "CRON_SECRET + agendar GET /api/cron a cada 30–60 min" },
    { name: "ViaCEP (autopreenchimento)", ok: true, status: "Pública, sem credencial (chamada pelo navegador do cliente)", how: "—" },
    { name: "AliExpress (fornecedor)", ok: false, status: "Preparado, não ativo", how: aliexpressAdapter.status().missing.join("; ") },
    { name: "CJdropshipping (fornecedor)", ok: false, status: "Preparado, não ativo", how: cjAdapter.status().missing.join("; ") },
  ];
  return (
    <div>
      <PageHeader title="Integrações" description="Estado real de cada serviço externo. Nada é simulado: o que não está configurado fica desativado. Detalhes em docs/INTEGRACOES.md." />
      <Card>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.name} className="grid gap-1 py-4 md:grid-cols-[260px_1fr]">
              <p className="font-semibold">{r.name}</p>
              <div className="text-sm">
                <p className="flex items-center gap-2"><Badge tone={r.ok ? "ok" : "warn"}>{r.ok ? "OK" : "Pendente"}</Badge> {r.status}</p>
                <p className="mt-1 text-[12px] text-muted">Configuração: {r.how}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
