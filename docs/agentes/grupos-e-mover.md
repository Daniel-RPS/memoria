# Grupos, itens e mover/levar

> Detalhe de uma área do MemorIA. Leia só quando for mexer nela (o índice está no `AGENTS.md`). Se algo aqui divergir do código, o código vale: corrija este arquivo.

- IMPORTANTE: mover tarefa SOLTA = só `data`/`ordem` via `moverTarefas`/`adiarTarefas`/`soltarTarefaNoDia`; NUNCA tocar em `dataOriginal`
- Ações de mover na UI passam por `useMoverTarefas` → `moverSelecao`/`adiarSelecao`/`trazerPendenciasDeOntem` (`group-repository`); aviso com "Desfazer" via `desfazerAcao`; Ctrl+Z (`useAtalhoDesfazer` no `LayoutApp`) desfaz a última enquanto o aviso está na tela
- `GroupItem.cadeiaId` = 1º item da cadeia `origemItemId`, copiado em toda cópia (`planejarLevarItens`) e nunca alterado; item novo/convertido nasce com `cadeiaId = id`; migração e backup antigo via `preencherCadeias` (`lib/grupos.ts`)
- Grupos: `db/repositories/group-repository.ts` (cards, itens, copiar, desfazer, converter) e regras puras em `src/lib/grupos.ts`
- IMPORTANTE: grupo NÃO é tarefa nem categoria. Itens são `GroupItem` (tabela própria); tarefas são só as soltas
- IMPORTANTE: TODA regra de levar itens de grupo está em `src/lib/mover-grupos.ts` (`planejarLevarItens`, puro: estado → mudanças; `inverterMudancas` para o Desfazer). O repositório (`copiarItens`) só carrega o estado, grava numa transação e guarda o inverso em `ResultadoAcao.desfazer`. Nada de regra de movimentação em componente
- Levar = copiar para o card da MESMA série no destino (cópia pendente com `origemItemId` e mesma `dataOriginal`; original `transferido` com `transferidoParaCardId`). O card original NUNCA sai do lugar
- IMPORTANTE: se a cadeia `origemItemId` do item tem um ancestral `transferido` num card do destino, é VOLTA: reativa o ancestral e apaga a cópia (e as paradas do meio). Card com `criadoPorTransferencia` que perdeu itens e ficou sem pendente/feito é apagado; card criado à mão nunca
- `ordem` do dia é uma escala só para tarefas soltas e cards (`GroupCard.ordem`, `tabelaDoDia`); `ordem` de item é a posição dentro do card
- Colocar tarefa no grupo / tirar item = conversão com o MESMO id (`colocarNoGrupo`/`tirarDoGrupo`); as notas acompanham, subtarefas e anexos da tarefa não passam para o item
- Categoria na conversão: na UI SEMPRE `colocarNoGrupoComDesfazer`/`tirarDoGrupoComDesfazer`/`moverLote` (`lote-repository`: devolvem `avisos` + `desfazer` pelo instantâneo, que devolve tarefa, posição, anexos, notas e sessões) e aviso por `avisarConversao` (uma linha: só se perdeu a categoria) / `avisarLote` (o aviso de categoria substitui o "N movidas"), em `use-movimento-em-lote`. Regra pura em `src/domain/categoria-no-grupo.ts`: `mudancaAoEntrarNoGrupo` (tarefa com categoria que perde categoria ou subcategoria; só GANHAR subcategoria não avisa), `mudancaAoSairDoGrupo` (grupo com categoria), `textoDoAviso` (1 = texto com tarefa/grupo/categoria; várias = "N tarefas deixaram suas categorias."). Semana e captura do Início não convertem tarefa em item
- Aviso com "Desfazer" + Ctrl+Z: `avisarComDesfazer` (`use-mover-tarefas.ts`), uma ação desfazível por vez
