import type { Metadata } from "next";
import { env, store } from "./env";

export const absoluteUrl = (path = "/") => `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export function pageMetadata(opts: { title: string; description: string; path: string; image?: string; noindex?: boolean }): Metadata {
  const image = opts.image ?? "/products/hero-colecao.jpg";
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: absoluteUrl(opts.path) },
    openGraph: { title: opts.title, description: opts.description, url: absoluteUrl(opts.path), siteName: store.name, locale: "pt_BR", type: "website", images: [{ url: image }] },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image] },
    ...(opts.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: store.name,
    url: env.siteUrl,
    logo: absoluteUrl("/icon.svg"),
    email: store.email,
    currenciesAccepted: "BRL",
    areaServed: "BR",
    potentialAction: { "@type": "SearchAction", target: `${env.siteUrl}/produtos?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

type ProductLd = {
  name: string; slug: string; description: string; images: string[]; sku: string; category?: string | null;
  priceCents: number; inStock: boolean; rating?: { avg: number; count: number }; shippingDaysMax?: number;
};

export function productJsonLd(p: ProductLd) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description.slice(0, 500),
    image: p.images.map((i) => absoluteUrl(i)),
    sku: p.sku,
    brand: { "@type": "Brand", name: store.name },
    ...(p.category ? { category: p.category } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produto/${p.slug}`),
      priceCurrency: "BRL",
      price: (p.priceCents / 100).toFixed(2),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: store.returnDays,
        returnMethod: "https://schema.org/ReturnByMail",
      },
      ...(p.shippingDaysMax
        ? { shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: "BR" }, deliveryTime: { "@type": "ShippingDeliveryTime", transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: p.shippingDaysMax, unitCode: "DAY" } } } }
        : {}),
    },
    // só inclui avaliações quando existem avaliações verificadas reais
    ...(p.rating && p.rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.avg.toFixed(1), reviewCount: p.rating.count } }
      : {}),
  };
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
