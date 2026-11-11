/**
 * Conteúdo textual da página inicial (demonstrativo). Separado dos componentes
 * para que a troca de cliente seja apenas edição de dados.
 */
export const hero = {
  eyebrow: 'Odontologia digital · Cuidado humano',
  title: 'Sorrisos que transformam vidas.',
  subtitle: 'Tecnologia, precisão e cuidado humano para transformar a experiência de cuidar do seu sorriso.',
  highlights: ['Planejamento digital', 'Atendimento humanizado', 'Conforto em cada etapa'],
  scrollHint: 'Role para explorar',
}

export const intro = {
  eyebrow: 'A clínica',
  title: 'Precisão que se vê. Cuidado que se sente.',
  body: 'Unimos diagnóstico digital, planejamento individualizado e uma equipe atenta a cada detalhe para que você entenda, com clareza, cada passo do seu tratamento.',
  points: ['Avaliação completa e explicada', 'Planos de tratamento transparentes', 'Ambiente pensado para o seu conforto'],
}

/** Painéis da Fase 4 — o lado do texto alterna com a posição do dente. */
export const explore = [
  {
    eyebrow: 'Anatomia em detalhe',
    title: 'Cada superfície importa.',
    body: 'Sulcos, cúspides e contatos são analisados com ampliação e imagens digitais, para tratamentos que respeitam a forma natural de cada dente.',
    side: 'left' as const,
  },
  {
    eyebrow: 'Da raiz ao sorriso',
    title: 'Saúde que começa por dentro.',
    body: 'Um sorriso bonito depende de estruturas saudáveis. Por isso, olhamos além do que aparece: gengiva, raízes e osso fazem parte do plano.',
    side: 'right' as const,
  },
  {
    eyebrow: 'Estética natural',
    title: 'Brilho e forma em harmonia.',
    body: 'Materiais de alta qualidade e planejamento estético para resultados naturais — cor, textura e proporção pensadas para o seu rosto.',
    side: 'left' as const,
  },
]

export const closing = {
  eyebrow: 'Primeiro passo',
  title: 'Seu novo sorriso começa com uma conversa.',
  body: 'Agende uma avaliação e receba um plano claro, sem pressa e sem surpresas.',
}
