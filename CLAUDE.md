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
- `src/components/ui/` componentes shadcn · `src/components/` componentes próprios usados por 2+ features
- `src/db/` schema Dexie (`database.ts`), tipos (`types.ts`) e repositórios — IMPORTANTE: componentes NUNCA acessam o Dexie direto, só via repositórios/hooks
- `src/lib/` regras puras (`datas`, `tarefas`, `esquemas` Zod) — testáveis sem UI
- Toda escrita passa por repositório, para trocar por sync com backend sem mexer na UI
- Reordenar: `gravarNovaPosicao` (`db/repositories/ordenacao.ts`) na escrita e `ListaOrdenavel` na UI; reuse, não duplique
- Subtarefa NÃO conclui a tarefa automaticamente (nem o contrário) — decisão do usuário
- Excluir categoria NUNCA apaga tarefas: só limpa `categoryId`/`subcategoryId`
- IMPORTANTE: mover tarefa = só `data`/`ordem` via `moverTarefas`/`adiarTarefas`/`soltarTarefaNoDia`; NUNCA tocar em `dataOriginal`
- Ações de mover na UI passam por `useMoverTarefas` (aviso com "Desfazer" via `restaurarPosicoes`)
- Semana começa na segunda (`PRIMEIRO_DIA_DA_SEMANA` em `src/lib/semana.ts`); colunas do quadro em `src/lib/quadro.ts`
- Grade de mês/ano e resumo por dia em `src/lib/calendario.ts`; período via `useTarefasDoPeriodo`
- Arrastar no mês: `useDraggable` + teclado próprio (`coordenadasDaGrade`: lados ±1 dia, cima/baixo ±7)
- Item arrastável com clique: use `div` com `attributes` (num `<button>`, soltar o espaço dispara clique)
- Banco Dexie na versão 2 (índice `tasks.procedureId`); mudar índice = nova `version()`
- IMPORTANTE: tabela ou campo novo no banco exige atualizar `esquemaBackup` (`src/lib/backup.ts`) e, se mudar a estrutura do JSON, `FORMATO_ATUAL`
- Importar backup SUBSTITUI tudo numa transação única (`importarDados`); blobs são convertidos fora da transação
- Anexo pertence ao `dono` {tipo, id} (tarefa, nota, procedimento, passo); `Step.anexos` não é usado — a fonte é `attachments`
- Excluir tarefa/nota/procedimento SEMPRE apaga anexos e anotações dele (`excluirAnexosDe`, `excluirNotasDe`) na mesma transação
- Anotação de tarefa = Note com `dono`; notas avulsas (página Notas) não têm dono
- Painel de anexos reutilizável: `src/components/anexos/painel-anexos.tsx`; links SÓ http/https (`esquemaLink`)
- Texto editado com gravação atrasada: use `useSalvarComAtraso` (grava o pendente ao sair da tela)
- Cor de subcategoria sem cor própria = `variacaoCor` pela ordem de criação (estável); paleta em `src/lib/cores.ts`
- Nome repetido: repositório lança `ErroDeValidacao`, que `CampoNovoItem` mostra como erro do campo
- Leitura reativa com `useLiveQuery` dentro de hooks da feature; não há store global
- Rotas em `src/app/router.tsx` dentro de `LayoutApp`; data e filtro ficam na URL (`/dia/YYYY-MM-DD?categoria=&sub=`)

## Modelo de dados (resumo)
- Toda entidade: `id` (`crypto.randomUUID()`), `criadoEm`, `atualizadoEm` — preparam sync; NUNCA ids autoincrementais
- Alterar índices = nova `version()` no Dexie, NUNCA editar a versão existente
- Category { id, nome, cor } · Subcategory { id, categoryId, nome, cor? } (sem cor = variação da cor da categoria)
- Task { id, titulo, data, categoryId?, subcategoryId?, ordem (aceita decimais), status: pendente|concluida|arquivada, dataOriginal, concluidaEm? }
- Subtask { id, taskId, titulo, concluida, ordem }
- Procedure { id, titulo, categoryId?, descricao, secoes[] (cada uma com passos[] embutidos), camposVariaveis[], versao }
- Step { id, texto, codigo?, alerta?, anexos[], subpassos[] } — dentro de Procedure, sem tabela; subpasso tem 1 nível; ordem = posição no array
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
- IMPORTANTE: modo execução NUNCA altera o procedimento original — `execution-repository` só escreve em `executions` (e na tarefa ligada)
- Editar procedimento SEMPRE grava a versão anterior em ProcedureVersion (`salvarProcedimento`; uma versão por "Salvar")
- Execução segue a versão em que começou (`obterVersao`); em andamento = sem `concluidaEm`, retomável
- Campos variáveis: `{{nome}}` casa pelo nome sem acento/maiúscula; credencial mostra só `localCredencial`
- Marcar passo: use `mudarEstadoDoPasso` (atômico); nunca grave a partir de uma execução lida antes
- Tarefa com `procedureId` = execução agendada; concluir a execução conclui a tarefa
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
- Teste de tela: `renderizarApp(caminho)` (`src/test/`) monta rotas + layout reais (avisos incluídos)
- date-fns 4 pt-BR: `EEE` = "quarta" e `MMM` = "out", sem ponto — confira antes de testar textos de data
- Arrastar não é testável no jsdom (sem posições): cubra a lógica em `lib/quadro` e no repositório
- Teste que navega: espere um elemento da página nova (o endereço muda antes da tela desenhar)
- A área de avisos do Sonner é uma `region` ("Notifications"): filtre por nome ao contar regiões
- Nos testes, `Blob`/`File` são os do Node e `URL.createObjectURL` é fixo (`src/test/setup.ts`): o Blob do jsdom vira objeto vazio no fake-indexeddb
- Canvas, câmera, microfone e `createImageBitmap` não existem no jsdom: verifique desenho, foto e áudio no navegador
- Testes têm tsconfig próprio (`tsconfig.test.json`, com tipos do Node); o app não enxerga tipos do Node
- `userEvent.type`: `{` é tecla especial; para digitar `{{campo}}` escreva `'{{{{campo}}'`
- `src/components/ui/` é gerado pelo shadcn: não editar à mão sem motivo; ignorado pelo oxlint e Prettier
- shadcn importa `cn` do pacote `cn` (oficial do shadcn), não de `@/lib/utils`
- Campo de criar item: use `CampoNovoItem`; ele limpa ANTES do `await` para não apagar o que o usuário já digitou
- Hover de linha usa grupo nomeado `group/linha` (linhas aninhadas); não use `group` simples
- Prévia no app: `.claude/launch.json` usa a porta 5180 fixa
- Cores do visual são tokens em `src/index.css` (`nevoa`, `papel`, `tinta`, `grafite`, `pauta`, `caneta`, `marca-texto`)
- Submenu Radix em teste: use teclado (`ArrowRight`, `Enter`); no jsdom o ponteiro fecha o submenu
