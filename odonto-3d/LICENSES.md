# Recursos externos e licenças

Inventário dos recursos de terceiros usados no template. Revise antes de cada
entrega comercial e mantenha este arquivo atualizado ao adicionar recursos.

## Modelo 3D do dente

| Recurso | Origem | Licença |
|---|---|---|
| `public/models/tooth.glb` | **Obra original** gerada por `scripts/generate-tooth.mjs` (campo de distância assinado + Surface Nets + meshoptimizer). Nenhum arquivo, escaneamento ou malha de terceiros foi usado. | Propriedade do autor do template — livre para uso comercial dentro do produto. |

> Se o modelo for substituído por um GLB comprado/encomendado, registre aqui:
> autor, URL, data da compra, tipo de licença e se permite **uso comercial em
> projetos de clientes** e **redistribuição embutida**. Não use modelos
> Creative Commons *NonCommercial* (CC BY-NC) nem "Editorial use only".

## Iluminação / ambiente

Nenhum HDRI externo. O mapa de reflexos é gerado em tempo real por
`Lightformer`s (drei) em `src/components/three/StudioEnvironment.tsx`.

## Fontes (auto-hospedadas via @fontsource)

| Fonte | Licença |
|---|---|
| Manrope (Mikhail Sharanda) | SIL Open Font License 1.1 |
| Inter (Rasmus Andersson) | SIL Open Font License 1.1 |

## Bibliotecas (dependências de execução)

| Pacote | Licença |
|---|---|
| react, react-dom | MIT |
| react-router | MIT |
| three | MIT |
| @react-three/fiber, @react-three/drei, @react-three/postprocessing | MIT |
| postprocessing | Zlib |
| gsap (inclui ScrollTrigger) | "Standard GSAP License" — gratuita, inclusive para uso comercial, desde 2024/2025. **Verifique os termos vigentes em gsap.com/standard-license antes da entrega.** |
| lucide-react (ícones) | ISC |

## Ferramentas de desenvolvimento (não vão para o site publicado)

vite, typescript, tailwindcss, @gltf-transform/*, meshoptimizer, isosurface — MIT.

## Referências visuais

A imagem de referência "Dentivo" e o prompt "Fernhollow / Motion Sites" orientaram
apenas princípios gerais (contraste, iluminação, hierarquia, ritmo de movimento).
Nenhum texto, logotipo, imagem, código, shader ou cena desses materiais foi
copiado. Marca, logotipo (SVG em código) e textos são originais e fictícios.
