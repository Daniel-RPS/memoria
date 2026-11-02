# Projeto: MemorIA

App pessoal de organização em formato de calendário: tarefas, subtarefas, categorias coloridas e procedimentos reutilizáveis.

## Stack

- React 19.3 · TypeScript 7.0 (strict) · Vite 8.3 · Node 24
- Tailwind CSS 4.3 (plugin Vite, sem tailwind.config) · shadcn/ui preset nova (Radix, ícones lucide)
- React Router 8.5 · Formulários: React Hook Form 7.91 + Zod 4.6
- Dados: Dexie 4.4 + dexie-react-hooks (`useLiveQuery`) — IndexedDB, blobs para foto, desenho, áudio
- Arrastar e soltar: @dnd-kit/core 6.3 + sortable 10 · Datas: date-fns 4.4 + locale `pt-BR`
- Ícones: frimousse 0.4 (seletor de emoji) + emojibase-data 18 (pt) e simple-icons 16 (marcas, CC0), os dois últimos só em dev: o plugin `vite-recursos-de-icones.ts` serve `/marcas/indice.json`, `/marcas/<slug>.svg` e `/emojibase/pt/*.json` (dev) e copia para o `dist/` (build)
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
- Categoria/subcategoria: regras em `category-repository` (nome válido e único no nível, `ordem`, reordenar, uso, `moverCategoriaDeTipo`) e puras em `lib/categorias.ts`; ordem do usuário vale em todo o app (`montarCategorias`)
- IMPORTANTE: `Category.tipo` = `grupo` (grupos e tarefas soltas) ou `procedimento` (só Procedimentos). Nome único e `ordem` valem DENTRO do tipo; reordenar recebe só os ids de um tipo. Mudar de tipo limpa `categoryId`/`subcategoryId` dos itens do tipo antigo. Telas que só pintam buscam em todas (`useCategorias()`); quem escolhe usa `useCategorias(tipo)`. Sem `tipo`, `criarCategoria` cria grupo
- Classificar sem tipo (migração v9 e backup antigo): SEMPRE `separarPorTipo` (`lib/categorias.ts`); usada pelos dois tipos vira duas (a original fica grupo)
- Escolher categoria SEMPRE pelo seletor único `src/components/seletor-categoria/` (`SubmenuCategoria` no menu ⋯, `CampoCategoria` em formulário), com `tipo` obrigatório (`procedimento` só no editor de procedimento); ele cria categoria/subcategoria ali mesmo, no tipo, e já aplica. Menu que o contém é controlado (`open`) para o seletor fechar após criar
- Escolher cor SEMPRE por `PaletaCores` (`src/components/paleta-cores.tsx`: 12 cores + "Cor personalizada" com `MisturadorCor` + recentes); contas de cor (hex/HSV, `lerHex`, contraste, `coresRecentes`) puras em `lib/cores.ts`. Recentes são derivadas das categorias (`useCoresRecentes`), sem localStorage
- IMPORTANTE: mover tarefa SOLTA = só `data`/`ordem` via `moverTarefas`/`adiarTarefas`/`soltarTarefaNoDia`; NUNCA tocar em `dataOriginal`
- Ações de mover na UI passam por `useMoverTarefas` → `moverSelecao`/`adiarSelecao`/`trazerPendenciasDeOntem` (`group-repository`); aviso com "Desfazer" via `desfazerAcao`; Ctrl+Z (`useAtalhoDesfazer` no `LayoutApp`) desfaz a última enquanto o aviso está na tela
- Semana começa na segunda (`PRIMEIRO_DIA_DA_SEMANA` em `src/lib/semana.ts`); colunas do quadro em `src/lib/quadro.ts`
- Grade de mês/ano e resumo por dia em `src/lib/calendario.ts`; período via `useTarefasDoPeriodo`
- Arrastar no mês: `useDraggable` + teclado próprio (`coordenadasDaGrade`: lados ±1 dia, cima/baixo ±7)
- Item arrastável com clique: use `div` com `attributes` (num `<button>`, soltar o espaço dispara clique)
- Card da semana: mesmo `MenuGrupo` e `MenuItemGrupo` do Dia. O card inteiro arrasta o grupo (ponteiro); a alça ⋮⋮ do cabeçalho é o ativador (foco/espaço). Área com `data-sem-arrasto` (itens, menu ⋯, título em edição) não arrasta o card; item só pela alça ⋮⋮ (`useSortable`, alvo de soltar só para itens do mesmo card: solto no card reordena, em outro dia leva). NÃO use `stopPropagation` no `onKeyDown` do card: bloqueia o Ctrl+Z global (só formulários dentro de menu param as teclas)
- Banco Dexie na versão 10 (v2: `tasks.procedureId`; v3: 1ª versão dos grupos; v4: `groupCards`/`groupItems` com migração da v3 em `lib/migracao-grupos.ts`; v5: remove `groupInstances`; v6: marca `criadoPorTransferencia`; v7: procedimento vira etapas via `lib/migracao-procedimentos.ts`, apaga `procedureVersions`/`executions`, `tasks.procedureId` e anexos/notas de procedimento/passo; v8: `ordem` em categorias/subcategorias via `preencherOrdem`; v9: `tipo` em categorias via `separarPorTipo`; v10: `notes.vinculo` no lugar de `dono` (anotação de tarefa vira nota ligada) e `groupItems.cadeiaId`); mudar índice = nova `version()`
- IMPORTANTE: tabela ou campo novo no banco exige atualizar `esquemaBackup` (`src/lib/backup.ts`) e, se mudar a estrutura do JSON, `FORMATO_ATUAL`
- Importar backup SUBSTITUI tudo numa transação única (`importarDados`); blobs são convertidos fora da transação
- Anexo pertence ao `dono` {tipo, id} (`task` ou `note`); procedimento não tem anexo nem nota
- IMPORTANTE: nota pertence a UM `vinculo` {tipo: tarefa|grupo|item, id} ou a nada (avulsa). `grupo` = id da SÉRIE; `item` = `cadeiaId` do item (use `vinculoDoItem`), NUNCA o id da cópia. Categoria da nota vem do alvo (não é gravada). Regras puras em `lib/notas.ts` (dono/caminho, blocos da aba, filtros, busca, "Vincular a…"); gravação em `note-repository`
- `GroupItem.cadeiaId` = 1º item da cadeia `origemItemId`, copiado em toda cópia (`planejarLevarItens`) e nunca alterado; item novo/convertido nasce com `cadeiaId = id`; migração e backup antigo via `preencherCadeias` (`lib/grupos.ts`)
- Excluir tarefa/item/card NUNCA apaga notas: `soltarNotasSemAlvo` (na mesma transação) deixa avulsas as de alvo que sumiu; a confirmação usa `contarNotasQueFicamAvulsas`/`useAvisoNotasAvulsas`. Mover/levar/desfazer não tocam em notas. Excluir tarefa ou nota apaga os anexos dela (`excluirAnexosDe`)
- Colocar no grupo / tirar do grupo levam as notas (`trocarVinculoDasNotas`). Captura: linhas extras = nota ligada à tarefa (`idNota` no resultado; desfazer apaga só ela)
- Gaveta de notas: `ProvedorPainelNotas` (`src/components/notas/`, no `LayoutApp`) dá `usePainelDeNotas().abrir(vinculo, { criar })` e a contagem (`useQuantasNotas`) ao app todo; `ItensDeNotaDoMenu` nos menus ⋯ e `IndicadorNotas` ao lado do título (`data-sem-arrasto`; no Início, `revelarCom` mostra "Adicionar nota" no hover). Editor ÚNICO `EditorNota` (aba Notas e gaveta); "Adicionar nota" fechado em branco some (`descartarSeVazia`). Com a gaveta aberta (modal) o resto da tela fica fora do alcance nos testes: feche antes de conferir
- Aba Notas: cartões (`CartaoNota`: título com `after:` cobrindo o cartão e links do caminho com `z-10`), modo lembrado em `memoria:notas-modo` (`useModoDasNotas`), tipo/categoria/busca no endereço (`tipo`, `categoria`, `q`); filtro por dia (da última edição) lembrado em `memoria:notas-dia`. Recentes = um bloco por dia local (`agruparPorDia`/`rotuloDoDia` em `lib/notas`). "Nova nota" navega com `{ isNova: true }` e a `NotaPage` descarta a nota se sair em branco (`descartarSeVazia`); nota antiga em branco NUNCA é apagada sozinha. Texto do caminho quebra só entre palavras (`wrap-normal`)
- Blocos recolhíveis (Notas e Procedimentos): SEMPRE `SecaoRecolhivel` + `AcoesDasSecoes` (`src/components/secao-recolhivel.tsx`) com `useSecoesRecolhidas(escopo, isFiltrando)` (ids recolhidos em `memoria:recolhidos:<escopo>`; com busca/filtro tudo abre e o que recolher não é salvo)
- Filtro por dia: regra pura ÚNICA em `src/lib/filtro-de-data.ts` (`filtrarPorData`, `intervaloDoFiltro`, `rotuloDoFiltro`, `lerFiltroDeData`; momento UTC → dia local antes de comparar); tela SÓ pelo `SeletorDeDia` (`src/components/seletor-de-dia.tsx`) + `useFiltroDeDia(chave, atalhos)`. Procedimentos filtram por `criadoEm` (`memoria:procedimentos-dia`); rodapé do cartão = `previaDoProcedimento().datas`
- Ícone de procedimento/categoria: campo opcional `icone?: { tipo: 'emoji' | 'marca', valor }` (sem índice: não exigiu `version()` nova; backup formato 8, ícone inválido no arquivo é ignorado). Regras puras em `lib/icones.ts` (`esquemaIcone`, `resolverIcone` → marca que sumiu = neutro, `buscarMarcas`, recentes). Escolher SÓ por `SeletorIcone` (painel carregado sob demanda) e mostrar SÓ por `IconeDaEntidade` (`src/components/icones/`; marca = máscara CSS na cor oficial passada por `corDeTraco`). Categoria: `definirIconeDaCategoria`; `classificarTarefa` devolve o `icone`. Emoji digitado no meio do texto fica no texto. NUNCA desenhar/baixar logotipo de outra fonte nem usar marca fora do Simple Icons
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
- Colocar tarefa no grupo / tirar item = conversão com o MESMO id (`colocarNoGrupo`/`tirarDoGrupo`); as notas acompanham, subtarefas e anexos da tarefa não passam para o item
- Leitura reativa com `useLiveQuery` dentro de hooks da feature; não há store global
- Rotas em `src/app/router.tsx` dentro de `LayoutApp`; o app abre no Início (`/inicio`; `/` e `*` redirecionam); a data fica na URL (`/dia/YYYY-MM-DD`). Não há filtro por categoria (removido em 01/11/2026): todas as visões mostram todas as categorias
- Moldura: `BarraLateral` (`src/app/barra-lateral.tsx`). IMPORTANTE: recolher (só ícones) é SÓ escolha do usuário — botão ao lado do logo ou Ctrl+B, `useBarraRecolhida` (localStorage); trocar de tela NUNCA recolhe nem fecha o grupo. Dia/Semana/Mês/Ano no `GrupoCalendario` (`src/app/grupo-calendario.tsx`; recolhida = `GrupoCalendarioRecolhido`, menu), aberto/fechado em `useGrupoCalendarioAberto` (abre sozinho numa visão do calendário). Dicas pelo `DicaDaBarra` (Tooltip shadcn, ligado só na barra recolhida); localStorage sempre via `preferencia-local.ts`
- Logo: originais em `img/` (só PNG opaco, não alterar); recortes transparentes em `src/assets/logo-memoria.png` (completa) e `simbolo-memoria.png` (quadrado) para o tema escuro, e `logo-memoria-clara.png`/`simbolo-memoria-claro.png` para o claro ("Memor" em #1A1625, sem o halo escuro, roxo semitransparente reforçado; gerados com Pillow a partir dos escuros). `LogoDaBarra` renderiza os dois pares e o CSS (`dark:`) mostra o do tema (`invisible` esconde o outro do leitor de tela); recolher estreita a moldura cortando o nome e o símbolo surge por cima; favicon (`favicon.ico`, `favicon-32.png`) e `apple-touch-icon.png` em `public/`, sobre ficha na cor `tinta`; logo do README em `docs/logo-memoria.png`. Sem manifest/PWA
- Início (`src/features/inicio/`): coluna principal = captura rápida (RHF + Zod em `lib/captura.ts`; grava por `capturar`/`desfazerCaptura` em `captura-repository`, `NovaCaptura` é união por tipo) e mapa de conclusões; lateral (`ResumoLateral`) = Hoje, Atrasadas e Próximos 7 dias (`lib/inicio.ts`). Um texto apagado por modo (`DICA_DO_CAMPO` em `lib/captura`: na Tarefa, no título; no Grupo, só na linha do nome; em "Em grupo…", só na 1ª linha de item; o do nome tem a letra da Tarefa e o nome é `textarea` de uma linha só para esse texto quebrar a linha na tela estreita); `aria-label` fixos ("Título da tarefa", "Nome do grupo", "Item do grupo"). Tarefa = `textarea` que cresce (`field-sizing-content`): Enter cria, Shift+Enter quebra linha, `dividirTexto` separa título e anotação (vira nota ligada à tarefa, na mesma transação). Grupo/Em grupo… = `ItensDaCaptura` (nome em destaque só no Grupo + uma linha com caixinha por item, campo `itens: string[]`); teclado em `useLinhasDeItens` e cada edição pura em `lib/captura` (`inserirItemDepois`, `removerItemVazio`, `colarNoItem`): Enter = próxima linha, Backspace em vazio = apaga e sobe, ↑/↓, Ctrl+Enter cria, colar várias linhas = um item por linha. Nome do grupo = 1ª linha do texto da tarefa (`primeiraLinha`/`trocarPrimeiraLinha`): trocar de modo não perde texto nem itens. Grupo novo = série + card + itens numa transação; aviso `textoGrupoCriado`. Dia só Hoje/Amanhã/Escolher data…; a linha de controles cabe numa linha só a ~715px (não acrescente controle sem medir). Ctrl+K/N: `useAtalhoCaptura` (`src/app/`) navega para `/inicio` com `{ focarCaptura }` no estado
- Hoje/Atrasadas do Início: `montarResumoDoDia` (`lib/inicio.ts`, puro: grupos x soltas, ordem pelo dia e `ordem`, feitos/total sem transferidos, "há X dias", pendentes) e os MESMOS componentes nos dois blocos: `CardsDoResumo` → `CardDeGrupo` (faixa 3px + barra na cor de `corDeTraco`, que escurece/clareia até 3:1 sobre o papel; neutra = `grafite`) e `CardTarefasSoltas` (some sem tarefa); linhas em `linha-marcavel.tsx` (texto quebra, nunca `truncate`). Atrasadas = `onTrazer*` passados (selo "há X dias", "Trazer pendentes para hoje" no card via `mover`); título/contador em `text-alerta` (token laranja só para isso). `listarGruposAtrasados` traz todos os itens do card (o "1/3" conta os feitos)
- Item num grupo que já existe (captura "Em grupo…", "+" do bloco Hoje): SEMPRE `adicionarItensNaSerie(seriesId, data, titulos)` (`group-repository`: acha/reabre/cria o card do usuário no dia, itens no fim) e `desfazerItensAdicionados`; ordem/busca de séries em `lib/grupos` (`ordenarParaEscolher`, `filtrarSeries`)
- Tema e fundo (só camada visual): regras puras em `lib/aparencia.ts`; estado em `useAparencia` (`src/app/use-aparencia.ts`, `useSyncExternalStore` sobre localStorage `memoria:tema`/`memoria:fundo` + `matchMedia` + evento `storage`, que sincroniza as abas). `useAplicarTema` (no `LayoutApp`) põe `data-tema="claro|escuro"` no `<html>`, liga Ctrl+Shift+L e a transição de cores (`data-trocando-tema`, ~200 ms). IMPORTANTE: o script do `index.html` aplica o tema antes do React (sem piscar) com a MESMA regra/chave: mudou uma, mude a outra. Seletor no rodapé da barra (`SeletorAparencia`)
- Fundo: `FundoDoApp` (`src/app/fundo-do-app.tsx`) é camada `fixed` com `z-index: -1` e sem ponteiro; por isso a cor de fundo fica no `<html>` (NUNCA ponha `bg-*` no body nem na moldura do `LayoutApp`). CSS em `.fundo-do-app` no fim de `src/index.css`, só gradiente + `transform`; pausa com a aba escondida e para com `prefers-reduced-motion`
- Cor de categoria na TELA passa por `useCorNaTela` (`corNaTela` em `lib/cores.ts`: no escuro clareia 28%); o banco guarda sempre a cor escolhida. Seletor de cor/paleta mostram a cor crua
- Mapa de conclusões: TODA conta em `src/lib/estatisticas.ts` (puro); filtro = `SeletorCategoria` com `modo="filtro"` (lembrado por `useFiltroDoMapa`); semana do mapa começa no DOMINGO (como no GitHub), ao contrário do resto do app. Dia da conclusão = dia local de `concluidaEm`/`concluidoEm` (`diaDoMomento`); sem ele, o dia planejado
- Aviso com "Desfazer" + Ctrl+Z: `avisarComDesfazer` (`use-mover-tarefas.ts`), uma ação desfazível por vez
- Arrastar na Semana: `detectarAlvo` (`quadro-semana.tsx`) escolhe o dia pela coluna sob o ponteiro e, dentro dela, `closestCorners` (a prévia é larga e encosta na coluna vizinha)

## Modelo de dados (resumo)

- Toda entidade: `id` (`crypto.randomUUID()`), `criadoEm`, `atualizadoEm`; NUNCA ids autoincrementais (deixam aberta uma sync futura)
- Alterar índices = nova `version()` no Dexie, NUNCA editar a versão existente
- Category { id, nome, cor, tipo: grupo|procedimento, ordem } · Subcategory { id, categoryId, nome, cor?, ordem } (sem cor = variação da cor da categoria)
- Task { id, titulo, data, categoryId?, subcategoryId?, ordem (aceita decimais), status: pendente|concluida|arquivada, dataOriginal, concluidaEm? }
- GroupSeries { id, titulo (único, sem acento/maiúscula), categoryId?, subcategoryId? } — liga os cards de dias diferentes; categoria só dá cor
- GroupCard { id, seriesId, data, ordem, arquivado, criadoPorTransferencia? } — no máximo um por série e dia; encerrado é calculado (tem itens e nenhum pendente)
- GroupItem { id, cardId, titulo, ordem, status: pendente|concluido|transferido|arquivado, concluidoEm?, transferidoParaCardId?, origemItemId?, cadeiaId, dataOriginal }
- Subtask { id, taskId, titulo, concluida, ordem }
- Procedure { id, titulo, categoryId?, subcategoryId?, etapas: [{ id, texto, ordem }] } — etapas embutidas, sem tabela; `ordem` = posição (0, 1, 2…), regravada a cada salvamento (`numerarEtapas`)
- Note { id, titulo, conteudo, vinculo?: { tipo: tarefa|grupo|item, id } } · Attachment (foto, desenho, áudio, link) de tarefa ou nota

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
- Lista de procedimentos: um bloco por categoria (`agruparPorCategoria`), "Sem categoria" no fim; busca por título e texto das etapas (`buscarProcedimentos`, `src/lib/procedimentos.ts`). Cada bloco = grade `auto-fill/minmax(13rem)` de `CartaoProcedimento` (um `Link`; faixa de 3px em `corDeTraco`, neutra = `grafite`); prévia, "+ N etapas", contagem e "editado em" SÓ em `previaDoProcedimento` (puro)
- Editor de etapas: `LinhaEtapa` (rótulo "Etapa N" em linha, largura fixa, alinhado à 1ª linha; texto sem caixa até hover/foco; lixeira só no hover/foco). Enter insere a próxima logo depois e foca; Shift+Enter quebra; Backspace em etapa vazia apaga e volta para o fim da anterior
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
- Testes obrigatórios: mover tarefas, contagem de dias pendentes, etapas e migração de procedimentos, copiar/mesclar grupos, contagem do mapa de conclusões, notas vinculadas (cadeia do item, excluir vira avulsa)
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
- Ajuste 01/11/2026: nova interface "folha pautada + barra lateral" na paleta violeta (só camada visual): tokens, `BarraLateral` com o filtro do Dia, folhas com traço grafite, card como ficha, hoje circulado (`CirculoHoje`), menus por `data-slot` e `CabecalhoPagina` nas telas de lista — detalhes em `docs/proposta-inicial.md`
- Ajuste 01/11/2026: grupo "Calendário" na barra lateral (variação "traço de caneta": traço violeta desliza pela linha-guia; só CSS, sem biblioteca de animação)
- Ajuste 01/11/2026: barra lateral recolhível só pelo usuário (botão/Ctrl+B, lembrada; não recolhe mais na Semana), rótulo só "Calendário" e filtro por categoria removido do Dia
- Ajuste 01/11/2026: logo oficial na barra (completa ↔ símbolo), favicon, apple-touch-icon e README
- Ajuste 01/11/2026: tela Início (tela principal): captura rápida, Hoje/Atrasadas ao lado, próximos 7 dias e mapa de conclusões estilo GitHub — detalhes em `docs/proposta-inicial.md`. "Sem data" ficou de fora
- Ajuste 01/11/2026: modo claro/escuro/sistema, fundo (Aurora, pontos, grade com holofote, liso) e logo por tema — só camada visual
- Ajuste 01/11/2026: "Em grupo…" na captura e "+" no Hoje (`adicionarItensNaSerie`); mapa sem sequências/dia mais produtivo, filtro em menu
- Ajuste 01/11/2026: layout do Início — sem "Próxima semana", Próximos 7 dias na lateral (faixa discreta), captura multilinha (linhas extras = anotação ou itens) e mapa logo abaixo
- Ajuste 01/11/2026: captura cria o grupo já com os itens (nome em destaque + linhas com caixinha, teclado próprio, colar = vários itens) e "Em grupo…" usa a mesma lista
- Ajuste 01/11/2026: um texto apagado por modo no campo da captura ("Escreva a tarefa a ser feita" etc.)
- Ajuste 01/11/2026: Procedimentos em cartões (grade por categoria, prévia de 3 etapas) e editor de etapas compacto com Enter/Backspace — só camada visual, sem mudar o banco
- Ajuste 01/11/2026: Hoje e Atrasadas do Início em cards por tipo (um por grupo + "Tarefas soltas"), Atrasadas com título laranja e "Tudo em dia"
- Ajuste 02/11/2026: categorias por tipo (Grupos × Procedimentos, banco v9, backup formato 6) e cor personalizada com misturador — detalhes em `docs/proposta-inicial.md`
- Ajuste 02/11/2026: notas vinculadas a tarefa, grupo e item (gaveta lateral; aba Notas em cartões por categoria, grupo ou recentes; banco v10, backup formato 7) — detalhes em `docs/proposta-inicial.md`
- Ajuste 02/11/2026: blocos recolhíveis e filtro por dia em Notas (Recentes por dia) e Procedimentos (dia de criação); ícone (emoji ou marca do Simple Icons) em procedimentos e categorias dos dois tipos (backup formato 8)

## Armadilhas

- IMPORTANTE: datas são data local `YYYY-MM-DD` (America/Sao_Paulo); NUNCA use `new Date("YYYY-MM-DD")` nem `toISOString()` para dia — geram UTC e deslocam um dia. Use `src/lib/datas.ts`
- Testes rodam com `TZ=America/Sao_Paulo` (definido em `vite.config.ts`); sem `globals`, importe `describe/it/expect` de `vitest`
- Testes de tela: `findBy`/`waitFor` esperam 5 s (`configure` em `src/test/setup.ts`) e o Vitest usa metade dos núcleos (`maxWorkers`); NÃO passe `timeout` menor num teste (encurta a espera e volta a falhar com a máquina ocupada)
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
- `src/components/ui/` é gerado pelo shadcn: não editar à mão sem motivo; ignorado pelo oxlint e Prettier. O visual de menus/popovers/selects (borda, sombra lavanda, ✓ violeta) vem de regras por `data-slot` no fim de `src/index.css`
- shadcn importa `cn` do pacote `cn` (oficial do shadcn), não de `@/lib/utils`
- Campo de criar item: use `CampoNovoItem`; ele limpa ANTES do `await` para não apagar o que o usuário já digitou
- Hover de linha usa grupo nomeado `group/linha` (linhas aninhadas); não use `group` simples
- Prévia no app: `.claude/launch.json` usa a porta 5180 — outra origem, então os dados de teste da prévia NÃO são os do usuário (5173)
- `crypto.randomUUID`, gravação de áudio e PWA exigem contexto seguro: `localhost` ou `https` (no Laragon, só com SSL ativo)
- Molas são curvas CSS `linear()` no `@theme` (`ease-mola`, `ease-mola-suave`); animação sempre com `motion-reduce:transition-none`. Indicador que desliza usa passos fixos (item `h-8` + vão = 34px)
- Branding (cores, top 3, fontes, logo, tokens.json, paleta.html): `docs/branding/README.md`
- Cores do visual são tokens em `src/index.css` (`nevoa`, `papel`, `tinta` #111019, `grafite` = cinza do texto secundário, `pauta`, `caneta` #8B3DFF, `violeta-profundo` #4B16A8 para destaques miúdos, `marca-texto` lavanda só para atrasos; barra lateral: `barra`, `barra-borda`, `barra-texto`, `barra-suave`, `barra-realce`); componentes usam os tokens, nunca hex nem `white`/`black`. Os MESMOS nomes mudam de valor em `:root[data-tema='escuro']` (caneta #A274FF; texto sobre caneta = `text-primary-foreground`, escuro no tema escuro). `dark:` segue `data-tema`. Contraste AA conferido nos dois temas: token novo, confira também
- Submenu Radix em teste: use teclado (`ArrowRight`, `Enter`); no jsdom o ponteiro fecha o submenu
- Testes: o jsdom não tem `matchMedia`; `src/test/midia.ts` instala um e `simularMidia(consulta, casa)` simula sistema escuro/movimento reduzido
- E2E: semeadura das abas Notas/Procedimentos/Categorias em `e2e/semear-ajustes.ts`; o calendário do shadcn marca cada dia com `data-day="dd/MM/aaaa"`; no seletor de emoji (frimousse) cada emoji é `gridcell` com o nome em pt ("Casa")
- E2E `corDaFaixa` lê a cor no PRIMEIRO `span[aria-hidden]` do card (no Dia e na Semana, a borda de cima da ficha): mantenha esse span primeiro ao mexer no card
