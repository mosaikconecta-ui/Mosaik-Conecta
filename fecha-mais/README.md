# Fecha+

> **Venda mais. Esqueça menos.**
> CRM mobile para pequenos empreendedores, autônomos e prestadores de serviço.

Aplicativo em **React Native + Expo (SDK 58) + TypeScript**, com navegação por **Expo Router**.
Backend previsto: **Supabase** (Auth + Postgres com Row Level Security).

**Fase atual:** Etapa 1 — Fundação (projeto, navegação, identidade visual).
Veja o plano completo em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Como rodar no seu celular (passo a passo)

### 1. Instale no computador (uma vez só)

| Ferramenta | Para quê | Como verificar |
|---|---|---|
| [Node.js LTS](https://nodejs.org) (20 ou superior) | Executa as ferramentas do projeto | `node -v` |
| [Git](https://git-scm.com) | Baixa o código do GitHub | `git --version` |
| [VS Code](https://code.visualstudio.com) (opcional) | Editor de código | — |

### 2. Instale no celular

- App **Expo Go** — [Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iPhone (App Store)](https://apps.apple.com/app/expo-go/id982107779)
- O Expo Go precisa ser compatível com o **SDK 58** (a versão atual das lojas é).

### 3. Baixe e rode o projeto

```bash
git clone https://github.com/mosaikconecta-ui/Mosaik-Conecta.git
cd Mosaik-Conecta
git checkout claude/fecha-crm-mobile-start-lgv6il
cd fecha-mais
npm install
npm start
```

Vai aparecer um **QR Code** no terminal.

- **Android:** abra o Expo Go → "Scan QR code".
- **iPhone:** abra a Câmera e aponte para o QR Code.

> O celular e o computador precisam estar **na mesma rede Wi-Fi**.
> Se não conectar (rede corporativa, Wi-Fi de visitante), use `npm run start:tunnel`.

Para ver no navegador do computador: `npm run web`.

### Comandos úteis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento (QR Code) |
| `npm run start:tunnel` | Igual, mas funciona mesmo em redes diferentes |
| `npm run web` | Abre a versão web no navegador |
| `npm run typecheck` | Verifica erros de tipo (TypeScript) |
| `npm run lint` | Verifica padrões de código |

---

## Estrutura de pastas

```
fecha-mais/
├── app.json              # Configuração do app (nome, ícone, splash, pacotes)
├── assets/               # Ícone, splash e favicon
├── docs/                 # Documentação de arquitetura e plano
└── src/
    ├── app/              # TELAS (cada arquivo = uma rota)
    │   ├── _layout.tsx   # Raiz: fontes, splash, navegação em pilha
    │   ├── index.tsx     # Boas-vindas
    │   └── (tabs)/       # Abas: inicio, clientes, funil, tarefas, perfil
    ├── components/ui/    # Componentes reutilizáveis (Button, Card, Screen…)
    ├── constants/        # Constantes (nome do app, estágios do funil)
    └── theme/            # Identidade visual: cores, tipografia, espaçamentos
```
