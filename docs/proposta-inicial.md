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
