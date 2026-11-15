import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { getBestsellers, getCategories, getNewArrivals, getTestimonials } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading, Stars } from "@/components/ui/misc";
import { pageMetadata } from "@/lib/seo";
import { cardSelect } from "@/lib/catalog";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Mosaik — Cerâmica, luz e mesa posta para a sua casa",
  description: "Vasos de grés, canecas, luminárias, velas e objetos de pedra. Frete grátis acima de R$ 299, Pix e cartão em até 6× sem juros.",
  path: "/",
});

const CATEGORY_IMAGES: Record<string, string> = {
  ceramica: "/products/vaso-duna-areia-1.jpg",
  "mesa-posta": "/products/caneca-aurora-par.jpg",
  iluminacao: "/products/luminaria-farol-latao-1.jpg",
  aromas: "/products/vela-atelie-trio.jpg",
  objetos: "/products/bandeja-travertino-cena.jpg",
};

export default async function HomePage() {
  const [best, fresh, categories, testimonials, lamp] = await Promise.all([
    getBestsellers(4),
    getNewArrivals(4),
    getCategories(),
    getTestimonials(),
    db.product.findFirst({ where: { slug: "luminaria-farol", status: "ACTIVE" }, select: cardSelect }),
  ]);

  return (
    <>
      {/* 1 · Hero */}
      <section className="relative">
        <div className="container-x grid gap-8 pb-10 pt-10 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:pb-14">
          <div className="animate-rise">
            <p className="eyebrow">Coleção de casa · Outono 2026</p>
            <h1 className="display mt-5 text-[44px] sm:text-[60px] lg:text-[84px]">
              Cerâmica, luz e mesa posta <em className="text-clay">para a sua casa</em>
            </h1>
          </div>
          <div className="animate-rise [animation-delay:120ms] lg:pb-3">
            <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
              Vasos de grés, canecas, luminárias e aromas escolhidos para durar. Frete grátis acima de R$ 299 e pagamento em até 6× sem juros.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/produtos" size="lg">Ver a coleção <ArrowRight size={18} /></ButtonLink>
              <ButtonLink href="/categoria/ceramica" size="lg" variant="outline">Comprar cerâmica</ButtonLink>
            </div>
          </div>
        </div>
        <div className="container-x">
          <div className="relative aspect-[4/5] animate-[fade_1.2s_ease_both] overflow-hidden bg-paper-2 sm:aspect-[16/9] lg:aspect-[21/9]">
            <Image src="/products/hero-colecao.jpg" alt="Vaso Duna argila sobre pedestal, Vaso Seixo, vela acesa e castiçal de latão" fill priority sizes="100vw" quality={90} className="object-cover object-[35%_50%]" />
          </div>
        </div>
      </section>

      {/* 2 · Categorias */}
      <section className="container-x pt-24 md:pt-32">
        <SectionHeading eyebrow="Categorias" title="Por onde começar" />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-5">
          {categories.map((c, i) => (
            <li key={c.id} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
              <Link href={`/categoria/${c.slug}`} className="group lift relative block">
                <div className={`zoom-frame relative bg-paper-2 ${i === 0 ? "aspect-[16/10] md:aspect-[4/5]" : "aspect-[4/5]"}`}>
                  <Image src={c.image ?? CATEGORY_IMAGES[c.slug] ?? "/products/vaso-duna-areia-1.jpg"} alt="" fill sizes="(min-width:1024px) 20vw, 50vw" className="object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/55 to-transparent p-4 pt-16 text-paper">
                    <span className="font-serif text-[24px] leading-none md:text-[28px]">{c.name}</span>
                    <span className="text-[12px] tabular-nums opacity-80">{c._count.products}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · Mais vendidos (dados reais) ou seleção da curadoria */}
      <section className="container-x pt-24 md:pt-32">
        <SectionHeading
          eyebrow={best.isRealData ? "Mais vendidos" : "Seleção da casa"}
          title={best.isRealData ? "Os favoritos dos clientes" : "Escolhas da curadoria"}
          action={<Link href="/produtos" className="link-draw hidden text-sm font-semibold sm:inline">Ver todos</Link>}
        />
        <ProductGrid products={best.items} />
      </section>

      {/* 4 · Campanha editorial */}
      <section className="pt-24 md:pt-32">
        <div className="container-x">
          <div className="grid overflow-hidden bg-paper-2 lg:grid-cols-[1.5fr_1fr]">
            <div className="zoom-frame relative aspect-[4/3] lg:aspect-auto lg:min-h-[560px]">
              <Image src="/products/cena-mesa-posta.jpg" alt="Mesa posta com prato Orla, bowl Maré, caneca Aurora e copo Brisa" fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center p-8 md:p-14">
              <p className="eyebrow">Combo Café da manhã</p>
              <h2 className="display mt-4 text-[38px] md:text-[52px]">Mesa posta em grés, peça por peça</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-ink-2">
                Caneca Aurora, bowls Maré e pratos Orla têm o mesmo esmalte acetinado. Levando os três juntos, o carrinho aplica 10% de desconto automaticamente.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/categoria/mesa-posta">Comprar mesa posta</ButtonLink>
                <ButtonLink href="/produto/caneca-aurora" variant="outline">Ver a caneca</ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 · Novidades */}
      <section className="container-x pt-24 md:pt-32">
        <SectionHeading eyebrow="Novidades" title="Acabaram de chegar" action={<Link href="/produtos?ordem=novidades" className="link-draw hidden text-sm font-semibold sm:inline">Ver novidades</Link>} />
        <ProductGrid products={fresh} />
      </section>

      {/* 6 · Produto em destaque */}
      {lamp && (
        <section className="pt-24 md:pt-32">
          <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <p className="eyebrow">Em destaque</p>
              <h2 className="display mt-4 text-[38px] md:text-[52px]">Luz quente para ler, jantar e desacelerar</h2>
              <p className="mt-5 max-w-md leading-relaxed text-ink-2">A Luminária Farol direciona a luz para baixo e não ofusca. Bivolt, em latão escovado ou preto fosco.</p>
              <div className="mt-8 max-w-[300px]"><ProductCard product={lamp} sizes="300px" /></div>
            </div>
            <div className="zoom-frame relative order-1 aspect-[16/10] bg-paper-2 lg:order-2">
              <Image src="/products/cena-iluminacao.jpg" alt="Luminárias Lua e Farol acesas" fill sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* 7 · Benefícios */}
      <section className="container-x pt-24 md:pt-32" aria-label="Benefícios">
        <ul className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Frete grátis acima de R$ 299", text: "Para todo o Brasil, com código de rastreamento." },
            { icon: ShieldCheck, title: "Pagamento protegido", text: "Pix, cartão em até 6× sem juros ou boleto via Mercado Pago." },
            { icon: RefreshCcw, title: "Troca em até 7 dias", text: "Arrependimento garantido pelo Código de Defesa do Consumidor." },
            { icon: Package, title: "Embalagem reforçada", text: "Peças frágeis viajam com proteção extra e seguro." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-paper p-7">
              <Icon size={24} strokeWidth={1.4} className="text-clay" />
              <p className="mt-5 font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 8 · Depoimentos — exibidos somente quando existem avaliações verificadas aprovadas */}
      {testimonials.length > 0 && (
        <section className="container-x pt-24 md:pt-32">
          <SectionHeading eyebrow="Compras verificadas" title="Quem comprou conta" />
          <ul className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.id} className="border border-line bg-surface p-7">
                <Stars value={t.rating} />
                {t.title && <p className="mt-4 font-semibold">{t.title}</p>}
                <p className="mt-2 leading-relaxed text-ink-2">“{t.body}”</p>
                <p className="mt-5 text-sm text-muted">{t.authorName} · <Link href={`/produto/${t.product.slug}`} className="underline underline-offset-2">{t.product.name}</Link></p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
