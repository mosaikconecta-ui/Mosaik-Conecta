import { pageMetadata } from "@/lib/seo";
import { LegalPage, PendingLegalNote } from "@/components/store/legal-page";

export const metadata = pageMetadata({ title: "Termos de uso", description: "Condições de uso da loja Mosaik.", path: "/termos-de-uso" });

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Institucional" title="Termos de uso" updated="15/11/2026">
      <PendingLegalNote />
      <h2>1. Aceitação</h2>
      <p>Ao usar este site e realizar compras, você concorda com estes termos, com a Política de privacidade e com a Política de trocas.</p>
      <h2>2. Cadastro</h2>
      <p>Você é responsável pela veracidade dos dados informados e pela guarda da sua senha. Contas com indícios de fraude podem ser suspensas.</p>
      <h2>3. Preços, ofertas e estoque</h2>
      <p>Preços e condições valem para compras online e podem mudar sem aviso, respeitados os pedidos já confirmados. O estoque é sincronizado com nossos fornecedores; em caso raro de indisponibilidade após a compra, avisaremos e você poderá escolher outro produto ou o reembolso integral.</p>
      <h2>4. Pagamento</h2>
      <p>Pagamentos são processados pelo Mercado Pago. O pedido é confirmado somente após a aprovação do pagamento. Pedidos não pagos são cancelados automaticamente após 3 dias.</p>
      <h2>5. Entrega</h2>
      <p>Prazos são estimativas a partir da aprovação do pagamento, conforme a Política de entrega.</p>
      <h2>6. Propriedade intelectual</h2>
      <p>Textos, imagens, marca e layout pertencem à Mosaik ou a seus licenciantes e não podem ser reproduzidos sem autorização.</p>
      <h2>7. Foro</h2>
      <p>Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do consumidor.</p>
    </LegalPage>
  );
}
