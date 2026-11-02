# MemorIA: proposta

App pessoal de organização em formato de calendário, para um computador, sem servidor. Este documento guarda a proposta das funcionalidades; o estado de cada uma está no `README.md`.

## Visão geral

- **Início (tela principal):** captura rápida de tarefas e grupos, resumo de hoje, atrasadas, próximos 7 dias e mapa de conclusões do último ano. As visões do calendário ficam para ver por período.
- **Calendário:** visões de dia, semana, mês e ano. A semana começa na segunda.
- **Tarefas:** caixa de seleção, subtarefas com progresso, categoria e subcategoria coloridas, contagem de dias pendentes a partir da data original.
- **Mover é a função central:** mover só troca o dia; nunca copia nem apaga. Há "Adiar para amanhã", "Mover para outro dia", seleção múltipla, "Trazer pendências de ontem para hoje" e "Desfazer".
- **Procedimentos:** título, categoria e etapas numeradas automaticamente. Lista separada por categoria ("Sem categoria" no fim) e busca por título e texto das etapas. Sem modo execução, versões, campos variáveis, anexos ou ligação com o calendário (removidos em 01/11/2026).
- **Conteúdo:** notas, fotos, desenhos à mão livre, áudio e links ligados a tarefas e notas.
- **Backup:** exportar e importar tudo num JSON, anexos incluídos.
- **Fora do escopo:** compartilhamento, sincronização e versão para celular.

## Grupos de tarefas (ajuste de 30/10/2026)

A primeira versão movia o card e tratava os itens como tarefas. Foi corrigida para o comportamento abaixo.

### Conceito

O grupo é um **card**, uma entidade própria, diferente de tarefa e de categoria. Tem título (ex.: "Casa"), categoria opcional (só para cor e filtro) e uma lista de itens com caixa de seleção. Um grupo "Casa" e a categoria "Casa" são independentes. "+ Novo grupo" fica ao lado de "+ Nova tarefa" nas visões Dia e Semana.

### Comportamento central: levar o card a outro dia DUPLICA

O card original não sai do lugar. No dia de destino surge uma cópia só com os itens não marcados.

Dia 30, card "Casa": [x] Arrumar o quarto · [x] Arrumar o banheiro · [ ] Fazer comida · [x] Lavar garagem.

Arrastando para o dia 31:

- **Dia 30** (fica, é o registro do dia): os três marcados continuam; "Fazer comida" fica visível, cinza, sem riscar e sem caixa, com a etiqueta "transferido para 31/10". Progresso: "3 feitos · 1 transferido"; o card aparece encerrado.
- **Dia 31** (cópia nova): [ ] Fazer comida, com "pendente desde 30/10". Depois entram "Lavar roupa" e "Regar plantas".

### Regras

- O item transferido não conta como pendente nem como concluído e não tem caixa ativa. A etiqueta leva ao card do dia de destino.
- Os cards são ligados pela **série**. Se o destino já tem um card da série, os pendentes entram nele, sem criar outro card.
- Tudo marcado (ou card vazio): não há o que copiar e a ação fica bloqueada.
- Nada marcado: o original fica e a cópia leva tudo (o comportamento é sempre o mesmo).
- Desmarcar um item no original depois da transferência não mexe na cópia.
- Um item arrastado sozinho vai para o card da série naquele dia (criado se precisar) e fica "transferido" no original.
- "Adiar para amanhã", "Mover para outro dia", seleção múltipla e "Trazer pendências de ontem" fazem a mesma duplicação.
- Itens reordenáveis no card; cards e tarefas soltas reordenáveis entre si no dia.
- Tarefas soltas continuam sendo **movidas** (não duplicam).
- Mês e ano contam itens pendentes e concluídos; transferidos não contam.
- Uma tarefa solta pode virar item (e vice-versa); subtarefas, anotação e anexos não passam para o item.
- Arquivar vale por item e pelo card.

### Interface

- Card: barra lateral na cor da categoria, título, progresso, recolher, itens e "+ Adicionar item".
- Ao arrastar, a pré-visualização diz o que vai acontecer: "Copiar 1 item pendente para 31/10".
- No mês, cada card com pendências aparece como um chip ("Casa · 1"); arrastá-lo também duplica.

### Modelo de dados

- `GroupSeries { id, titulo, categoryId?, subcategoryId? }`
- `GroupCard { id, seriesId, data, ordem, arquivado }`: no máximo um por série e dia; `ordem` na mesma escala das tarefas soltas.
- `GroupItem { id, cardId, titulo, ordem, status: pendente | concluido | transferido | arquivado, concluidoEm?, transferidoParaCardId?, origemItemId?, dataOriginal }`
- Duplicar é uma transação Dexie: acha ou cria o card de destino da mesma série, cria itens pendentes (com `origemItemId` e a mesma `dataOriginal`) e marca os originais como `transferido`.
- Banco v4/v5 e backup formato 3 convertem os grupos da primeira versão (v3 / formato 2).

## Procedimentos (remodelação de 01/11/2026)

A primeira versão (seções, passos, subpassos, código, alertas, campos variáveis, modo execução, histórico, versões, anexos e agendamento) ficou complicada demais e foi substituída por esta.

- A aba tem "+ Novo procedimento", a busca (título e texto das etapas) e a lista com um bloco por categoria, na cor dela, e "Sem categoria" no fim.
- Criar/editar: título, categoria e etapas numeradas sozinhas. "+ Adicionar etapa" quantas vezes quiser; cada etapa se renomeia ali mesmo e se exclui, e a numeração se ajusta. A edição grava sozinha. Excluir o procedimento pede confirmação.
- Modelo: `Procedure { id, titulo, categoryId?, etapas: [{ id, texto, ordem }], criadoEm, atualizadoEm }`.
- Banco v7 converte os existentes (título e categoria mantidos; passos de todas as seções viram etapas na ordem, cada subpasso logo após o seu passo) e apaga versões, execuções, o vínculo das tarefas e os anexos/anotações de procedimento e de passo.
- Backup formato 4. Backups até o formato 3 são convertidos do mesmo jeito ao importar.

## Categorias sem sair da tela (ajuste de 01/11/2026)

Antes, para usar uma categoria nova era preciso ir à aba Categorias e voltar.

- **Seletor único** (`src/components/seletor-categoria/`): "Sem categoria", as categorias com a bolinha de cor e as subcategorias recuadas, na ordem do usuário. "+ Nova categoria" (nome e paleta) e "+ Nova subcategoria" (nome; cor opcional, sem cor = tom da categoria) abrem um formulário ali mesmo: Enter cria, Esc volta. O que for criado já fica aplicado ao item e o menu fecha. Nome vazio ou repetido no mesmo nível (sem diferenciar maiúsculas e acentos) aparece como erro do campo.
- Usado no menu ⋯ do card (Dia e Semana) e da tarefa, ao lado de "+ Novo grupo" e no editor de procedimento (no lugar do `<select>`). O filtro do Dia continua com os botões, só que na ordem do usuário.
- **Aba Categorias**: criar no topo (nome e cor); abaixo, a lista com cor, nome editável, uso ("4 tarefas · 2 grupos · 1 procedimento"), subcategorias recuadas com "+ Nova subcategoria" e excluir com confirmação que diz o que acontece (itens ficam "Sem categoria" ou só perdem a subcategoria; nada mais é apagado). Ordem arrastando, das categorias e das subcategorias dentro da categoria.
- **Card na Semana** com as mesmas ações do Dia: o mesmo menu ⋯, renomear clicando no título, "+ Adicionar item", renomear o item clicando nele, excluir pelo menu ⋯ do item e reordenar pela alça ⋮⋮ (solto no próprio card muda a posição; em outro dia, leva o item, como antes).
- **Sincronizado**: todas as telas leem com `useLiveQuery`, então qualquer mudança aparece na hora, também em outra aba aberta no app.
- **Modelo**: `Category { id, nome, cor, ordem }`, `Subcategory { id, categoryId, nome, cor?, ordem }` e `Procedure` ganha `subcategoryId?`. Banco v8 preenche `ordem` das existentes (categorias por nome, subcategorias pela criação, a ordem mostrada antes). Backup formato 5 inclui `ordem`; nos anteriores ela é preenchida ao importar.
- O tom automático da subcategoria continua pela ordem de **criação**: reordenar não troca as cores.

## Nova interface: folha pautada com barra lateral (ajuste de 01/11/2026)

Escolhida entre três direções num protótipo (folha pautada, mesa de controle com barra lateral e fichas coloridas): a mistura das duas primeiras, na paleta violeta. Mudou só a camada visual; dados, regras, arrastar e atalhos ficaram iguais.

- **Paleta** (tokens em `src/index.css`, mesmos nomes de antes): violeta elétrico #8B3DFF (`caneta`: ação, caixas marcadas, tela ativa), violeta profundo #4B16A8 (destaques miúdos, como "transferido para"), grafite #111019 (`tinta`) e papel branco. Atrasos usam o marca-texto lavanda.
- **Barra lateral** grafite com as telas. (Ajuste posterior de 01/11/2026: o filtro por categoria saiu e ela só recolhe quando o usuário manda, pelo botão ou Ctrl+B.)
- **Folha**: Dia, Semana, Mês e Ano ficam numa folha branca com um traço grafite sob o cabeçalho; as telas de lista (Procedimentos, Notas, Categorias, Backup) têm o mesmo traço no cabeçalho.
- **Card de grupo** vira uma ficha presa na folha: borda de cima na cor da categoria, sombra lavanda deslocada e barra de progresso violeta. Substitui a faixa lateral descrita em "Grupos de tarefas › Interface".
- **Tarefa solta**: bolinha de cor junto do nome da categoria (no Mês, os chips mantêm a faixa à esquerda).
- **Hoje**: número em violeta, circulado a caneta na Semana e no Mês, com fundo lavanda na coluna/célula.
- **Menus ⋯ e seletor de categoria**: borda de papel e sombra lavanda; só aparência (o seletor continua com "+ Nova categoria" e formulário).

## Início: a tela principal (ajuste de 01/11/2026)

Antes, para anotar era preciso escolher Dia, Semana, Mês ou Ano. Agora o app abre no Início (`/inicio`; `/` e endereços desconhecidos levam para lá) e as visões do calendário servem para ver por período. Layout escolhido entre três variações de protótipo: coluna principal (captura, próximos 7 dias e mapa) e, ao lado, Hoje e Atrasadas discretos, sem cartão.

- **Barra lateral**: "Início" (ícone de casa) no topo, acima de Calendário; recolhida, vira ícone com dica.
- **Captura rápida**: campo único focado ao abrir; Enter cria. Tipo Tarefa ou Grupo (itens um por linha ou "Adicionar item"); categoria pelo seletor único; dia por Hoje, Amanhã, Próxima semana (segunda seguinte, pois a semana do app começa na segunda) ou calendário (padrão: Hoje). Na tarefa, anexar foto/imagem ou link (o que a fase 8 já tinha; desenho e áudio continuam no painel da tarefa). Grupo com nome existente reusa a série, como no "+ Novo grupo". Depois de criar: "Tarefa criada para 03/11 · Ver no dia · Desfazer" (Ctrl+Z também). Ctrl+K ou N (fora de campo de texto) abre o Início com a captura focada.
- **Hoje**: tarefas e itens de grupo do dia, marcáveis ali. **Atrasadas**: pendentes de dias anteriores (tarefas e cards com pendentes), "há X dias" pela `dataOriginal`, "Trazer para hoje" pela mesma ação de mover do resto do app (tarefa é movida; card leva os pendentes). **Próximos 7 dias**: pendentes por dia, clique abre o Dia.
- **Mapa de conclusões** (formato GitHub, regras puras em `src/lib/estatisticas.ts`): colunas = semanas de domingo a sábado (como no GitHub), dos últimos 12 meses. Conta tarefas soltas concluídas e itens de grupo concluídos pelo dia local de `concluidaEm`/`concluidoEm` (sem ele, o dia planejado); transferidos e arquivados não contam. Nível 0 e 4 faixas pelos quartis dos dias com conclusões, em tons de violeta. Dica "5 concluídos em 12/10/2026"; clique (ou Enter) abre o Dia; setas andam pela grade. Legenda Menos/Mais logo abaixo da grade. Filtro por categoria (item usa a categoria da série) num menu "Todas as categorias ▾" com busca (o `SeletorCategoria` em modo `filtro`, sem criar), lembrado no navegador. Sequências e dia mais produtivo saíram no ajuste de 01/11/2026.
- **Dados**: nada mudou no banco nem no backup. `GroupItem.concluidoEm` já existia (gravado ao marcar desde a v4) e já ia no backup.
- **Ficou de fora** (decisão de 01/11/2026): "Sem data" / caixa de entrada; exigiria `Task.data` opcional (nova versão do banco), um bloco próprio no Início e mudança no backup.

### Em grupo… (ajuste de 01/11/2026)

- Terceiro tipo na captura: o texto (e as linhas a mais) vira item de um grupo que já existe, no dia escolhido. Grupo e categoria seguem independentes: a cor vem da categoria da série e o seletor de categoria dá lugar ao de grupo ("usa a categoria do grupo").
- Seletor de grupo: busca sem diferenciar acento, séries pelo último uso (card ou item mexido por último), bolinha da cor e "já existe em 01/11" quando há card visível no dia.
- Regra única `adicionarItensNaSerie(seriesId, data, titulos)` (`group-repository`), numa transação: card visível do dia recebe os itens no fim; card arquivado é reaberto; sem card, cria um no fim do dia como card do usuário (sem `criadoPorTransferencia`, para não sumir sozinho). Itens nascem pendentes com `dataOriginal` = dia. Desfazer (`desfazerItensAdicionados`): apaga os itens; card criado some, reaberto volta a arquivado. Usada pela captura (também no grupo novo) e pelo "+" do bloco Hoje. Dia e Semana continuam com `criarItem` (o card já está na tela).
- Atalho "#Casa" no campo: não feito (um "#" no meio do título mudaria o tipo sem querer).

## Categorias por tipo e cor personalizada (ajuste de 02/11/2026)

Antes, todas as categorias ficavam numa lista só e apareciam em todo lugar.

- **Dois tipos independentes** (`Category.tipo`): `grupo` (grupos e tarefas soltas: Início, Dia, Semana, Mês, Ano e filtro do mapa) e `procedimento` (só a aba Procedimentos). Ordem e nome único valem dentro do tipo (o mesmo nome pode existir nos dois). As telas continuam achando a cor pelo id em todas as categorias; só quem escolhe filtra pelo tipo (`useCategorias(tipo)`; `SeletorCategoria`, `CampoCategoria` e `SubmenuCategoria` recebem `tipo`).
- **Aba Categorias**: duas seções lado a lado (uma embaixo da outra na tela estreita), cada uma com título, contagem, "+ Nova categoria" (já nasce do tipo) e a própria lista de arrasto (não dá para soltar na outra). O "+ Nova subcategoria" que ocupava uma linha embaixo de cada categoria virou um "+" pequeno ao lado do nome. Menu ⋯: "Mover para Procedimentos/Grupos" (com itens usando, a confirmação diz quais ficarão "Sem categoria"; vai para o fim da outra seção, com as subcategorias) e "Excluir".
- **Migração (banco v9)** pela regra pura `separarPorTipo` (`lib/categorias.ts`): usada só por grupos/tarefas ou sem uso → grupo; só por procedimentos → procedimento; pelos dois → duas com o mesmo nome e cor: a original (mesmo id) fica como grupo e uma cópia, com as subcategorias copiadas, recebe os procedimentos (religados com a subcategoria certa). A ordem é renumerada por tipo, mantendo a sequência. Backup formato 6 inclui `tipo`; backup antigo sem ele passa pela mesma regra ao ser lido.
- **Cor personalizada**: a `PaletaCores` (único componente de cor, usado na aba e no seletor) ganhou a 13ª bolinha (arco-íris; com cor personalizada escolhida, mostra essa cor com o ✓) e o misturador (`misturador-cor.tsx`, só React/CSS/pointer events): área saturação × brilho, barra de matiz, campo hex (`lerHex` aceita com/sem "#" e maiúsculas), prévia nos dois temas com o ajuste de tom da tela e aviso "Pouco contraste no tema escuro/claro" abaixo de 3:1 (só aviso). Enter aplica, Esc cancela; setas (Shift = passo maior). Recentes = até 6 cores fora da paleta das categorias/subcategorias editadas por último (`coresRecentes`), derivadas do banco: aparecem nas duas abas e entram no backup, mas somem quando nenhuma categoria usa mais a cor. A cor continua sendo hex no banco.

## Notas vinculadas (fase 8, ajuste de 02/11/2026)

Antes, as notas eram soltas (sem ligação com nada) e cada tarefa tinha uma "anotação" única, escrita embaixo da linha no Dia.

- **A quem pertence** (`Note.vinculo?: { tipo, id }`, um campo só para que a nota tenha no máximo um dono; índice `[vinculo.tipo+vinculo.id]`): `tarefa` (id da tarefa solta), `grupo` (id da **série**: a nota vale em todos os dias do grupo) ou `item` (`cadeiaId` do item). Sem vínculo = avulsa. Uma tarefa, grupo ou item pode ter várias notas. A categoria NÃO fica na nota: vem do alvo (do grupo, para o item), então trocar a categoria do grupo muda o bloco da nota na hora.
- **Item levado a outro dia**: cada cópia é um item novo (`origemItemId`), então o item ganhou `cadeiaId` = id do primeiro item da cadeia, copiado em toda cópia e nunca alterado. A nota aponta para a cadeia e aparece em todos os dias. Ida, volta (reativar o ancestral e apagar a cópia), desfazer e o "card fantasma" (que pode apagar o primeiro item) não mexem nas notas, porque nenhuma dessas ações muda a `cadeiaId` de quem sobra. Ligar ao primeiro item não bastava justamente por causa do card fantasma.
- **Tarefa movida**: é a mesma tarefa, a nota vai junto. **Colocar no grupo**: as notas passam para o item (mesmo id, cadeia nova). **Tirar do grupo**: as notas da cadeia passam para a tarefa (os registros "transferido" de outros dias deixam de mostrá-las).
- **Excluir** tarefa, item ou card: a confirmação avisa ("Esta tarefa tem 2 notas. Elas ficarão como notas avulsas.") e as notas cujo alvo deixou de existir viram avulsas na mesma transação (`soltarNotasSemAlvo`). Item com outros dias na cadeia não avisa (a nota continua lá); excluir item sem nota segue sem confirmação. Arquivar não mexe nas notas.
- **Interface**: o menu ⋯ da tarefa, do card e do item ganhou "Adicionar nota" e "Ver notas (N)"; no Início (sem menu ⋯) o ícone de nota aparece ao passar o mouse. Ícone discreto ao lado do título (número quando há mais de uma; na Semana fica no fluxo do texto e tem `data-sem-arrasto`). Gaveta lateral (`Sheet` do shadcn, provedor no `LayoutApp`) com o vínculo no topo, a lista de notas do alvo e o MESMO editor da aba Notas (`EditorNota`), que tem "Vincular a…" (busca tarefas, grupos e itens) e "Desvincular". "Adicionar nota" fechado em branco não deixa nota vazia. A anotação embaixo da tarefa no Dia saiu: o painel da tarefa ficou só com os anexos.
- **Aba Notas**: todas as notas em cartões (grade `auto-fill/minmax(14rem)` como Procedimentos): faixa na cor da categoria, título (ou a 1ª linha do texto, sem gravar), prévia de 2 linhas, caminho com ícones ("Hostinger › Hostinger › Fazer Deploy", com links para o Dia no dia mais perto de hoje) e "editada há…" com os tipos de anexo. Modos "Por categoria" (categorias do tipo Grupo na ordem do usuário, "Sem categoria" e "Notas avulsas" no fim), "Por grupo" (notas do grupo e dos itens, depois "Tarefas soltas" e "Notas avulsas") e "Recentes", lembrado em localStorage. Filtros de tipo e categoria no endereço; a busca procura também nos nomes do vínculo.
- **Dados**: banco v10 (`notes` indexado por vínculo, `groupItems.cadeiaId`); a anotação de tarefa existente vira nota ligada a ela, as outras notas ficam avulsas, sem perder texto, anexos nem datas. Backup formato 7 com `vinculo` e `cadeiaId`; backup antigo passa pela mesma regra (anotação de tarefa → nota da tarefa; resto avulsa; cadeia calculada).
- Regras puras em `lib/notas.ts` e `preencherCadeias` (`lib/grupos.ts`); gravação em `note-repository`. (O pedido citava `src/domain/notes.ts` e `CategoryPicker`; o projeto usa `src/lib` + repositórios e o `SeletorCategoria`.)
