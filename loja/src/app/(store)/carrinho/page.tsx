import { getCart } from "@/lib/cart";
import { getCartSuggestions } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { CartPage } from "@/components/store/cart-page";
import { ProductGrid } from "@/components/store/product-card";
import { SectionHeading } from "@/components/ui/misc";

export const metadata = pageMetadata({ title: "Sacola", description: "Revise os itens da sua sacola.", path: "/carrinho", noindex: true });

export default async function CarrinhoPage() {
  const cart = await getCart();
  const suggestions = await getCartSuggestions([...new Set(cart?.items.map((i) => i.variant.productId) ?? [])], 4);
  return (
    <div className="container-x pt-10 md:pt-14">
      <h1 className="display mb-10 text-[44px] md:text-[60px]">Sacola</h1>
      <CartPage />
      <section className="mt-24">
        <SectionHeading eyebrow="Complete seu pedido" title="Combina com o que você escolheu" />
        <ProductGrid products={suggestions} />
      </section>
    </div>
  );
}
