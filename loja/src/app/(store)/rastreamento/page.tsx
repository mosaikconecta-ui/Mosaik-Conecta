import { pageMetadata } from "@/lib/seo";
import { TrackingForm } from "@/components/store/tracking-form";

export const metadata = pageMetadata({
  title: "Rastrear pedido",
  description: "Acompanhe seu pedido pelo número e e-mail ou pelo código de rastreamento.",
  path: "/rastreamento",
});

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  return (
    <div className="container-x max-w-3xl pt-10 md:pt-16">
      <p className="eyebrow">Rastreamento</p>
      <h1 className="display mt-3 text-[44px] md:text-[60px]">Onde está meu pedido?</h1>
      <p className="mt-4 text-ink-2">Use o número do pedido (ex.: MK-123456) e o e-mail da compra, ou o código de rastreamento enviado por e-mail.</p>
      <TrackingForm initialNumber={pedido ?? ""} />
    </div>
  );
}
