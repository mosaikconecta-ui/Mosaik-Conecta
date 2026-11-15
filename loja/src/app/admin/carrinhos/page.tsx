import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, store } from "@/lib/env";
import { effectivePrice } from "@/lib/pricing";
import { formatBRL, formatDateTime } from "@/lib/format";
import { ensureRecoveryToken, recoveryUrl, whatsappRecoveryLink } from "@/lib/recovery";
import { Alert, Badge } from "@/components/ui/misc";
import { PageHeader, Table, Td } from "@/components/admin/ui";
import { CopyButton, InlineAction } from "@/components/admin/inline-actions";
import { sendRecoveryAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function AbandonedCarts() {
  await requireStaff("carts");
  const carts = await db.cart.findMany({
    where: { convertedAt: null, email: { not: null }, items: { some: {} }, updatedAt: { lt: new Date(Date.now() - store.abandonedCartAfterMinutes * 60_000) } },
    orderBy: { updatedAt: "desc" }, take: 100,
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  const rows = await Promise.all(carts.map(async (c) => {
    const token = await ensureRecoveryToken(c.id);
    const value = c.items.reduce((s, i) => s + effectivePrice(i.variant, i.variant.product).unitCents * i.quantity, 0);
    return { c, url: recoveryUrl(token), value };
  }));

  return (
    <div>
      <PageHeader title="Carrinhos abandonados" description={`Sacolas com e-mail informado no checkout e sem compra há mais de ${store.abandonedCartAfterMinutes} minutos.`} />
      {!integrations.email() && <Alert tone="warn" className="mb-4" title="E-mail automático desativado">Configure RESEND_API_KEY para enviar lembretes (manual ou pelo agendamento /api/cron). O link de recuperação e o WhatsApp funcionam sem configuração.</Alert>}
      <Table head={["Contato", "Itens", "Valor", "Última atividade", "Lembrete", "Recuperar"]} empty={rows.length ? undefined : "Nenhum carrinho abandonado com contato."}>
        {rows.map(({ c, url, value }) => {
          const wa = whatsappRecoveryLink(c.phone, c.name, url);
          return (
            <tr key={c.id} className="align-top">
              <Td><span className="font-semibold">{c.name ?? "—"}</span><br /><span className="text-[12px] text-muted">{c.email}</span></Td>
              <Td className="text-[13px]">{c.items.map((i) => `${i.quantity}× ${i.variant.product.name}`).join(", ")}</Td>
              <Td className="tabular-nums">{formatBRL(value)}</Td>
              <Td className="text-[13px]">{formatDateTime(c.updatedAt)}</Td>
              <Td>{c.recoverySentAt ? <Badge tone="ok">enviado {formatDateTime(c.recoverySentAt)}</Badge> : <Badge>pendente</Badge>}</Td>
              <Td>
                <div className="flex flex-col items-start gap-1.5">
                  <InlineAction run={sendRecoveryAction.bind(null, c.id)} label="Enviar e-mail" resultMessage />
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold hover:underline">WhatsApp</a>}
                  <CopyButton text={url} />
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
