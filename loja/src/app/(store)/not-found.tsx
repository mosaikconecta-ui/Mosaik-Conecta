import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="display mt-4 text-[48px] md:text-[72px]">Página não encontrada</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-2">O endereço pode ter mudado ou o produto saiu do catálogo.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/produtos">Ver produtos</ButtonLink>
        <ButtonLink href="/" variant="outline">Página inicial</ButtonLink>
      </div>
    </div>
  );
}
