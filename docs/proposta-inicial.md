# MemorIA: proposta

App pessoal de organização em formato de calendário, para um computador, sem servidor. Este documento guarda a proposta das funcionalidades; o estado de cada uma está no `README.md`.

## Visão geral

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
