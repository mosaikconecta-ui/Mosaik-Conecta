import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/misc";
import { AdminNav, type NavItem } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

const NAV: NavItem[] = [
  { href: "/admin", label: "Visão geral", perm: "dashboard" },
  { href: "/admin/pedidos", label: "Pedidos", perm: "orders" },
  { href: "/admin/produtos", label: "Produtos", perm: "products" },
  { href: "/admin/categorias", label: "Categorias", perm: "catalog" },
  { href: "/admin/combos", label: "Combos", perm: "catalog" },
  { href: "/admin/clientes", label: "Clientes", perm: "customers" },
  { href: "/admin/carrinhos", label: "Carrinhos abandonados", perm: "carts" },
  { href: "/admin/cupons", label: "Cupons", perm: "coupons" },
  { href: "/admin/fornecedores", label: "Fornecedores", perm: "suppliers" },
  { href: "/admin/frete", label: "Frete", perm: "shipping" },
  { href: "/admin/avaliacoes", label: "Avaliações", perm: "reviews" },
  { href: "/admin/integracoes", label: "Integrações", perm: "dashboard" },
  { href: "/admin/logs", label: "Logs", perm: "logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // A checagem de permissão por página é feita em cada page (requireStaff); aqui só montamos o menu.
  const user = await getCurrentUser();
  const items = user ? NAV.filter((n) => can(user.role, n.perm)) : [];
  return (
    <div className="min-h-dvh bg-[#f7f5f0] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin"><Logo /></Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Painel</span>
        </div>
        {user && <AdminNav items={items} />}
        {user && (
          <div className="hidden border-t border-line px-5 py-4 text-sm lg:block">
            <p className="font-semibold">{user.name}</p>
            <p className="text-[12px] text-muted">{user.role === "ADMIN" ? "Administrador" : user.role === "OPERATOR" ? "Operação" : "Cliente"}</p>
            <div className="mt-3 flex gap-4">
              <Link href="/" className="link-draw text-[13px]">Ver loja</Link>
              <form action={logoutAction}><button className="link-draw text-[13px] text-muted">Sair</button></form>
            </div>
          </div>
        )}
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-8 lg:px-10">{children}</main>
    </div>
  );
}
