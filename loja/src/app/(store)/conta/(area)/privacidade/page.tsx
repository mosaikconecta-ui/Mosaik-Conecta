import { pageMetadata } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/button";
import { DeleteAccountForm } from "@/components/account/account-forms";

export const metadata = pageMetadata({ title: "Privacidade e dados", description: "Seus direitos LGPD.", path: "/conta/privacidade", noindex: true });

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h2 className="text-xl font-semibold">Seus direitos (LGPD)</h2>
        <p className="mt-3 leading-relaxed text-ink-2">Você pode acessar, corrigir, exportar e solicitar a eliminação dos seus dados pessoais a qualquer momento. Detalhes na <a href="/politica-de-privacidade" className="underline underline-offset-2">Política de privacidade</a>.</p>
      </section>
      <section>
        <h3 className="font-semibold">Exportar meus dados</h3>
        <p className="mt-2 text-sm text-ink-2">Baixe um arquivo JSON com seu cadastro, endereços e pedidos.</p>
        <ButtonLink href="/api/conta/exportar" variant="outline" className="mt-4" prefetch={false}>Baixar meus dados</ButtonLink>
      </section>
      <section>
        <h3 className="font-semibold">Excluir minha conta</h3>
        <p className="mb-4 mt-2 text-sm text-ink-2">Remove seus dados pessoais e encerra o acesso. Pedidos em andamento continuam sendo entregues.</p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
