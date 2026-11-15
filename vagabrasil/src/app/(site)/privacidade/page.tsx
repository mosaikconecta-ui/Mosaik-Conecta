import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updated="novembro de 2026">
      <p>
        Esta política explica como o VagaBrasil trata dados pessoais de candidatos, recrutadores e visitantes, em conformidade com a
        Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
      </p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail, senha (armazenada com hash), telefone (opcional), cidade e estado.</li>
        <li><strong>Currículo:</strong> resumo profissional, experiências, formação, habilidades, idiomas, preferências e arquivos PDF enviados por você.</li>
        <li><strong>Empresas:</strong> razão social, nome fantasia, CNPJ, contatos corporativos, endereço e documentos de verificação.</li>
        <li><strong>Uso:</strong> candidaturas, vagas salvas, registros de acesso e dados técnicos necessários à segurança (como endereço IP).</li>
        <li><strong>Pagamentos:</strong> processados pelo Mercado Pago. Não armazenamos números de cartão.</li>
      </ul>
      <h2>2. Finalidades e bases legais</h2>
      <ul>
        <li>Executar o serviço de intermediação entre candidatos e empresas (execução de contrato — art. 7º, V).</li>
        <li>Prevenir fraudes e garantir a segurança da plataforma (legítimo interesse — art. 7º, IX).</li>
        <li>Cumprir obrigações legais e fiscais (art. 7º, II).</li>
        <li>Enviar alertas de vagas e comunicações de marketing apenas com seu consentimento, revogável a qualquer momento (art. 7º, I).</li>
      </ul>
      <h2>3. Compartilhamento</h2>
      <p>
        Seu currículo <strong>não é público</strong>. Ele só é compartilhado com as empresas para as quais você se candidatar, que o
        acessam por links temporários. Você pode ocultar seu telefone das empresas nas configurações de privacidade. Utilizamos
        operadores de infraestrutura (hospedagem, banco de dados, e-mail e pagamentos) que tratam dados sob nossas instruções.
      </p>
      <h2>4. Não discriminação</h2>
      <p>
        O VagaBrasil não solicita nem utiliza dados como idade, gênero, raça, religião, estado civil, orientação sexual ou deficiência
        para classificar candidatos. Anúncios com critérios discriminatórios são bloqueados e removidos.
      </p>
      <h2>5. Retenção de dados</h2>
      <ul>
        <li>Dados de conta e currículo: enquanto a conta estiver ativa.</li>
        <li>Contas sem acesso por 24 meses: notificadas e, sem resposta, excluídas.</li>
        <li>Notificações: 180 dias. Registros técnicos de segurança: até 6 meses (Marco Civil da Internet, art. 15).</li>
        <li>Registros financeiros: 5 anos, para cumprimento de obrigações fiscais.</li>
        <li>Após a exclusão da conta, os dados são apagados em até 30 dias, exceto quando houver obrigação legal de guarda.</li>
      </ul>
      <h2 id="seus-direitos">6. Seus direitos</h2>
      <p>Você pode, a qualquer momento, diretamente pelo painel:</p>
      <ul>
        <li>Acessar e corrigir seus dados;</li>
        <li>Exportar uma cópia dos seus dados (portabilidade);</li>
        <li>Revogar consentimentos de comunicação;</li>
        <li>Excluir sua conta e seus dados.</li>
      </ul>
      <p>Para outras solicitações, entre em contato com nosso encarregado de dados pelo e-mail privacidade@vagabrasil.com.br.</p>
      <h2>7. Segurança</h2>
      <p>
        Utilizamos criptografia em trânsito (HTTPS), controle de acesso por perfil com políticas de segurança no banco de dados,
        armazenamento privado de currículos e registro de ações administrativas.
      </p>
    </LegalPage>
  );
}
