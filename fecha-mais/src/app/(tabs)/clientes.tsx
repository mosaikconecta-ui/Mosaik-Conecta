import { Card, EmptyState, PreviewNotice, Screen } from '@/components/ui';

export default function ClientsScreen() {
  return (
    <Screen title="Clientes" subtitle="Sua carteira de contatos e oportunidades.">
      <PreviewNotice message="Cadastro, edição, busca e exclusão de clientes chegam na Etapa 3." />
      <Card>
        <EmptyState
          icon="people-outline"
          title="Nenhum cliente cadastrado"
          description="Aqui você vai ver nome, telefone, empresa e o status comercial de cada cliente."
        />
      </Card>
    </Screen>
  );
}
