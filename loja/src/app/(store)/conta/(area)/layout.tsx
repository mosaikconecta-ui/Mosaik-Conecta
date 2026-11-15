import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x pt-10 md:pt-14">
      <p className="eyebrow">Minha conta</p>
      <h1 className="display mt-3 text-[40px] md:text-[54px]">Olá, {user.name.split(" ")[0]}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <aside>
          <AccountNav />
          <form action={logoutAction} className="mt-6 border-t border-line pt-4">
            <button className="link-draw text-sm text-muted">Sair</button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
