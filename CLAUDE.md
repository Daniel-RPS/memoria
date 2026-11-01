# Projeto: MemorIA

App pessoal de organização em formato de calendário: tarefas, subtarefas, categorias coloridas e procedimentos reutilizáveis.

## Stack

- React 19.3 · TypeScript 7.0 (strict) · Vite 8.3 · Node 24
- Tailwind CSS 4.3 (plugin Vite, sem tailwind.config) · shadcn/ui preset nova (Radix, ícones lucide)
- React Router 8.5 · Formulários: React Hook Form 7.91 + Zod 4.6
- Dados: Dexie 4.4 + dexie-react-hooks (`useLiveQuery`) — IndexedDB, blobs para foto, desenho, áudio
- Arrastar e soltar: @dnd-kit/core 6.3 + sortable 10 · Datas: date-fns 4.4 + locale `pt-BR`
- Testes: Vitest 5 + Testing Library + fake-indexeddb · E2E: Playwright (`e2e/`) · Lint: oxlint · Formatação: Prettier
- IMPORTANTE: só computador, uso pessoal, sem servidor nem banco externo (decidido em 30/10/2026). Celular, sync e compartilhamento estão FORA do escopo — não proponha sem o usuário pedir

## Comandos

- `npm run dev` — app em `http://localhost:5173` (porta FIXA, `strictPort`: os dados ficam presos à origem)
- `npm run build` — build de produção (`tsc -b` + Vite)
- `npm test` — todos os testes · `npx vitest run <arquivo>` — um arquivo
- `npm run e2e` — Playwright no navegador (sobe o Vite na porta 5190; capturas em `e2e/capturas/`, conferir ao mexer em arrasto)
- `npm run lint` — oxlint · `npm run format` — Prettier
- `npx shadcn@latest add <componente>` — adicionar componente shadcn

## Arquitetura

- `src/app/` shell, rotas e providers
- `src/features/<feature>/` página (`<feature>-page.tsx`), `components/` e `hooks/` de cada área
- `src/hooks/` hooks compartilhados entre features (ex.: `use-hoje`)
- `src/components/ui/` componentes shadcn · `src/components/` componentes próprios usados por 2+ features
- `src/db/` schema Dexie (`database.ts`), tipos (`types.ts`) e repositórios — IMPORTANTE: componentes NUNCA acessam o Dexie direto, só via repositórios/hooks
- `src/lib/` regras puras (`datas`, `tarefas`, `esquemas` Zod) — testáveis sem UI
- Toda escrita passa por repositório (isola o Dexie da UI)
- Reordenar: `gravarNovaPosicao` (`db/repositories/ordenacao.ts`) na escrita e `ListaOrdenavel` (`src/components/`) na UI; reuse, não duplique
- Subtarefa NÃO conclui a tarefa automaticamente (nem o contrário) — decisão do usuário
- Excluir categoria NUNCA apaga tarefas, grupos nem procedimentos: só limpa `categoryId`/`subcategoryId` (excluir subcategoria só limpa `subcategoryId`)
- Categoria/subcategoria: regras em `category-repository` (nome válido e único no nível, `ordem`, reordenar, uso) e puras em `lib/categorias.ts`; ordem do usuário vale em todo o app (`montarCategorias`)
- Escolher categoria SEMPRE pelo seletor único `src/components/seletor-categoria/` (`SubmenuCategoria` no menu ⋯, `CampoCategoria` em formulário); ele cria categoria/subcategoria ali mesmo e já aplica. Menu que o contém é controlado (`open`) para o seletor fechar após criar
- IMPORTANTE: mover tarefa SOLTA = só `data`/`ordem` via `moverTarefas`/`adiarTarefas`/`soltarTarefaNoDia`; NUNCA tocar em `dataOriginal`
- Ações de mover na UI passam por `useMoverTarefas` → `moverSelecao`/`adiarSelecao`/`trazerPendenciasDeOntem` (`group-repository`); aviso com "Desfazer" via `desfazerAcao`; Ctrl+Z (`useAtalhoDesfazer` no `LayoutApp`) desfaz a última enquanto o aviso está na tela
- Semana começa na segunda (`PRIMEIRO_DIA_DA_SEMANA` em `src/lib/semana.ts`); colunas do quadro em `src/lib/quadro.ts`
- Grade de mês/ano e resumo por dia em `src/lib/calendario.ts`; período via `useTarefasDoPeriodo`
- Arrastar no mês: `useDraggable` + teclado próprio (`coordenadasDaGrade`: lados ±1 dia, cima/baixo ±7)
- Item arrastável com clique: use `div` com `attributes` (num `<button>`, soltar o espaço dispara clique)
- Card da semana: mesmo `MenuGrupo` e `MenuItemGrupo` do Dia. O card inteiro arrasta o grupo (ponteiro); a alça ⋮⋮ do cabeçalho é o ativador (foco/espaço). Área com `data-sem-arrasto` (itens, menu ⋯, título em edição) não arrasta o card; item só pela alça ⋮⋮ (`useSortable`, alvo de soltar só para itens do mesmo card: solto no card reordena, em outro dia leva). NÃO use `stopPropagation` no `onKeyDown` do card: bloqueia o Ctrl+Z global (só formulários dentro de menu param as teclas)
- Banco Dexie na versão 8 (v2: `tasks.procedureId`; v3: 1ª versão dos grupos; v4: `groupCards`/`groupItems` com migração da v3 em `lib/migracao-grupos.ts`; v5: remove `groupInstances`; v6: marca `criadoPorTransferencia`; v7: procedimento vira etapas via `lib/migracao-procedimentos.ts`, apaga `procedureVersions`/`executions`, `tasks.procedureId` e anexos/notas de procedimento/passo; v8: `ordem` em categorias/subcategorias via `preencherOrdem`); mudar índice = nova `version()`
- IMPORTANTE: tabela ou campo novo no banco exige atualizar `esquemaBackup` (`src/lib/backup.ts`) e, se mudar a estrutura do JSON, `FORMATO_ATUAL`
- Importar backup SUBSTITUI tudo numa transação única (`importarDados`); blobs são convertidos fora da transação
- Anexo pertence ao `dono` {tipo, id} (`task` ou `note`); procedimento não tem anexo nem anotação
- Excluir tarefa/nota SEMPRE apaga anexos e anotações dele (`excluirAnexosDe`, `excluirNotasDe`) na mesma transação
- Anotação de tarefa = Note com `dono`; notas avulsas (página Notas) não têm dono
- Painel de anexos reutilizável: `src/components/anexos/painel-anexos.tsx`; links SÓ http/https (`esquemaLink`)
- Texto editado com gravação atrasada: use `useSalvarComAtraso` (grava o pendente ao sair da tela)
- Cor de subcategoria sem cor própria = `variacaoCor` pela ordem de CRIAÇÃO (estável, reordenar não muda); paleta em `src/lib/cores.ts`
- Nome repetido: repositório lança `ErroDeValidacao`, que `CampoNovoItem` mostra como erro do campo
- Grupos: `db/repositories/group-repository.ts` (cards, itens, copiar, desfazer, converter) e regras puras em `src/lib/grupos.ts`
- IMPORTANTE: grupo NÃO é tarefa nem categoria. Itens são `GroupItem` (tabela própria); tarefas são só as soltas
- IMPORTANTE: TODA regra de levar itens de grupo está em `src/lib/mover-grupos.ts` (`planejarLevarItens`, puro: estado → mudanças; `inverterMudancas` para o Desfazer). O repositório (`copiarItens`) só carrega o estado, grava numa transação e guarda o inverso em `ResultadoAcao.desfazer`. Nada de regra de movimentação em componente
- Levar = copiar para o card da MESMA série no destino (cópia pendente com `origemItemId` e mesma `dataOriginal`; original `transferido` com `transferidoParaCardId`). O card original NUNCA sai do lugar
- IMPORTANTE: se a cadeia `origemItemId` do item tem um ancestral `transferido` num card do destino, é VOLTA: reativa o ancestral e apaga a cópia (e as paradas do meio). Card com `criadoPorTransferencia` que perdeu itens e ficou sem pendente/feito é apagado; card criado à mão nunca
- `ordem` do dia é uma escala só para tarefas soltas e cards (`GroupCard.ordem`, `tabelaDoDia`); `ordem` de item é a posição dentro do card
- Colocar tarefa no grupo / tirar item = conversão com o MESMO id (`colocarNoGrupo`/`tirarDoGrupo`); subtarefas, anotação e anexos da tarefa não passam para o item
- Leitura reativa com `useLiveQuery` dentro de hooks da feature; não há store global
- Rotas em `src/app/router.tsx` dentro de `LayoutApp`; data e filtro ficam na URL (`/dia/YYYY-MM-DD?categoria=&sub=`). Moldura: `BarraLateral` (`src/app/barra-lateral.tsx`; recolhe para ícones na Semana); página que quer algo na barra usa `NaBarraLateral` (portal, estado continua na página), como o filtro do Dia

## Modelo de dados (resumo)

- Toda entidade: `id` (`crypto.randomUUID()`), `criadoEm`, `atualizadoEm`; NUNCA ids autoincrementais (deixam aberta uma sync futura)
- Alterar índices = nova `version()` no Dexie, NUNCA editar a versão existente
- Category { id, nome, cor, ordem } · Subcategory { id, categoryId, nome, cor?, ordem } (sem cor = variação da cor da categoria)
- Task { id, titulo, data, categoryId?, subcategoryId?, ordem (aceita decimais), status: pendente|concluida|arquivada, dataOriginal, concluidaEm? }
- GroupSeries { id, titulo (único, sem acento/maiúscula), categoryId?, subcategoryId? } — liga os cards de dias diferentes; categoria só dá cor e filtro
- GroupCard { id, seriesId, data, ordem, arquivado, criadoPorTransferencia? } — no máximo um por série e dia; encerrado é calculado (tem itens e nenhum pendente)
- GroupItem { id, cardId, titulo, ordem, status: pendente|concluido|transferido|arquivado, concluidoEm?, transferidoParaCardId?, origemItemId?, dataOriginal }
- Subtask { id, taskId, titulo, concluida, ordem }
- Procedure { id, titulo, categoryId?, subcategoryId?, etapas: [{ id, texto, ordem }] } — etapas embutidas, sem tabela; `ordem` = posição (0, 1, 2…), regravada a cada salvamento (`numerarEtapas`)
- Note, Attachment (foto, desenho, áudio, link) ligados a tarefa ou nota

## Regras de negócio

- Mover tarefa entre dias é a função central: alterar `data`, NUNCA copiar + apagar
- Concluída: riscada, vai para grupo "Concluídas" recolhível no fim do dia
- Dias pendentes = hoje − `dataOriginal`, exibido em toda pendente com `dataOriginal` < hoje; mover/adiar NÃO zera
- Ações: trazer pendências de ontem para hoje, adiar para amanhã, mover para outro dia, mover várias selecionadas
- Arquivar = tirar do calendário sem concluir
- Card vive num dia. Arrastar/adiar/mover/trazer de ontem DUPLICA: o original fica (registro do dia) e só os PENDENTES vão juntos, em ordem e numa operação, para o card da série no destino (mescla se existir). Levar de volta a um dia onde o item está transferido DESFAZ a transferência (não duplica)
- Sempre igual, para ser previsível: nada marcado = tudo vira transferido e a cópia leva tudo; tudo marcado (ou card vazio) = nada a copiar, ação bloqueada
- Transferido: cinza, sem riscar, sem caixa, não conta como pendente nem feito; etiqueta "transferido para dd/MM" leva ao card de destino. Desmarcar no original não mexe na cópia
- Progresso: ativo "3/4"; encerrado "3 feitos · 1 transferido". Mês/ano contam itens pendentes e feitos (transferidos não)
- Cópia mostra "pendente desde dd/MM" (dataOriginal anterior ao dia do card ou a hoje)
- Tarefa solta continua sendo MOVIDA (não duplica), inclusive com subtarefas
- Arquivar card = arquivar os pendentes (sai do calendário se não sobrar feito/transferido); excluir card apaga os itens e a série que ficar sem card
- "+ Novo grupo" (ao lado de "+ Nova tarefa", no Dia e na Semana) com nome de série existente reusa a série; já existindo no dia, `ErroDeValidacao`
- Procedimento = título, categoria (e subcategoria) e etapas numeradas pela posição; SÓ isso (sem execução, versões, campos variáveis, anexos ou ligação com o calendário — removidos em 01/11/2026, não reintroduza sem o usuário pedir)
- Lista de procedimentos: um bloco por categoria (`agruparPorCategoria`), "Sem categoria" no fim; busca por título e texto das etapas (`buscarProcedimentos`, `src/lib/procedimentos.ts`)
- Novo procedimento grava ao clicar "Criar procedimento"; na página dele a edição grava sozinha (`useSalvarComAtraso` + `salvarProcedimento` com a lista inteira de etapas); excluir pede confirmação
- NUNCA crie campo de senha no app
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
- Testes obrigatórios: mover tarefas, contagem de dias pendentes, etapas e migração de procedimentos, copiar/mesclar grupos
- Ambiguidade na proposta: pergunte, não suponha
- Trabalho de interface: use a skill `frontend-design`

## Fases

1. Visão do dia (tarefas, seleção, concluídas agrupadas, reordenação)
2. Subtarefas com progresso ("2 de 5")
3. Categorias e subcategorias com cores e filtro
4. Semana, arrastar entre dias, ações de mover pendências
5. Procedimentos: título, categoria, etapas numeradas, lista por categoria e busca (remodelado em 01/11/2026)
6. Visões de mês e ano
7. Backup: exportar/importar JSON com anexos
8. Notas, fotos, desenho à mão livre, áudio
9. Compartilhamento (ver/editar) — FORA DO ESCOPO

Fases 1 a 8 concluídas: app completo para o uso planejado. Mudanças agora são ajustes pedidos pelo usuário.

- Ajuste 30/10/2026: grupos de tarefas (cards por dia em séries; levar a outro dia duplica o card com os pendentes) — detalhes em `docs/proposta-inicial.md`
- Ajuste 31/10/2026: arrastar o card leva o grupo inteiro (item só pela alça), menu → "Levar pendentes", volta desfaz a transferência sem card fantasma, Ctrl+Z
- Ajuste 01/11/2026: Procedimentos remodelados (só título, categoria e etapas; banco v7, backup formato 4) — detalhes em `docs/proposta-inicial.md`
- Ajuste 01/11/2026: categorias criadas e aplicadas ali mesmo (seletor único), aba Categorias com uso e ordem arrastável, card editável na Semana (banco v8, backup formato 5)
- Ajuste 01/11/2026 (em andamento): nova interface "folha pautada + barra lateral" na paleta violeta, uma fase por tela. Feitas: fase 0 (valores dos tokens), fase 1 (barra lateral com telas e o filtro do Dia), fase 2 (Dia: folha com cabeçalho, card como ficha, bolinha de categoria no lugar da faixa) e fase 3 (Semana: folha única, hoje circulado, tarefas como linhas, card como ficha)

## Armadilhas

- IMPORTANTE: datas são data local `YYYY-MM-DD` (America/Sao_Paulo); NUNCA use `new Date("YYYY-MM-DD")` nem `toISOString()` para dia — geram UTC e deslocam um dia. Use `src/lib/datas.ts`
- Testes rodam com `TZ=America/Sao_Paulo` (definido em `vite.config.ts`); sem `globals`, importe `describe/it/expect` de `vitest`
- Teste de tela: `renderizarApp(caminho)` (`src/test/`) monta rotas + layout reais (avisos incluídos)
- date-fns 4 pt-BR: `EEE` = "quarta" e `MMM` = "out", sem ponto — confira antes de testar textos de data
- Arrastar não é testável no jsdom (sem posições): cubra a lógica em `lib/quadro`, `lib/mover-grupos` e no repositório, e o gesto no Playwright (`e2e/`)
- E2E semeia dados importando os módulos do app pelo Vite (`await import('/src/db/...')` no `page.evaluate`) e fixa a data com `page.clock.setFixedTime`
- Teste que navega: espere um elemento da página nova (o endereço muda antes da tela desenhar)
- A área de avisos do Sonner é uma `region` ("Notifications"): filtre por nome ao contar regiões
- Nos testes, `Blob`/`File` são os do Node e `URL.createObjectURL` é fixo (`src/test/setup.ts`): o Blob do jsdom vira objeto vazio no fake-indexeddb
- Canvas, câmera, microfone e `createImageBitmap` não existem no jsdom: verifique desenho, foto e áudio no navegador
- Testes têm tsconfig próprio (`tsconfig.test.json`, com tipos do Node); o app não enxerga tipos do Node
- `userEvent.type`: `{` é tecla especial; para digitar `{{campo}}` escreva `'{{{{campo}}'`
- Playwright `getByLabel('Etapa 1')` / `getByRole(..., { name })` casam por trecho (pega "Excluir etapa 1", "Mover Trabalho"): use `{ exact: true }`
- `src/components/ui/` é gerado pelo shadcn: não editar à mão sem motivo; ignorado pelo oxlint e Prettier
- shadcn importa `cn` do pacote `cn` (oficial do shadcn), não de `@/lib/utils`
- Campo de criar item: use `CampoNovoItem`; ele limpa ANTES do `await` para não apagar o que o usuário já digitou
- Hover de linha usa grupo nomeado `group/linha` (linhas aninhadas); não use `group` simples
- Prévia no app: `.claude/launch.json` usa a porta 5180 — outra origem, então os dados de teste da prévia NÃO são os do usuário (5173)
- `crypto.randomUUID`, gravação de áudio e PWA exigem contexto seguro: `localhost` ou `https` (no Laragon, só com SSL ativo)
- Cores do visual são tokens em `src/index.css` (`nevoa`, `papel`, `tinta` #111019, `grafite` = cinza do texto secundário, `pauta`, `caneta` #8B3DFF, `violeta-profundo` #4B16A8 para destaques miúdos, `marca-texto` lavanda só para atrasos); componentes usam os tokens, nunca hex
- Submenu Radix em teste: use teclado (`ArrowRight`, `Enter`); no jsdom o ponteiro fecha o submenu
- E2E `corDaFaixa` lê a cor no PRIMEIRO `span[aria-hidden]` do card (no Dia e na Semana, a borda de cima da ficha): mantenha esse span primeiro ao mexer no card
