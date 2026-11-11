# Fecha+ — Arquitetura e plano de desenvolvimento

Documento vivo. Atualizado a cada etapa concluída.

## 1. Análise do ambiente (Etapa 1)

| Item | Situação |
|---|---|
| Repositório | Já continha o site institucional da Mosaik Conecta (`/index.html`). O app foi criado na subpasta `fecha-mais/` para **não interferir** no site. |
| Node.js / npm | v22 / v10 — compatíveis |
| Expo SDK | 58 (React Native 0.88, React 19.3, TypeScript 6) |
| Ferramentas pagas | Nenhuma |

## 2. Arquitetura proposta

```
┌──────────────────────────────┐        HTTPS        ┌───────────────────────────────┐
│  App Fecha+ (Expo / RN)      │  ─────────────────▶ │  Supabase                     │
│                              │                     │                               │
│  Telas (Expo Router)         │                     │  Auth (e-mail + senha)        │
│     ↓                        │                     │  Postgres                     │
│  Hooks de dados (features/)  │                     │    + Row Level Security (RLS) │
│     ↓                        │                     │    + índices / chaves FK      │
│  Cliente Supabase (lib/)     │  chave "anon" apenas│                               │
│  Sessão no SecureStore       │                     │  service_role: NUNCA no app   │
└──────────────────────────────┘                     └───────────────────────────────┘
```

**Princípios**

1. **Telas não falam direto com o banco.** Cada funcionalidade (`features/leads`, `features/tasks`…) tem
   suas funções de acesso a dados. Se um dia trocarmos o backend, as telas não mudam.
2. **Segurança no servidor, não no app.** O app só tem a chave pública (`anon`). Quem decide o que cada
   usuário pode ver é o **RLS** do Postgres. Mesmo que alguém modifique o app, não acessa dados de outra empresa.
3. **Multiempresa desde o início.** Todo dado comercial pertence a um `workspace` (empresa). Um usuário
   pode participar de um ou mais workspaces via `workspace_members`.
4. **Identidade visual centralizada** em `src/theme` — nenhuma cor/fonte "solta" nas telas.

## 3. Estrutura de pastas (alvo)

```
src/
├── app/                      # Rotas (Expo Router)
│   ├── (auth)/               # login, cadastro, recuperar senha        [Etapa 2]
│   ├── (tabs)/               # inicio, clientes, funil, tarefas, perfil
│   └── clientes/[id].tsx     # detalhes/edição                          [Etapa 3]
├── components/ui/            # Componentes visuais genéricos
├── features/                 # Lógica por domínio                       [Etapa 2+]
│   ├── auth/
│   ├── leads/
│   ├── tasks/
│   └── reports/
├── lib/                      # supabase.ts, formatadores, whatsapp.ts   [Etapa 2+]
├── constants/
└── theme/
supabase/
└── migrations/               # SQL versionado do banco (tabelas + RLS)  [Etapa 2]
```

## 4. Dependências e custos

| Dependência | Uso | Custo |
|---|---|---|
| Expo / React Native / Expo Router | Base do app e navegação | Gratuito (open source) |
| Expo Go | Testar no celular | Gratuito |
| Google Fonts (Sora + Inter) | Tipografia, embutida no app | Gratuito (licença OFL) |
| @expo/vector-icons (Ionicons) | Ícones | Gratuito |
| Supabase — plano Free | Auth + banco | Gratuito: 500 MB de banco, 50 mil usuários ativos/mês. Projetos free **pausam após 1 semana sem uso** (basta reativar no painel). |
| expo-secure-store | Guardar sessão criptografada | Gratuito |

**Custos futuros (somente com sua autorização, na fase de publicação):**

| Item | Valor aproximado |
|---|---|
| Conta Google Play Console | US$ 25 (taxa única) |
| Apple Developer Program | US$ 99/ano |
| EAS Build (nuvem da Expo) | Plano gratuito com cota mensal de builds; pago só se precisar de mais |
| Supabase Pro (quando houver clientes pagantes) | ~US$ 25/mês |

## 5. Integração com Supabase (Etapa 2)

1. **Você** cria uma conta gratuita em supabase.com e um projeto (região São Paulo, por LGPD/latência).
2. Copiamos a **Project URL** e a **anon key** para um arquivo `.env` local (já ignorado pelo Git):
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   A `anon key` é pública por design — a proteção real é o RLS. A `service_role` **nunca** entra no app.
3. Rodamos o SQL de `supabase/migrations/` no SQL Editor do Supabase, criando:

| Tabela | Conteúdo | Chave de isolamento |
|---|---|---|
| `profiles` | Nome, telefone do usuário (1:1 com `auth.users`) | `id = auth.uid()` |
| `workspaces` | Empresa: nome, plano (`free`…), dono | membros |
| `workspace_members` | Usuário ↔ empresa + papel (`owner`, `member`) | `user_id` |
| `leads` | Cliente/oportunidade: nome, telefone, e-mail, empresa, origem, observações, estágio, valor | `workspace_id` |
| `activities` | Histórico: mudança de estágio, nota, contato | `workspace_id` |
| `tasks` | Follow-ups: título, data/hora, lead, concluída em | `workspace_id` |

   - Cada tabela de negócio tem `workspace_id` com **chave estrangeira** e **índice**.
   - Política RLS padrão: *"só acessa linhas cujo `workspace_id` pertence a um workspace do qual o usuário é membro"*,
     via função `is_workspace_member(workspace_id)`.
   - Um *trigger* cria automaticamente `profile` + `workspace` pessoal no primeiro cadastro.
   - Campo `plan` em `workspaces` prepara a cobrança por assinatura no futuro.
4. A sessão é salva com `expo-secure-store` (criptografada pelo sistema do celular), garantindo login persistente.

**LGPD:** coletar só o necessário, permitir exclusão da conta e dos dados, política de privacidade antes da publicação,
nenhum dado pessoal em logs.

## 6. Etapas

| # | Etapa | Entregas | Status |
|---|---|---|---|
| 1 | **Fundação** | Expo + TS, Expo Router, tema, componentes base, 5 abas com estados vazios, ícone e splash | ✅ Entregue — aguardando validação no celular |
| 2 | Autenticação + banco | Projeto Supabase, migrations (tabelas + RLS), cadastro, login, recuperar senha, sessão persistente | ⏳ |
| 3 | Clientes | Listar, buscar, cadastrar, editar, ver detalhes, excluir com confirmação, botão WhatsApp | ⏳ |
| 4 | Funil + Dashboard | Mudar estágio, valores, indicadores reais no Início | ⏳ |
| 5 | Follow-ups | Criar lembretes, pendentes/atrasadas/concluídas, vínculo com cliente | ⏳ |
| 6 | Relatórios + Perfil | Conversão, ganhos/perdidos, valores; edição de perfil | ⏳ |
| 7 | Qualidade e publicação | Testes, acessibilidade, notificações (opcional), build EAS, lojas — **só com sua autorização** | ⏳ |

Cada etapa termina com: typecheck + lint sem erros, teste no celular e sua validação antes da próxima.
