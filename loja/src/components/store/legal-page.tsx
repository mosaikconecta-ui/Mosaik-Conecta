import Link from "next/link";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow?: string; title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-x pt-10 md:pt-16">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Trilha" className="text-[13px] text-muted"><Link href="/" className="link-draw">Início</Link> / <span className="text-ink">{title}</span></nav>
        {eyebrow && <p className="eyebrow mt-8">{eyebrow}</p>}
        <h1 className="display mt-3 text-[44px] md:text-[60px]">{title}</h1>
        {updated && <p className="mt-3 text-sm text-muted">Última atualização: {updated}</p>}
        <div className="prose-store mt-10 text-[16px]">{children}</div>
      </div>
    </div>
  );
}

export function PendingLegalNote() {
  return (
    <p className="border border-[#d9b871] bg-[#faf1dc] p-4 text-sm text-[#5c4210]">
      Modelo de texto preparado para a operação. Antes de publicar, preencha razão social, CNPJ, endereço e o contato do encarregado (DPO), e faça a revisão jurídica.
    </p>
  );
}
