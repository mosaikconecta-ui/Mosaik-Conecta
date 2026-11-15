import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/store/legal-page";

export const metadata = pageMetadata({ title: "Política de entrega", description: "Prazos, frete grátis, rastreamento e entregas de fornecedores parceiros.", path: "/politica-de-entrega" });

export default function ShippingPolicy() {
  return (
    <LegalPage eyebrow="Ajuda" title="Política de entrega" updated="15/11/2026">
      <h2>Como funciona</h2>
      <p>Os produtos da Mosaik são enviados por fornecedores parceiros diretamente para o seu endereço. O prazo de entrega é formado por duas etapas:</p>
      <ul>
        <li><strong>Separação e postagem:</strong> de 1 a 3 dias úteis após a aprovação do pagamento, conforme o fornecedor (informado na página do produto).</li>
        <li><strong>Transporte:</strong> conforme a modalidade e a região. O prazo estimado aparece no checkout antes do pagamento.</li>
      </ul>
      <h2>Modalidades</h2>
      <ul>
        <li><strong>Econômica:</strong> frete grátis para compras acima de R$ 299.</li>
        <li><strong>Expressa:</strong> prioridade no transporte, com valor calculado pelo CEP e peso.</li>
      </ul>
      <h2>Pedidos com mais de um fornecedor</h2>
      <p>Se a sua compra tiver itens de fornecedores diferentes, você poderá receber mais de um pacote, cada um com seu código de rastreamento. Todos aparecem na página do pedido.</p>
      <h2>Rastreamento</h2>
      <p>Enviamos o código por e-mail assim que o pedido é postado. Você também pode consultar em <a href="/rastreamento">Rastreamento</a>.</p>
      <h2>Ausência no endereço e endereço incorreto</h2>
      <p>A transportadora faz até 3 tentativas. Se o pedido retornar por endereço incorreto ou ausência, entraremos em contato para combinar um novo envio (o novo frete pode ser cobrado).</p>
      <h2>Atrasos</h2>
      <p>Se o prazo informado for ultrapassado, fale com a gente. Acompanhamos o caso com o fornecedor e a transportadora e, se o pedido for extraviado, enviamos um novo ou reembolsamos.</p>
    </LegalPage>
  );
}
