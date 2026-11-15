import { pageMetadata } from "@/lib/seo";
import { LegalPage, PendingLegalNote } from "@/components/store/legal-page";

export const metadata = pageMetadata({ title: "Trocas e devoluções", description: "Arrependimento em 7 dias, produtos com defeito e reembolsos.", path: "/trocas-e-devolucoes" });

export default function ReturnsPage() {
  return (
    <LegalPage eyebrow="Ajuda" title="Trocas e devoluções" updated="15/11/2026">
      <PendingLegalNote />
      <h2>Direito de arrependimento (7 dias)</h2>
      <p>Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos após o recebimento, sem precisar justificar. O produto deve ser devolvido sem sinais de uso, preferencialmente na embalagem original. O frete de devolução é por nossa conta.</p>
      <h2>Produto com defeito ou avariado no transporte</h2>
      <p>Escreva para nós em até 7 dias após o recebimento com fotos do produto e da embalagem. Você escolhe entre uma nova peça (sujeito a disponibilidade) ou o reembolso integral. Para vícios ocultos, o prazo é de 90 dias (art. 26 do CDC).</p>
      <h2>Como solicitar</h2>
      <ul>
        <li>Acesse <a href="/contato">Contato</a> e escolha “Troca ou devolução”, informando o número do pedido.</li>
        <li>Enviaremos as instruções e o código de postagem reversa em até 2 dias úteis.</li>
        <li>Como nossos produtos são enviados por fornecedores parceiros, o endereço de devolução pode variar — use sempre o informado no atendimento.</li>
      </ul>
      <h2>Reembolso</h2>
      <p>Após recebermos e conferirmos o produto, o reembolso é feito pelo mesmo meio de pagamento: Pix e boleto em até 5 dias úteis; cartão de crédito conforme o ciclo da operadora (pode aparecer em até 2 faturas).</p>
      <h2>Variações naturais</h2>
      <p>Peças artesanais de cerâmica e pedra natural têm variações de cor, textura e pintas. Essas diferenças não caracterizam defeito.</p>
    </LegalPage>
  );
}
