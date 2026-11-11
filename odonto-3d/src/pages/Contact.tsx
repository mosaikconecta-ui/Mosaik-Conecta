import { PageStub } from '../components/layout/PageStub'

export default function Contact() {
  return (
    <PageStub
      title="Contato"
      description="Fale com a clínica pelo WhatsApp, Instagram ou visite-nos. Agende sua avaliação."
      path="/contato"
      sections={['WhatsApp', 'Instagram', 'Endereço', 'Horários', 'Mapa', 'Agendar avaliação']}
    />
  )
}
