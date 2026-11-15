import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Dicas de segurança", alternates: { canonical: "/seguranca" } };

export default function SafetyPage() {
  return (
    <LegalPage title="Dicas de segurança na busca de emprego" updated="novembro de 2026">
      <ul>
        <li><strong>Nunca pague para participar de um processo seletivo.</strong> Cobranças de “taxa de cadastro”, cursos obrigatórios ou exames pagos são sinais de golpe.</li>
        <li>Desconfie de salários muito acima do mercado para funções simples.</li>
        <li>Não envie documentos pessoais (RG, CPF, dados bancários) antes de uma entrevista formal com a empresa.</li>
        <li>Prefira entrevistas em locais comerciais ou por videochamada com o e-mail corporativo da empresa.</li>
        <li>Empresas com o selo de verificação tiveram o CNPJ conferido pela nossa equipe.</li>
        <li>Encontrou algo suspeito? Use o botão “Denunciar vaga” na página do anúncio.</li>
      </ul>
    </LegalPage>
  );
}
