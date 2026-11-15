import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCEP } from "@/lib/br";
import { pageMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/misc";
import { AddressActions, AddressForm } from "@/components/account/account-forms";

export const metadata = pageMetadata({ title: "Endereços", description: "Seus endereços.", path: "/conta/enderecos", noindex: true });

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <div>
      <h2 className="text-xl font-semibold">Endereços</h2>
      {addresses.length === 0 ? <p className="mt-4 text-muted">Nenhum endereço salvo.</p> : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border border-line bg-surface p-5 text-sm leading-relaxed">
              <p className="mb-1 flex items-center gap-2 font-semibold">{a.label} {a.isDefault && <Badge tone="dark">Principal</Badge>}</p>
              <p>{a.recipient}<br />{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""}<br />{a.district} — {a.city}/{a.state} · CEP {formatCEP(a.cep)}</p>
              <div className="mt-3"><AddressActions id={a.id} isDefault={a.isDefault} /></div>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-5 mt-12 text-lg font-semibold">Novo endereço</h3>
      <AddressForm />
    </div>
  );
}
