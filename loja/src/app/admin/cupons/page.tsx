import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { InlineAction } from "@/components/admin/inline-actions";
import { createCouponAction, toggleCouponAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  await requireStaff("coupons");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: { where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } } } } } });
  const now = new Date();
  return (
    <div>
      <PageHeader title="Cupons" description="Descontos percentuais, fixos ou frete grátis, com validade e valor mínimo." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table head={["Código", "Desconto", "Mínimo", "Validade", "Usos", "Status", ""]} empty={coupons.length ? undefined : "Nenhum cupom."}>
          {coupons.map((c) => {
            const expired = c.expiresAt && c.expiresAt < now;
            return (
              <tr key={c.id}>
                <Td><span className="font-semibold">{c.code}</span>{c.isDemo && <Badge className="ml-2">demo</Badge>}<br /><span className="text-[12px] text-muted">{c.description}</span></Td>
                <Td>{c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? formatBRL(c.value) : "Frete grátis"}</Td>
                <Td>{c.minSubtotalCents ? formatBRL(c.minSubtotalCents) : "—"}</Td>
                <Td className="text-[13px]">{c.startsAt ? `de ${formatDate(c.startsAt)} ` : ""}{c.expiresAt ? `até ${formatDate(c.expiresAt)}` : "sem prazo"}</Td>
                <Td className="tabular-nums">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}{c.perCustomerLimit ? <span className="block text-[11px] text-muted">{c.perCustomerLimit}/cliente</span> : null}</Td>
                <Td><Badge tone={!c.active ? "neutral" : expired ? "bad" : "ok"}>{!c.active ? "Inativo" : expired ? "Expirado" : "Ativo"}</Badge></Td>
                <Td><InlineAction run={toggleCouponAction.bind(null, c.id, !c.active)} label={c.active ? "Desativar" : "Ativar"} /></Td>
              </tr>
            );
          })}
        </Table>
        <Card title="Novo cupom">
          <ActionForm action={createCouponAction} submitLabel="Criar cupom" resetOnSuccess className="grid gap-3">
            <label><span className="label">Código</span><input id="c-code" name="code" className="field uppercase" placeholder="EX.: VERAO15" /></label>
            <label><span className="label">Descrição interna</span><input name="description" className="field" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Tipo</span><select id="c-type" name="type" className="field"><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option><option value="FREE_SHIPPING">Frete grátis</option></select></label>
              <label><span className="label">Valor</span><input id="c-value" name="value" className="field" placeholder="10 ou 25,00" /></label>
            </div>
            <label><span className="label">Compra mínima (R$)</span><input name="minSubtotal" className="field" placeholder="0,00" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Limite total de usos</span><input name="maxUses" type="number" min={1} className="field" /></label>
              <label><span className="label">Limite por cliente</span><input name="perCustomerLimit" type="number" min={1} className="field" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Início</span><input name="startsAt" type="date" className="field" /></label>
              <label><span className="label">Validade</span><input name="expiresAt" type="date" className="field" /></label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
