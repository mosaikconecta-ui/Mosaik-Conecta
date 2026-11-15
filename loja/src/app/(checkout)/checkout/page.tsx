import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCartView } from "@/lib/cart";
import { db } from "@/lib/db";
import { integrations } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata = pageMetadata({ title: "Checkout", description: "Finalize sua compra.", path: "/checkout", noindex: true });

export default async function CheckoutPage() {
  const cart = await getCartView();
  if (cart.items.length === 0) redirect("/carrinho");
  const user = await getCurrentUser();
  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  return (
    <div className="container-x pt-8 md:pt-12">
      <h1 className="display mb-8 text-[40px] md:text-[52px]">Finalizar compra</h1>
      <CheckoutForm
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "", cpf: user.cpf ?? "" } : null}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, cep: a.cep, street: a.street, number: a.number, complement: a.complement ?? "", district: a.district, city: a.city, state: a.state }))}
        paymentReady={integrations.mercadoPago()}
      />
    </div>
  );
}
