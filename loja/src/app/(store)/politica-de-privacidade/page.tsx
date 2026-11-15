import { pageMetadata } from "@/lib/seo";
import { LegalPage, PendingLegalNote } from "@/components/store/legal-page";

export const metadata = pageMetadata({ title: "Política de privacidade", description: "Como a Mosaik trata dados pessoais conforme a LGPD.", path: "/politica-de-privacidade" });

export default function PrivacyPolicy() {
  return (
    <LegalPage eyebrow="LGPD" title="Política de privacidade" updated="15/11/2026">
      <PendingLegalNote />
      <h2>1. Quem somos</h2>
      <p>Esta política explica como a Mosaik (controladora dos dados) coleta, usa e protege dados pessoais, nos termos da Lei nº 13.709/2018 (LGPD). Contato do encarregado (DPO): atendimento@mosaik.example.</p>
      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro e compra:</strong> nome, e-mail, telefone, CPF (opcional, para pagamento e nota fiscal) e endereço de entrega.</li>
        <li><strong>Pagamento:</strong> processado pelo Mercado Pago. Não recebemos nem armazenamos número de cartão; guardamos apenas o status e o identificador da transação.</li>
        <li><strong>Navegação:</strong> cookies essenciais (sacola e login) e, somente com seu consentimento, cookies de análise e marketing (Google Analytics 4 e Meta Pixel).</li>
        <li><strong>Atendimento:</strong> mensagens enviadas pelo formulário de contato.</li>
      </ul>
      <h2>3. Finalidades e bases legais</h2>
      <ul>
        <li>Processar pedidos, entregas, trocas e emissão fiscal — execução de contrato e obrigação legal.</li>
        <li>Enviar atualizações do pedido e lembrete de sacola abandonada — execução de contrato e legítimo interesse (você pode se opor a qualquer momento).</li>
        <li>Newsletter e ofertas — consentimento, revogável em cada e-mail.</li>
        <li>Prevenção a fraudes e segurança — legítimo interesse.</li>
        <li>Métricas de navegação e anúncios — consentimento.</li>
      </ul>
      <h2>4. Compartilhamento</h2>
      <p>Compartilhamos apenas o necessário com: gateway de pagamento (Mercado Pago), fornecedores parceiros que enviam os produtos (nome, endereço, telefone e itens do pedido), transportadoras, provedor de e-mail transacional e serviços de hospedagem. Não vendemos dados pessoais.</p>
      <h2>5. Retenção</h2>
      <p>Dados de pedidos são mantidos pelo prazo exigido pela legislação fiscal e de consumo (em geral, 5 anos). Dados de conta são mantidos enquanto a conta existir. Sacolas abandonadas são descartadas após 90 dias.</p>
      <h2>6. Seus direitos</h2>
      <p>Você pode confirmar a existência de tratamento, acessar, corrigir, exportar (portabilidade), solicitar anonimização ou eliminação e revogar consentimentos. Na sua conta, em “Privacidade e dados”, é possível exportar os dados e excluir a conta. Outras solicitações: atendimento@mosaik.example.</p>
      <h2>7. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), senhas armazenadas com hash forte (scrypt), controle de acesso por perfil no painel administrativo, registros de auditoria e validação de notificações de pagamento.</p>
      <h2>8. Cookies</h2>
      <p>Você pode alterar sua escolha a qualquer momento pelo link “Preferências de cookies” no rodapé.</p>
    </LegalPage>
  );
}
