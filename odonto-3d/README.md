# Alvéa Odontologia — template premium 3D

Site odontológico multipáginas com hero cinematográfica em WebGL. **Marca,
textos e dados são fictícios/demonstrativos.** Feito para ser personalizado e
revendido a clínicas reais.

Stack: React 19 · TypeScript · Vite · React Router · Tailwind CSS 4 · Three.js ·
React Three Fiber · Drei · GSAP + ScrollTrigger · Lucide.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # checagem de tipos + build de produção em dist/
npm run preview      # serve o build
npm run model:generate   # regenera public/models/tooth.glb (~45 s)
```

Inspeção do modelo (somente em dev): `http://localhost:5173/tools/model-viewer.html`
(`?view=front|side|top|roots`), com órbita, zoom e wireframe.

## Status por etapa

| Etapa | Status |
|---|---|
| 1. Preparação (arquitetura, tokens, configuração) | ✅ |
| 2. Hero 3D (modelo, material, luz, flutuação, câmera) | ✅ — **o modelo aguarda aprovação** |
| 3. Scroll cinematográfico (rotação, zoom, deslocamento, 5 fases) | ✅ |
| 4. Validação desktop/mobile da hero | ✅ (detalhes abaixo) |
| 5. Páginas internas | ⏳ Rotas, SEO e navegação funcionam; o conteúdo aparece como "Em construção" |
| 6. Otimização final / 7. Preparação comercial | ⏳ parcial (este README, LICENSES.md) |

## Arquitetura

```
src/
  config/        theme.ts (cores/fontes) · site.ts (marca, contatos, CTAs, nav) · scene.ts (3D + roteiro)
  data/          textos das páginas (home.ts)
  components/
    ui/          Button, Logo, Seo
    layout/      Header (menu mobile acessível), Footer, Layout, PageStub
    three/       ToothScene (Canvas, lazy), ToothRig, Tooth, Particles, Atmosphere,
                 StudioEnvironment, Effects (bloom, lazy), SceneStage, StaticToothFallback
    animations/  rigStore, useScrollNarrative, useIntroTimeline, useReveal
  hooks/         useReducedMotion, usePointerParallax
  utils/         gsap (registro), device (WebGL/qualidade), applyTheme
  pages/         Home, Treatments, About, Technology, Contact, NotFound
scripts/generate-tooth.mjs   gerador procedural do GLB
tools/model-viewer.*         inspeção do modelo (dev)
```

### Como scroll e 3D conversam (sem conflitos entre GSAP e React)

1. Na Home, **um único** `ScrollTrigger` com `scrub` escreve `rigStore.progress` (0–1).
2. Cada seção com `data-scene-section` tem seu intervalo medido a cada refresh.
   O roteiro em `config/scene.ts` ancora keyframes em `{ section, at }`, nunca em
   pixels, por isso funciona em qualquer altura de tela.
3. A cada quadro, o `ToothRig` interpola o roteiro e amortece o resultado. As
   animações ficam em camadas separadas, então não disputam as mesmas propriedades:
   - grupo `rig`: **deslocamento** (fração da área visível) + escala
   - grupo `float`: **flutuação** contínua
   - grupo `spin`: **rotação** por scroll + ponteiro
   - câmera: **zoom** (`camZ`) + parallax
4. Nada disso passa por estado React; a rolagem não provoca re-render.

Existem dois roteiros: `keyframesDesktop` (deslocamento lateral) e
`keyframesMobile` (dente na metade superior, texto embaixo), escolhidos via
`gsap.matchMedia`.

### Qualidade adaptativa

| Nível | Quando | Efeitos |
|---|---|---|
| high | desktop com ≥ 6 núcleos | DPR até 2, 900 partículas, bloom + vinheta (MSAA 4×), translucidez (`transmission`) |
| medium | toque / tela < 768 px | DPR até 1,6, 380 partículas, sem pós-processamento |
| low | ≤ 4 núcleos, pouca memória ou Save-Data | DPR até 1,2, 160 partículas |

O `PerformanceMonitor` baixa um nível de qualidade se o FPS cair. Sem WebGL, aparece
uma ilustração SVG e o conteúdo continua completo. Com `prefers-reduced-motion`,
o dente fica estático na hero, sem flutuação, parallax nem narrativa de câmera.

### Performance

- A cena 3D (three + R3F) só carrega na Home (`React.lazy`). As páginas internas
  baixam apenas React + Router.
- GLB de 80 mil triângulos e cerca de 330 KB, com quantização e compressão
  **meshopt** (decoder embutido, sem CDN).
- Ao sair da Home, geometria, materiais e o contexto WebGL são liberados.

## Personalização para um novo cliente

1. `src/config/site.ts`: nome, logo (`logoSrc`), contatos, WhatsApp, Instagram,
   endereço, horários, mapa, CTAs e responsável técnico/CRO (**dados reais e
   verificados**).
2. `src/config/theme.ts`: paleta e fontes. Atualize também os valores padrão
   em `src/styles/index.css` (`:root`) para evitar flash de cor.
3. `src/data/*.ts`: textos.
4. `src/config/scene.ts`: modelo, material, luzes, partículas e roteiro de câmera.
5. `public/`: favicon, `og-image.jpg` (**pendente**: criar 1200×630), `robots.txt`
   e `sitemap.xml` (troque o domínio).

### Trocar o modelo 3D

Coloque o GLB em `public/models/` e aponte `sceneConfig.modelUrl`. O
componente centraliza e escala automaticamente (`modelHeight`). Recomendado:
até ~100 mil triângulos, normais suaves, compressão meshopt
(`npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt`).
Registre a licença em `LICENSES.md`.

## Publicação

Funciona como SPA estática (Vercel, Netlify, Cloudflare Pages). As URLs amigáveis
(`/tratamentos`…) precisam de fallback para `index.html`; os arquivos
`vercel.json` e `public/_redirects` (Netlify) já cuidam disso.

## Validação realizada (Etapa 4)

Feita em Chromium headless com GPU por software (SwiftShader). **Ainda não foi
testado em aparelhos físicos, Safari/iOS ou Edge.**

- `tsc -b` e `vite build` sem erros. Console sem erros ou avisos nas 5 rotas + 404.
- Capturas de cada fase do scroll em 1440×900 e 390×844: flutuação, rotação,
  zoom e deslocamento funcionando.
- Navegação Home → interna → voltar: o canvas é removido e recriado sem erros.
- Teclado: "pular para o conteúdo"; menu mobile com `aria-expanded`, foco preso no painel e
  fechamento com Esc.
- Sem overflow horizontal em 390 px. Fallback sem WebGL e modo de movimento
  reduzido verificados.
- LCP medido com PerformanceObserver: cerca de 0,7 s no desktop e cerca de 1,6 s no
  iPhone 13 emulado (CPU 4× mais lenta, rede lenta). CLS 0. **Isso não substitui um
  Lighthouse/PageSpeed no domínio final nem testes em aparelhos reais.**
