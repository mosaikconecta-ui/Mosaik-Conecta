import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Candidatos",
    links: [
      ["/vagas", "Buscar vagas"],
      ["/vagas/remotas", "Vagas remotas"],
      ["/cadastro", "Cadastrar currículo"],
      ["/entrar", "Entrar"],
      ["/#como-funciona", "Como funciona"],
    ],
  },
  {
    title: "Empresas",
    links: [
      ["/planos", "Planos e preços"],
      ["/cadastro/empresa", "Cadastrar empresa"],
      ["/empresas", "Empresas contratando"],
      ["/entrar?redirect=/empresa", "Área da empresa"],
    ],
  },
  {
    title: "Áreas",
    links: [
      ["/vagas/comercio-varejo", "Comércio e Varejo"],
      ["/vagas/logistica", "Logística"],
      ["/vagas/atendimento", "Atendimento"],
      ["/vagas/administrativo", "Administrativo"],
    ],
  },
  {
    title: "Institucional",
    links: [
      ["/termos", "Termos de uso"],
      ["/privacidade", "Política de privacidade"],
      ["/privacidade#seus-direitos", "Seus direitos (LGPD)"],
      ["/seguranca", "Dicas de segurança"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-200">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo inverted />
            <p className="mt-4 text-sm leading-relaxed text-navy-300">
              Portal de empregos que conecta profissionais e empresas em todo o Brasil. Gratuito para candidatos.
            </p>
            <p className="mt-4 rounded-lg border border-navy-800 bg-navy-900/60 p-3 text-xs leading-relaxed text-navy-300">
              O VagaBrasil nunca cobra taxas de candidatos. Desconfie de qualquer pedido de pagamento para participar de processos seletivos.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-sm text-navy-300 hover:text-white">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-navy-800 pt-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} VagaBrasil. Todos os direitos reservados.</p>
          <p>Valores em Real (BRL). Dados tratados conforme a LGPD (Lei 13.709/2018).</p>
        </div>
      </div>
    </footer>
  );
}
