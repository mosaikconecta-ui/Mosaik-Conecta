import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { NewsletterForm } from "./newsletter";
import { ConsentReopen } from "./consent";

const cols = [
  { title: "Loja", links: [["Todos os produtos", "/produtos"], ["Novidades", "/produtos?ordem=novidades"], ["Favoritos", "/favoritos"], ["Rastrear pedido", "/rastreamento"]] },
  { title: "Ajuda", links: [["Perguntas frequentes", "/ajuda"], ["Política de entrega", "/politica-de-entrega"], ["Trocas e devoluções", "/trocas-e-devolucoes"], ["Fale conosco", "/contato"]] },
  { title: "Mosaik", links: [["Sobre nós", "/sobre"], ["Minha conta", "/conta"], ["Termos de uso", "/termos-de-uso"], ["Política de privacidade", "/politica-de-privacidade"]] },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-x grid gap-14 py-16 md:py-20 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo inverted />
          <p className="mt-6 max-w-sm font-serif text-[26px] leading-tight">Lançamentos, reposições e ofertas da semana no seu e-mail.</p>
          <div className="mt-6"><NewsletterForm dark /></div>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-paper/55">{c.title}</p>
              <ul className="space-y-3 text-[14px]">
                {c.links.map(([label, href]) => <li key={href}><Link href={href} className="link-draw">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-[12px] text-paper/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Mosaik · Dados da empresa (razão social e CNPJ) a preencher antes da operação · atendimento@mosaik.example</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Pagamentos: Pix · Cartão · Boleto via Mercado Pago</span>
            <ConsentReopen />
          </div>
        </div>
        <p className="container-x pb-6 text-[11px] text-paper/40">Imagens de produto: renderizações 3D de demonstração geradas para este projeto.</p>
      </div>
    </footer>
  );
}
