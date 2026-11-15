import type { AppliedBundle, ShippingQuote } from "./pricing";

export type CartLineView = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  image: string | null;
  unitCents: number;
  compareAtCents: number | null;
  quantity: number;
  lineCents: number;
  stock: number;
  unavailable: boolean;
};

export type CartView = {
  items: CartLineView[];
  itemCount: number;
  subtotalCents: number;
  bundles: AppliedBundle[];
  bundleDiscountCents: number;
  couponCode: string | null;
  couponDiscountCents: number;
  couponError: string | null;
  freeShipping: boolean;
  cep: string | null;
  shippingQuotes: ShippingQuote[];
  estimatedShippingCents: number | null;
  totalCents: number;
  freeShippingRemainingCents: number;
  warnings: string[];
};

export const EMPTY_CART: CartView = {
  items: [], itemCount: 0, subtotalCents: 0, bundles: [], bundleDiscountCents: 0, couponCode: null,
  couponDiscountCents: 0, couponError: null, freeShipping: false, cep: null, shippingQuotes: [],
  estimatedShippingCents: null, totalCents: 0, freeShippingRemainingCents: 0, warnings: [],
};
