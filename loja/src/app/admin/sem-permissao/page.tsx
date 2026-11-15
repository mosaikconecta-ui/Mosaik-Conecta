import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function NoPermission() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-semibold">Acesso restrito</h1>
      <p className="mt-3 text-muted">{user ? "Seu perfil não tem permissão para acessar esta área." : "Entre com uma conta autorizada."}</p>
      <Link href={user ? "/" : "/conta/entrar?next=/admin"} className="mt-6 inline-block underline">{user ? "Voltar para a loja" : "Entrar"}</Link>
    </div>
  );
}
