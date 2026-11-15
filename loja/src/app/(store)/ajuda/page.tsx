import Link from "next/link";
import { pageMetadata, JsonLd } from "@/lib/seo";
import { LegalPage } from "@/components/store/legal-page";

export const metadata = pageMetadata({ title: "Perguntas frequentes", description: "Prazos, frete, pagamento, trocas e cuidados com os produtos.", path: "/ajuda" });

const faq: [string, string, React.ReactNode?][] = [
  ["Qual é o prazo de entrega?", "O prazo total é a soma do tempo de separação (informado em cada produto) com o transporte da modalidade escolhida. Você vê a estimativa exata na página do produto e no checkout, informando o CEP. O prazo conta a partir da aprovação do pagamento."],
  ["Por que alguns produtos têm prazos diferentes?", "Trabalhamos com fornecedores parceiros que enviam diretamente para você. Cada fornecedor tem seu próprio tempo de separação. Se o pedido tiver itens de fornecedores diferentes, eles podem chegar em pacotes separados, cada um com seu código de rastreamento."],
  ["Quanto custa o frete?", "O frete é calculado pelo CEP e pelo peso. Na modalidade Econômica, compras acima de R$ 299 têm frete grátis para todo o Brasil."],
  ["Quais formas de pagamento são aceitas?", "Pix, cartão de crédito em até 6× sem juros e boleto, processados pelo Mercado Pago. Não armazenamos dados de cartão."],
  ["Quando meu pedido é confirmado?", "Pix costuma ser confirmado em instantes, cartão em poucos minutos e boleto em até 3 dias úteis após o pagamento. Você recebe um e-mail a cada etapa."],
  ["Como acompanho meu pedido?", "Pela página de Rastreamento, com o número do pedido e o e-mail, ou pela sua conta. Assim que o pedido é postado, enviamos o código de rastreamento."],
  ["Posso trocar ou devolver?", "Sim. Você tem 7 dias corridos após o recebimento para desistir da compra, com reembolso integral, conforme o Código de Defesa do Consumidor.", <Link key="l" href="/trocas-e-devolucoes" className="underline">Veja como solicitar</Link>],
  ["O produto chegou quebrado. E agora?", "Fotografe a embalagem e o produto e nos escreva em até 7 dias pelo formulário de contato. Enviamos uma nova peça ou fazemos o reembolso, sem custo para você."],
  ["As peças de cerâmica são todas iguais?", "Não. A cerâmica artesanal tem pequenas variações de cor, pintas e formato — isso faz parte do material e não é defeito."],
  ["Como cuido da cerâmica e da pedra?", "Cerâmica esmaltada vai à lava-louças quando indicado. Peças foscas e pedras naturais devem ser limpas com pano úmido, sem produtos ácidos."],
];

export default function FaqPage() {
  return (
    <LegalPage eyebrow="Ajuda" title="Perguntas frequentes">
      <div className="not-prose divide-y divide-line border-y border-line">
        {faq.map(([q, a, extra]) => (
          <details key={q} className="group py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold text-ink">{q}<span className="text-xl transition-transform group-open:rotate-45">+</span></summary>
            <p className="pb-3">{a} {extra}</p>
          </details>
        ))}
      </div>
      <p className="mt-10">Não encontrou o que procurava? <Link href="/contato">Fale com a gente</Link>.</p>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }} />
    </LegalPage>
  );
}
