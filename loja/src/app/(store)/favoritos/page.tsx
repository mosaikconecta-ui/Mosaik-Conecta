import { pageMetadata } from "@/lib/seo";
import { FavoritesList } from "@/components/store/favorites-list";

export const metadata = pageMetadata({ title: "Favoritos", description: "Produtos que você salvou.", path: "/favoritos", noindex: true });

export default function FavoritesPage() {
  return (
    <div className="container-x pt-10 md:pt-14">
      <h1 className="display text-[44px] md:text-[60px]">Favoritos</h1>
      <p className="mt-3 text-ink-2">Salvos neste navegador. Toque no coração de qualquer produto para adicionar.</p>
      <div className="mt-10"><FavoritesList /></div>
    </div>
  );
}
