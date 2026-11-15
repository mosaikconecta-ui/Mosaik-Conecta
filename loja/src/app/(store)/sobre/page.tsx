import Image from "next/image";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/button";

export const metadata = pageMetadata({ title: "Sobre nós", description: "A Mosaik seleciona objetos de casa feitos para durar: cerâmica, luz, mesa posta e aromas.", path: "/sobre" });

export default function AboutPage() {
  return (
    <div className="container-x pt-10 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Sobre nós</p>
          <h1 className="display mt-4 text-[44px] md:text-[64px]">Poucos objetos, bem escolhidos</h1>
          <div className="prose-store mt-8 max-w-xl text-[17px]">
            <p>A Mosaik nasceu para facilitar a escolha de objetos de casa que duram: cerâmica de alta queima, vidro resistente, metal maciço e cera vegetal. Trabalhamos com uma curadoria curta, em que cada peça tem função clara e combina com as demais.</p>
            <p>Operamos com fornecedores parceiros que enviam diretamente para você. Isso nos permite manter um catálogo cuidado sem estoque parado — e repassar preços justos. Cada fornecedor é avaliado em qualidade, embalagem e prazo antes de entrar na loja.</p>
            <p>Somos transparentes sobre prazos: na página de cada produto você vê o tempo de separação e de transporte antes de comprar.</p>
          </div>
          <ButtonLink href="/produtos" className="mt-8">Conhecer a coleção</ButtonLink>
        </div>
        <div className="relative aspect-[4/5] bg-paper-2">
          <Image src="/products/vaso-duna-trio.jpg" alt="Três vasos Duna em argila, areia e grafite" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </div>
    </div>
  );
}
