# MemorIA: proposta

App pessoal de organização em formato de calendário, para um computador, sem servidor. Este documento guarda a proposta das funcionalidades; o estado de cada uma está no `README.md`.

## Visão geral

- **Calendário:** visões de dia, semana, mês e ano. A semana começa na segunda.
- **Tarefas:** caixa de seleção, subtarefas com progresso, categoria e subcategoria coloridas, contagem de dias pendentes a partir da data original.
- **Mover é a função central:** mover só troca o dia; nunca copia nem apaga. Há "Adiar para amanhã", "Mover para outro dia", seleção múltipla, "Trazer pendências de ontem para hoje" e "Desfazer".
- **Procedimentos:** passo a passo reutilizável, com modo execução que nunca altera o original, campos variáveis, versões, histórico e agendamento no calendário.
- **Conteúdo:** notas, fotos, desenhos à mão livre, áudio e links ligados a tarefas, notas e procedimentos.
- **Backup:** exportar e importar tudo num JSON, anexos incluídos.
- **Fora do escopo:** compartilhamento, sincronização e versão para celular.

## Grupos de tarefas (ajuste de 30/10/2026)

### Conceito

Além do "+ Nova tarefa", o dia tem "+ Novo grupo". Um grupo é um card com título (ex.: "Casa"), categoria opcional e uma lista de itens, cada um com caixa de seleção. Ele vive em um dia.

A diferença para a tarefa solta com subtarefas: **ao mover um grupo para outro dia, só os itens pendentes vão.** Os concluídos ficam no card do dia original, como registro do que foi feito naquele dia. A tarefa solta com subtarefas continua se movendo inteira.

### Cenário de referência

1. Dia 30: grupo "Casa" com Limpar o quarto, Limpar o banheiro, Regar as plantas e Fazer almoço.
2. Os três primeiros são marcados e ficam riscados; o card mostra 3/4.
3. O card "Casa" é arrastado do dia 30 para o dia 31.
4. Dia 30: card "Casa" com os 3 concluídos, concluído (3/3). Dia 31: card "Casa" com "Fazer almoço", pendente desde o dia 30.
5. No dia 31 entram "Limpar a garagem" e "Lavar a roupa" no mesmo card.
6. Se o dia 31 já tivesse um card "Casa", os pendentes seriam mesclados nele, sem duplicar o card.

### Regras

- **Série:** o "Casa" do dia 30 e o do dia 31 são instâncias da mesma série. Grupos com o mesmo nome (sem diferenciar acento e maiúscula) são a mesma série. Mover, adiar ou trazer pendências procura a instância da série no destino: se existe, mescla; se não, cria.
- Sem nenhum item concluído, o card vai inteiro (não sobra card vazio). Com todos concluídos, o card não pode ser movido.
- Um item sozinho pode ir para outro dia: cai na instância da mesma série naquele dia.
- Tarefa solta pode entrar num grupo e item pode sair do grupo, virando tarefa solta.
- Itens se reordenam dentro do card; cards e tarefas soltas se reordenam entre si no dia.
- Cada item pendente mostra há quantos dias está pendente, pela data original do item.
- Adiar, mover, seleção múltipla e trazer pendências de ontem valem para grupos.
- Arquivar vale por item e pelo card inteiro (arquiva os pendentes; os concluídos continuam como registro).
- A categoria do grupo define a cor do card em todas as visões e vale para o filtro. Título e categoria são da série: mudar num dia muda em todos.
- Excluir o card apaga os itens dele, com anotações e anexos.

### Interface

- Card: barra lateral na cor da categoria, título, progresso (ex.: 3/4), botão de recolher, itens com caixa de seleção e "+ Adicionar item".
- Itens concluídos riscados no fim do card. Card concluído fica discreto, no grupo "Concluídas" do dia.
- Semana: card compacto na coluna, arrastável inteiro pelo cabeçalho ou item por item.
- Mês e ano: os itens dos grupos contam como tarefas do dia.

### Modelo de dados

- `GroupSeries { id, titulo, categoryId?, subcategoryId? }`
- `GroupInstance { id, seriesId, data, ordem, arquivado }`: no máximo uma por série e dia; `ordem` na mesma escala das tarefas soltas do dia.
- `Task.groupInstanceId?`: item de grupo (sem ele, tarefa solta). O item mantém `dataOriginal` e copia a categoria da série.
- Mover é uma transação única no Dexie: acha ou cria a instância de destino e leva só os pendentes.
