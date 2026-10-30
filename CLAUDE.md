# Projeto: MemorIA
App pessoal de organização em formato de calendário: tarefas, subtarefas, categorias coloridas e procedimentos reutilizáveis.

## Stack
- React 19.3 · TypeScript 7.0 (strict) · Vite 8.3 · Node 24
- Tailwind CSS 4.3 (plugin Vite, sem tailwind.config) · shadcn/ui preset nova (Radix, ícones lucide)
- React Router 8.5 · Formulários: React Hook Form 7.91 + Zod 4.6
- Dados: Dexie 4.4 + dexie-react-hooks (`useLiveQuery`) — IndexedDB, blobs para foto, desenho, áudio
- Arrastar e soltar: @dnd-kit/core 6.3 + sortable 10 · Datas: date-fns 4.4 + locale `pt-BR`
- Testes: Vitest 5 + Testing Library + fake-indexeddb · Lint: oxlint · Formatação: Prettier
- Desktop primeiro, sem servidor; estrutura pronta para PWA e sync com backend (fase 9)

## Comandos
- `npm run dev` — servidor local
- `npm run build` — build de produção (`tsc -b` + Vite)
- `npm test` — todos os testes · `npx vitest run <arquivo>` — um arquivo
- `npm run lint` — oxlint · `npm run format` — Prettier
- `npx shadcn@latest add <componente>` — adicionar componente shadcn

## Arquitetura
- `src/app/` shell, rotas e providers
- `src/features/<feature>/` página (`<feature>-page.tsx`), `components/` e `hooks/` de cada área
- `src/hooks/` hooks compartilhados entre features (ex.: `use-hoje`)
- `src/components/ui/` componentes shadcn compartilhados
- `src/db/` schema Dexie (`database.ts`), tipos (`types.ts`) e repositórios — IMPORTANTE: componentes NUNCA acessam o Dexie direto, só via repositórios/hooks
- `src/lib/` regras puras (`datas`, `tarefas`, `esquemas` Zod) — testáveis sem UI
- Toda escrita passa por repositório, para trocar por sync com backend sem mexer na UI
- Leitura reativa com `useLiveQuery` dentro de hooks da feature; não há store global
- Rotas em `src/app/router.tsx`; a data da visão fica na URL (`/dia/YYYY-MM-DD`)

## Modelo de dados (resumo)
- Toda entidade: `id` (`crypto.randomUUID()`), `criadoEm`, `atualizadoEm` — preparam sync; NUNCA ids autoincrementais
- Alterar índices = nova `version()` no Dexie, NUNCA editar a versão existente
- Category { id, nome, cor } · Subcategory { id, categoryId, nome, cor? } (sem cor = variação da cor da categoria)
- Task { id, titulo, data, categoryId?, subcategoryId?, ordem (aceita decimais), status: pendente|concluida|arquivada, dataOriginal, concluidaEm? }
- Subtask { id, taskId, titulo, concluida, ordem }
- Procedure { id, titulo, categoryId?, descricao, secoes[] (cada uma com passos[] embutidos), camposVariaveis[], versao }
- Step { id, ordem, texto, codigo?, alerta?, anexos[], subpassos[] } — vive dentro de Procedure, sem tabela própria
- CampoVariavel tipo `credencial` guarda só `localCredencial`
- ProcedureVersion { procedureId, versao, snapshot, alteradoEm }
- Execution { id, procedureId, versao, data, valoresCampos, passosMarcados, passosPulados, observacoes, taskId? }
- Note, Attachment (foto, desenho, áudio, link) ligados a tarefa, nota ou procedimento

## Regras de negócio
- Mover tarefa entre dias é a função central: alterar `data`, NUNCA copiar + apagar
- Concluída: riscada, vai para grupo "Concluídas" recolhível no fim do dia
- Dias pendentes = hoje − `dataOriginal`, exibido em toda pendente com `dataOriginal` < hoje; mover/adiar NÃO zera
- Ações: trazer pendências de ontem para hoje, adiar para amanhã, mover para outro dia, mover várias selecionadas
- Arquivar = tirar do calendário sem concluir
- IMPORTANTE: modo execução NUNCA altera o procedimento original
- Editar procedimento SEMPRE grava a versão anterior em ProcedureVersion
- NUNCA crie campo de senha: credencial guarda só ONDE está (ex.: "cofre X, item Y")
- Interface toda em português do Brasil

## Estilo de código
- NUNCA use `any`; prefira `unknown` + Zod
- Arquivos em kebab-case; componentes em PascalCase
- Imports absolutos com `@/`
- Handlers `handle*`, booleanos `is*/has*/can*`, hooks `use*`

## Workflow
- Uma fase por vez; ao terminar, PARE e mostre ao usuário antes de seguir
- Antes de cada fase, liste em poucas linhas o que será feito
- Ao concluir fase: testes + build, atualizar status no README (e este arquivo se a estrutura mudar), commit
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Testes obrigatórios: mover tarefas, contagem de dias pendentes, modo execução
- Ambiguidade na proposta: pergunte, não suponha
- Trabalho de interface: use a skill `frontend-design`

## Fases
1. Visão do dia (tarefas, seleção, concluídas agrupadas, reordenação)
2. Subtarefas com progresso ("2 de 5")
3. Categorias e subcategorias com cores e filtro
4. Semana, arrastar entre dias, ações de mover pendências
5. Procedimentos: editor → execução → ligação ao calendário → histórico, campos variáveis, versões, busca
6. Visões de mês e ano
7. Backup: exportar/importar JSON com anexos
8. Notas, fotos, desenho à mão livre, áudio
9. Compartilhamento (ver/editar) — exige backend; discutir arquitetura antes

## Armadilhas
- IMPORTANTE: datas são data local `YYYY-MM-DD` (America/Sao_Paulo); NUNCA use `new Date("YYYY-MM-DD")` nem `toISOString()` para dia — geram UTC e deslocam um dia. Use `src/lib/datas.ts`
- Testes rodam com `TZ=America/Sao_Paulo` (definido em `vite.config.ts`); sem `globals`, importe `describe/it/expect` de `vitest`
- `src/components/ui/` é gerado pelo shadcn: não editar à mão sem motivo; ignorado pelo oxlint e Prettier
- shadcn importa `cn` do pacote `cn` (oficial do shadcn), não de `@/lib/utils`
- Campo que limpa após salvar: limpe ANTES do `await`, senão apaga o que o usuário já digitou
- Prévia no app: `.claude/launch.json` usa a porta 5180 fixa
- Cores do visual são tokens em `src/index.css` (`nevoa`, `papel`, `tinta`, `grafite`, `pauta`, `caneta`, `marca-texto`)
