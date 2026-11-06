# Regras de negócio (cards, progresso, procedimentos)

> Detalhe de uma área do MemorIA. Leia só quando for mexer nela (o índice está no `AGENTS.md`). Se algo aqui divergir do código, o código vale: corrija este arquivo.

- Mover tarefa entre dias é a função central: alterar `data`, NUNCA copiar + apagar
- Concluída: riscada, vai para grupo "Concluídas" recolhível no fim do dia
- Dias pendentes = hoje − `dataOriginal`, exibido em toda pendente com `dataOriginal` < hoje; mover/adiar NÃO zera
- Ações: trazer pendências de ontem para hoje, adiar para amanhã, mover para outro dia, mover várias selecionadas
- Arquivar = tirar do calendário sem concluir; tudo o que foi arquivado vive na aba Arquivados (ver Arquivados em Arquitetura)
- Card vive num dia. Arrastar/adiar/mover/trazer de ontem DUPLICA: o original fica (registro do dia) e só os PENDENTES vão juntos, em ordem e numa operação, para o card da série no destino (mescla se existir). Levar de volta a um dia onde o item está transferido DESFAZ a transferência (não duplica)
- Sempre igual, para ser previsível: nada marcado = tudo vira transferido e a cópia leva tudo; tudo marcado (ou card vazio) = nada a copiar, ação bloqueada
- Transferido: cinza, sem riscar, sem caixa, não conta como pendente nem feito; etiqueta "transferido para dd/MM" leva ao card de destino. Desmarcar no original não mexe na cópia
- Progresso: ativo "3/4"; encerrado "3 feitos · 1 transferido". Mês/ano contam itens pendentes e feitos (transferidos não)
- Cópia mostra "pendente desde dd/MM" (dataOriginal anterior ao dia do card ou a hoje)
- Tarefa solta continua sendo MOVIDA (não duplica), inclusive com subtarefas
- Arquivar card = arquivar o card INTEIRO (`arquivado`+`arquivadoEm`, itens ficam como estão; desarquivar devolve igual; antes só os pendentes); excluir card apaga os itens e a série que ficar sem card
- "+ Novo grupo" (ao lado de "+ Nova tarefa", no Dia e na Semana) com nome de série existente reusa a série; já existindo no dia, `ErroDeValidacao`
- Procedimento = título, categoria (e subcategoria) e etapas numeradas pela posição; SÓ isso (sem execução, versões, campos variáveis, anexos ou ligação com o calendário — removidos em 01/11/2026, não reintroduza sem o usuário pedir)
- Lista de procedimentos: blocos SÓ por `montarBlocosDeProcedimentos` (`lib/procedimentos`): toda categoria de Procedimento vira bloco, vazia inclusive (linha "Nenhum procedimento nesta categoria" + "+ Novo procedimento aqui", que abre o editor com a categoria pelo estado da navegação, `EstadoNovoProcedimento`), "Sem categoria" no fim só com itens; com busca/filtro só blocos com resultado; convite "Criar o primeiro procedimento" só sem procedimentos e sem categorias; busca por título e texto das etapas (`buscarProcedimentos`, `src/lib/procedimentos.ts`). Cada bloco = grade `auto-fill/minmax(13rem)` de `CartaoProcedimento` (um `Link`; faixa de 3px em `corDeTraco`, neutra = `grafite`); prévia, "+ N etapas", contagem e "editado em" SÓ em `previaDoProcedimento` (puro)
- Editor de etapas: `LinhaEtapa` (rótulo "Etapa N" em linha, largura fixa, alinhado à 1ª linha; texto sem caixa até hover/foco; lixeira só no hover/foco). Enter insere a próxima logo depois e foca; Shift+Enter quebra; Backspace em etapa vazia apaga e volta para o fim da anterior
- Novo procedimento grava ao clicar "Criar procedimento"; na página dele a edição grava sozinha (`useSalvarComAtraso` + `salvarProcedimento` com a lista inteira de etapas); excluir pede confirmação
