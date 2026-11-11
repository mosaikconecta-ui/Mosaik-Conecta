import { PageStub } from '../components/layout/PageStub'

export default function About() {
  return (
    <PageStub
      title="Sobre a clínica"
      description="Conheça a história, a missão e a estrutura de uma clínica pensada para o seu conforto."
      path="/sobre"
      sections={['História', 'Missão e valores', 'Estrutura', 'Equipe', 'Diferenciais']}
    />
  )
}
