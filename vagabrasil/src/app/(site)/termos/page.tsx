import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updated="novembro de 2026">
      <p>Ao criar uma conta no VagaBrasil você concorda com estes termos.</p>
      <h2>1. O serviço</h2>
      <p>O VagaBrasil é uma plataforma que conecta candidatos a empresas que anunciam vagas de emprego. Não participamos das decisões de contratação.</p>
      <h2>2. Candidatos</h2>
      <ul>
        <li>O uso é gratuito. Nenhuma empresa pode cobrar valores de candidatos.</li>
        <li>Você é responsável pela veracidade das informações do seu currículo.</li>
      </ul>
      <h2>3. Empresas</h2>
      <ul>
        <li>É obrigatório informar CNPJ válido e dados verdadeiros. A plataforma pode solicitar documentos de verificação.</li>
        <li>É proibido publicar vagas falsas, cobrar candidatos, divulgar esquemas de pirâmide ou usar critérios discriminatórios (Lei 9.029/1995 e art. 373-A da CLT).</li>
        <li>Os dados dos candidatos só podem ser usados para o processo seletivo ao qual se candidataram.</li>
        <li>As assinaturas são mensais, renovadas automaticamente e podem ser canceladas a qualquer momento, permanecendo válidas até o fim do período pago.</li>
      </ul>
      <h2>4. Moderação</h2>
      <p>Podemos remover vagas e suspender contas que violem estes termos, com registro das ações administrativas.</p>
      <h2>5. Privacidade</h2>
      <p>O tratamento de dados pessoais segue a nossa Política de Privacidade.</p>
      <h2>6. Foro</h2>
      <p>Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do consumidor para questões envolvendo candidatos.</p>
    </LegalPage>
  );
}
