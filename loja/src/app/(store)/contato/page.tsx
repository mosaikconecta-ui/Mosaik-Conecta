import { pageMetadata } from "@/lib/seo";
import { env, integrations, store } from "@/lib/env";
import { ContactForm } from "@/components/store/contact-form";

export const metadata = pageMetadata({ title: "Contato", description: "Fale com o atendimento da Mosaik.", path: "/contato" });

export default function ContactPage() {
  return (
    <div className="container-x pt-10 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div>
          <p className="eyebrow">Atendimento</p>
          <h1 className="display mt-4 text-[44px] md:text-[60px]">Fale com a gente</h1>
          <p className="mt-5 max-w-md leading-relaxed text-ink-2">Respondemos em até 1 dia útil, de segunda a sexta, das 9h às 18h. Para pedidos, informe o número (MK-…).</p>
          <dl className="mt-8 space-y-4 text-sm">
            <div><dt className="text-muted">E-mail</dt><dd><a href={`mailto:${store.email}`} className="link-draw font-semibold">{store.email}</a></dd></div>
            {integrations.whatsapp() && <div><dt className="text-muted">WhatsApp</dt><dd><a href={`https://wa.me/${env.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="link-draw font-semibold">Conversar no WhatsApp</a></dd></div>}
            <div><dt className="text-muted">Acompanhar pedido</dt><dd><a href="/rastreamento" className="link-draw font-semibold">Rastreamento</a></dd></div>
          </dl>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
