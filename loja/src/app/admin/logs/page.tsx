import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  await requireStaff("logs");
  const [logs, webhooks] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { user: { select: { name: true, email: true } } } }),
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <div>
      <PageHeader title="Logs" description="Auditoria de operações importantes e notificações recebidas dos gateways." />
      <div className="space-y-6">
        <Card title="Auditoria">
          <Table head={["Data", "Usuário", "Ação", "Entidade", "Detalhes"]} empty={logs.length ? undefined : "Sem registros."}>
            {logs.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap text-[13px]">{formatDateTime(l.createdAt)}</Td>
                <Td className="text-[13px]">{l.user ? l.user.name : "sistema"}</Td>
                <Td className="font-mono text-[12px]">{l.action}</Td>
                <Td className="text-[12px] text-muted">{l.entity ? `${l.entity}:${l.entityId?.slice(-8)}` : "—"}</Td>
                <Td className="max-w-[360px] truncate font-mono text-[11px] text-muted">{l.details ? JSON.stringify(l.details) : ""}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Webhooks">
          <Table head={["Data", "Gateway", "Evento", "Processado", "Erro"]} empty={webhooks.length ? undefined : "Nenhum webhook recebido."}>
            {webhooks.map((w) => (
              <tr key={w.id}>
                <Td className="text-[13px]">{formatDateTime(w.createdAt)}</Td>
                <Td>{w.provider}</Td>
                <Td className="font-mono text-[12px]">{w.eventKey}</Td>
                <Td><Badge tone={w.processed ? "ok" : "warn"}>{w.processed ? "sim" : "não"}</Badge></Td>
                <Td className="text-[12px] text-danger">{w.error ?? ""}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
