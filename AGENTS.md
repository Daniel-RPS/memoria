# Projeto: MemorIA

App pessoal de organização em formato de calendário: tarefas, grupos (cards com itens), categorias coloridas, procedimentos reutilizáveis e notas.

## Agentes (Antigravity, Claude Code e outros)

- Este AGENTS.md é a fonte única de instruções; o `CLAUDE.md` só importa este arquivo
- Mantenha este arquivo enxuto (meta: abaixo de 200 linhas). Só entra regra que o agente erraria sem ela
- NUNCA acrescente aqui histórico de ajuste, descrição de tela ou lista de funções. Ajuste novo: 1–2 linhas em `docs/historico-de-ajustes.md`; detalhe de uma área: o arquivo dela em `docs/agentes/`
- O usuário usa Windows e controla o git pelo GitHub Desktop
- IMPORTANTE: NUNCA faça `git push`; push na `main` publica o site (GitHub Pages) e quem publica é o usuário. Commit local é permitido
- IMPORTANTE: no navegador do agente, NUNCA use `localhost:5173` (os dados REAIS do usuário estão presos a essa origem). Use `npm run dev -- --port 5180` e semeie dados de teste
- Antes de mudança grande, apresente o plano e espere o OK
- Ambiguidade no pedido: pergunte, não suponha
- Leia só o necessário para a tarefa: não varra o projeto; use o índice "Detalhe por área" abaixo
- Antes de mexer em tela, leia `.agents/skills/frontend-design/SKILL.md`

## Stack

- React 19.3 · TypeScript 7.0 (strict) · Vite 8.3 · Node 24
- Tailwind CSS 4.3 (plugin Vite, sem tailwind.config) · shadcn/ui preset nova (Radix, ícones lucide)
- React Router 8.5 · React Hook Form 7.91 + Zod 4.6
- Dexie 4.4 + dexie-react-hooks (`useLiveQuery`): IndexedDB, blobs para foto, desenho e áudio
- @dnd-kit/core 6.3 + sortable 10 · date-fns 4.4 com locale `pt-BR`
- Ícones: frimousse 0.4, emojibase-data 18 e simple-icons 16 (os dois últimos só em dev; ver `docs/agentes/categorias-cores-icones.md`)
- Testes: Vitest 5 + Testing Library + fake-indexeddb · E2E: Playwright (`e2e/`) · Lint: oxlint · Formatação: Prettier
- Escopo: só computador, uso pessoal, site estático no GitHub Pages (`https://daniel-rps.github.io/memoria/`); dados só no navegador
- Celular, sync e compartilhamento estão FORA do escopo: não proponha sem o usuário pedir

## Comandos

- `npm run dev`: app em `http://localhost:5173` (porta fixa, `strictPort`)
- `npm run build`: `tsc -b` + Vite · `npm run preview`: `http://localhost:4173/memoria/`
- `npm test`: todos os testes · `npx vitest run <arquivo>`: um arquivo
- `npm run e2e`: Playwright (Vite na porta 5190; capturas em `e2e/capturas/`, confira ao mexer em arrasto)
- `npm run lint` · `npm run format`
- `npx shadcn@latest add <componente>`: adiciona componente shadcn

## Arquitetura

- `src/app/` shell, rotas e providers · `src/features/<feature>/` página, `components/` e `hooks/` da área
- `src/hooks/` hooks compartilhados · `src/components/ui/` shadcn · `src/components/` próprios usados por 2+ features
- `src/db/` schema Dexie (`database.ts`), tipos (`types.ts`, fonte do modelo de dados) e repositórios
- `src/lib/` e `src/domain/` regras puras, testáveis sem UI
- IMPORTANTE: componentes NUNCA acessam o Dexie; toda escrita passa por repositório/hook
- Regra de negócio fica em função pura, nunca em componente
- Leitura reativa: `useLiveQuery` dentro de hooks da feature; não há store global
- Entidades: `id` = `crypto.randomUUID()`, `criadoEm`, `atualizadoEm`; NUNCA ids autoincrementais
- IMPORTANTE: mudar índice do Dexie = nova `version()` (NUNCA edite versão existente). Tabela ou campo novo exige atualizar `esquemaBackup` (`src/lib/backup.ts`) e, se mudar o JSON, `FORMATO_ATUAL`
- Reuse, não duplique:
  - reordenar: `gravarNovaPosicao` (`db/repositories/ordenacao.ts`) + `ListaOrdenavel`
  - categoria: `src/components/seletor-categoria/` com `tipo` obrigatório · cor: `PaletaCores`
  - ícone: `SeletorIcone` (escolher) e `IconeDaEntidade` (mostrar)
  - bloco recolhível: `SecaoRecolhivel` · filtro por dia: `SeletorDeDia`
  - novo item em lista: `CampoNovoItem` · texto com gravação atrasada: `useSalvarComAtraso`
  - localStorage: `preferencia-local.ts` · aviso com Desfazer: `avisarComDesfazer`

## Regras de domínio

- Grupo NÃO é tarefa nem categoria: itens são `GroupItem` (tabela própria); tarefas são só as soltas
- Tarefa solta é MOVIDA (muda `data`/`ordem` por `moverTarefas`/`adiarTarefas`/`soltarTarefaNoDia`), nunca copiada e apagada. NUNCA toque em `dataOriginal`
- Levar item/card a outro dia COPIA os pendentes para o card da mesma série e marca o original como `transferido`; voltar desfaz a transferência. A regra fica só em `src/lib/mover-grupos.ts` (`planejarLevarItens`)
- Colocar tarefa no grupo / tirar item = conversão com o MESMO id (`colocarNoGrupo`/`tirarDoGrupo`); notas e subetapas acompanham, anexos não
- Item de grupo não tem categoria própria: segue a do grupo (`GroupSeries.categoryId`, opcional, só dá cor)
- Perder categoria ao converter (tarefa → grupo de outra categoria/sem; item → solta, de grupo com categoria) = aviso com Desfazer: regra em `src/domain/categoria-no-grupo.ts`, conversão na UI SÓ por `colocarNoGrupoComDesfazer`/`tirarDoGrupoComDesfazer`/`moverLote` + `avisarConversao`/`avisarLote` (detalhes em `docs/agentes/grupos-e-mover.md`)
- `Category.tipo` = `grupo` (grupos e tarefas soltas) ou `procedimento`; nome único e `ordem` valem dentro do tipo
- Excluir categoria NUNCA apaga tarefas, grupos nem procedimentos: só limpa `categoryId`/`subcategoryId`
- Excluir tarefa, item ou card NUNCA apaga notas: elas ficam avulsas
- Marcar a ÚLTIMA subetapa pendente conclui o dono (tarefa ou item)
- Em andamento e prioridade só valem para pendente; concluir remove as duas marcas
- Mover na UI passa por `useMoverTarefas`; Ctrl+Z desfaz a última ação enquanto o aviso está na tela
- Dias pendentes = hoje − `dataOriginal`; mover/adiar NÃO zera
- A semana começa na segunda (o mapa de conclusões começa no domingo)
- Procedimento = título, categoria e etapas numeradas; SÓ isso (execução, versões e anexos foram removidos em 01/11/2026: não reintroduza sem o usuário pedir)
- NUNCA crie campo de senha no app
- Interface toda em português do Brasil

## Detalhe por área (leia só o que for mexer)

| Ao mexer em                                                   | Leia                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| Dexie, migração, backup, importar                             | `docs/agentes/banco-e-backup.md`                       |
| Categorias, cores, ícones                                     | `docs/agentes/categorias-cores-icones.md`              |
| Grupos, levar/copiar itens, desfazer                          | `docs/agentes/grupos-e-mover.md`                       |
| Dia, Semana, Mês, arrasto, seleção em lote, ordem de exibição | `docs/agentes/dia-semana-mes.md`                       |
| Notas, anexos, Arquivados                                     | `docs/agentes/notas-anexos-arquivados.md`              |
| Início, captura rápida, mapa de conclusões                    | `docs/agentes/inicio-captura-mapa.md`                  |
| Em andamento, prioridade, subetapas, Dados/tempo              | `docs/agentes/andamento-prioridade-subetapas-tempo.md` |
| Barra lateral, tema, fundo, logo, blocos recolhíveis, deploy  | `docs/agentes/interface-tema-deploy.md`                |
| Regras de cards, progresso e procedimentos                    | `docs/agentes/regras-de-negocio.md`                    |
| Escrever ou corrigir testes                                   | `docs/agentes/testes.md`                               |
| Cores e fontes da marca                                       | `docs/branding/README.md`                              |
| O que já foi feito e quando                                   | `docs/historico-de-ajustes.md`                         |

## Estilo de código

- NUNCA use `any`; prefira `unknown` + Zod
- Arquivos em kebab-case; componentes em PascalCase
- Imports absolutos com `@/`
- Handlers `handle*`, booleanos `is*/has*/can*`, hooks `use*`

## Workflow

- Uma fase ou ajuste por vez; ao terminar, PARE e mostre ao usuário antes de seguir
- Antes de começar, liste em poucas linhas o que será feito
- Durante o trabalho rode só os testes da área (`npx vitest run <arquivo>`); suíte completa e build uma vez, no fim
- Ao terminar: testes + build, registrar o ajuste em `docs/historico-de-ajustes.md` (1–2 linhas), atualizar o status no README e fazer commit. Mexa neste arquivo só se surgiu regra nova que o agente erraria sem
- IMPORTANTE: alteração que muda o esquema do banco (nova `version()`, migração ou formato dos dados) → no resumo final, em destaque: **"Faça backup antes de publicar esta versão"**
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Testes obrigatórios: mover tarefas, contagem de dias pendentes, etapas e migração de procedimentos, copiar/mesclar grupos, contagem do mapa de conclusões, notas vinculadas (cadeia do item, excluir vira avulsa)
- Trabalho de interface: use a skill `frontend-design`

## Armadilhas

- IMPORTANTE: datas são data local `YYYY-MM-DD` (America/Sao_Paulo); NUNCA use `new Date("YYYY-MM-DD")` nem `toISOString()` para dia (geram UTC e deslocam um dia). Use `src/lib/datas.ts`
- IMPORTANTE: o site roda em `/memoria/`. Arquivo servido pelo app SEMPRE com `import.meta.env.BASE_URL`; rota atual SEMPRE pelo React Router (`useMatch`), nunca `window.location.pathname`
- NÃO use `stopPropagation` no `onKeyDown` de card ou linha: bloqueia o Ctrl+Z global
- Item arrastável com clique: use `div` com `attributes` do dnd-kit, nunca `<button>`
- `src/components/ui/` é gerado pelo shadcn: não edite à mão sem motivo. O visual de menus e popovers vem de regras por `data-slot` no fim de `src/index.css`
- shadcn importa `cn` do pacote `cn`, não de `@/lib/utils`
- Campo de criar item: use `CampoNovoItem` (limpa ANTES do `await` para não apagar o que o usuário digitou)
- Hover de linha usa o grupo nomeado `group/linha`; não use `group` simples
- Cores são tokens em `src/index.css`; componentes usam tokens, NUNCA hex nem `white`/`black`. Os mesmos nomes mudam de valor no tema escuro; confira contraste AA nos dois temas
- Tema: componente de lista NUNCA assina o tema (`useAparencia`) e NUNCA ganha transição de cor por causa do tema; cor de categoria vem de `useCorNaTela`/`useCorDeTraco` (`light-dark()`)
- Animação sempre com `motion-reduce:transition-none`; molas são `ease-mola` e `ease-mola-suave` do `@theme`
- `crypto.randomUUID`, gravação de áudio e PWA exigem contexto seguro (`localhost` ou `https`)
- Ao escrever testes, leia `docs/agentes/testes.md` (arrasto não é testável no jsdom; datas, Playwright e tempo limite têm regras próprias)
