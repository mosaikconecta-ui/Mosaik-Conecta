import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { ProfileForm } from "@/components/account/account-forms";

export const metadata = pageMetadata({ title: "Dados pessoais", description: "Seus dados.", path: "/conta/dados", noindex: true });

export default async function ProfilePage() {
  const u = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, phone: true, cpf: true, marketingOptIn: true } });
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Dados pessoais</h2>
      <ProfileForm user={user} />
      <p className="mt-8 text-sm text-muted">Para trocar a senha, use <a href="/conta/recuperar-senha" className="underline underline-offset-2">recuperar senha</a>; enviaremos um link para o seu e-mail.</p>
    </div>
  );
}
