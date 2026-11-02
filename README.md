<p align="center">
  <img src="docs/logo-memoria.png" alt="MemorIA" width="420" />
</p>

# MemorIA

App pessoal de organização em formato de calendário. Reúne tarefas do dia, subtarefas, **grupos de tarefas**, categorias coloridas e **procedimentos**: etapas numeradas de algo que você repete, como uma configuração de servidor ou uma rotina mensal.

Feito para **uso pessoal, num computador**. Funciona **sem servidor e sem banco externo**: todos os dados (inclusive fotos, desenhos e áudios) ficam no banco de dados do próprio navegador (IndexedDB). Não precisa de MySQL, de SSL nem de internet.

> **Status:** completo para o uso planejado. Fases 1 a 8 concluídas (dia, subtarefas, categorias, semana, mover tarefas, procedimentos, mês, ano, backup, notas e anexos), mais os grupos de tarefas e as categorias criadas ali mesmo (01/11/2026). Interface nova na paleta violeta, com barra lateral e telas em folha pautada (01/11/2026); Dia, Semana, Mês e Ano agrupados em **Calendário** na barra lateral, que recolhe só quando você manda, com a logo oficial na barra e na aba do navegador (01/11/2026). O app abre no **Início**: anotar tarefas e grupos sem escolher uma visão, resumo de hoje, atrasadas e próximos dias (em cards por grupo e tarefas soltas), e o mapa de conclusões do último ano (01/11/2026). Modo claro e escuro (ou seguindo o sistema) e um fundo animado discreto, com a logo ajustada a cada tema (01/11/2026). Notas ligadas a tarefas, grupos e itens, com a aba Notas organizada por categoria, grupo ou data (02/11/2026). Compartilhamento e versão para celular ficaram fora do escopo (veja abaixo).

## Funcionalidades

Legenda: ✅ pronto · 🔜 planejado

### Início

- ✅ Tela principal do app (primeiro item da barra lateral): o app abre nela
- ✅ Captura rápida, já focada, com um texto apagado que diz o que fazer em cada modo ("Escreva a tarefa a ser feita", "Crie o grupo e coloque a(s) tarefa(s) a ser(em) feita(s)", "Escolha o grupo e coloque a tarefa"). Tarefa: Enter cria e Shift+Enter quebra a linha (as linhas de baixo viram uma nota da tarefa). Categoria pelo seletor de sempre (com "+ Nova categoria" ali mesmo) e dia: Hoje, Amanhã ou Escolher data…
- ✅ **Grupo já com os itens**: o nome do grupo em destaque e, embaixo, uma linha com caixinha para cada item. Enter no nome desce para o 1º item; Enter num item abre o próximo; Backspace num item vazio apaga a linha e volta; ↑/↓ andam entre as linhas; colar várias linhas gera um item por linha; Ctrl+Enter (ou **Criar**) cria tudo de uma vez, na ordem, ignorando linhas vazias. Aviso "Grupo Casa criado com 3 itens · 02/11 · Ver no dia · Desfazer" (desfazer tira o grupo e os itens). Trocar entre Tarefa, Grupo e Em grupo… não perde o que foi digitado
- ✅ Anexar foto/imagem ou link à tarefa já na captura
- ✅ **Em grupo…**: a mesma lista de itens (sem o nome) vai para um grupo que já existe (ex.: "fazer lasanha" no grupo Casa), no dia escolhido. Lista de grupos com busca, os usados por último primeiro, na cor da categoria do grupo e com "já existe em 01/11" quando o card do dia já existe; senão o card é criado. Aviso "1 item adicionado a Casa · 01/11 · Ver no dia · Desfazer"
- ✅ **Ctrl+K** (ou **N**, fora de um campo de texto) abre o Início com a captura focada, de qualquer tela
- ✅ Aviso "Tarefa criada para 03/11 · Ver no dia · Desfazer" (Ctrl+Z também desfaz)
- ✅ Ao lado, discretos: **Hoje** e **Atrasadas** em cards por tipo — um card por grupo (faixa e barra de progresso na cor da categoria, "1/3", itens marcáveis com os feitos no fim, nome que abre o Dia; "+" ao passar o mouse adiciona item) e depois um card **Tarefas soltas**. Em Atrasadas (título em laranja), "há 5 dias" em cada pendente, **Trazer para hoje** na tarefa, **Trazer pendentes para hoje** no grupo ou **Trazer todas**; sem nada atrasado, "Tudo em dia". Abaixo, **Próximos 7 dias** (faixa com quantos pendentes em cada dia, dica "4 pendentes em 04/11"; clicar abre o Dia)
- ✅ Mapa de conclusões do último ano, no formato do GitHub: tarefas e itens de grupo concluídos por dia (pelo dia em que foram concluídos), 5 tons de violeta pelos quartis, dica "5 concluídos em 12/10/2026", clique abre o Dia e filtro por categoria num menu compacto com busca (lembrado ao reabrir o app)

### Calendário e tarefas

- ✅ Visão do dia com caixas de seleção, navegação entre dias e botão "Hoje"
- ✅ Criar tarefa digitando na linha "Nova tarefa" e renomear clicando no título
- ✅ Tarefas concluídas riscadas, agrupadas em "Concluídas" (recolhível) no fim do dia
- ✅ Reordenar tarefas arrastando (com mouse ou teclado)
- ✅ Indicação de há quantos dias uma tarefa está pendente
- ✅ Subtarefas com progresso (ex.: "2 de 5"), reordenáveis e abertas logo abaixo da tarefa
- ✅ Categorias e subcategorias com cores (subcategoria sem cor usa um tom da categoria)
- ✅ Criar e aplicar categoria ou subcategoria ali mesmo, no seletor de categoria (menu ⋯ do card e da tarefa, "+ Novo grupo" e editor de procedimento)
- ✅ Ordem das categorias e subcategorias definida por você, arrastando; vale em todo o app
- ✅ Categorias de dois tipos, independentes: **Grupos** (grupos e tarefas do Início e do calendário) e **Procedimentos** (só na aba Procedimentos); cada seletor mostra só as do seu tipo
- ✅ Cor personalizada: além das 12 cores, um misturador (área de saturação e brilho, barra de matiz, código hexadecimal e prévia nos dois temas) e as últimas 6 cores personalizadas usadas
- ✅ Visão de semana (segunda a domingo)
- ✅ Grupos de tarefas: um card (ex.: "Casa") com itens; levar a outro dia cria uma cópia só com os pendentes e o card original fica como registro
- ✅ Visão de mês, com arrastar tarefas entre dias
- ✅ Visão de ano, com a quantidade de tarefas (e de itens de grupo) e os atrasos de cada dia

### Mover tarefas

- ✅ Arrastar uma tarefa de um dia para outro na visão de semana (mouse ou teclado)
- ✅ Trazer as pendências de ontem para hoje
- ✅ Adiar para amanhã
- ✅ Mover para outro dia escolhido no calendário
- ✅ Mover ou adiar várias tarefas selecionadas de uma vez
- ✅ "Desfazer" depois de mover ou adiar
- ✅ Arquivar (tirar do calendário sem concluir)
- 🔜 Ver e restaurar tarefas arquivadas

### Grupos de tarefas

- ✅ "+ Novo grupo" ao lado de "+ Nova tarefa" (Dia e Semana): um card com título, categoria opcional (só cor) e itens com caixa de seleção
- ✅ Um grupo "Casa" e a categoria "Casa" são coisas independentes
- ✅ Levar o card a outro dia **duplica**: o card fica no dia original e o destino recebe só os itens não marcados
- ✅ No original, o item levado fica cinza, sem caixa, com "transferido para 31/10" (leva ao card de destino); o progresso vira "3 feitos · 1 transferido" e o card aparece encerrado
- ✅ Na cópia, o item mostra "pendente desde 30/10"
- ✅ Cards com o mesmo nome são a mesma **série**: se o destino já tem o card, os itens entram nele
- ✅ Card com tudo marcado não pode ser levado; card sem nada marcado leva tudo (o original fica)
- ✅ Na Semana, arrastar o card (cabeçalho ou qualquer área fora dos itens) leva **todos os pendentes juntos**; a alça ⋮⋮ de um item leva só aquele item
- ✅ Enquanto arrasta, a prévia mostra "Casa · 2 pendentes → 03/11"
- ✅ Menu ⋯ do card igual no Dia e na Semana: "Levar pendentes para amanhã", "Levar pendentes para…", Renomear, Categoria, Arquivar e Excluir
- ✅ Na Semana, o card se edita ali mesmo: clicar no título renomeia; "+ Adicionar item"; clicar no item renomeia; menu ⋯ do item exclui; a alça ⋮⋮ reordena dentro do card
- ✅ Levar de volta para um dia onde o item ficou como transferido **desfaz a transferência**: o item de lá volta a pendente, sem duplicata; o card que nasceu da transferência e ficou sem itens some sozinho (card criado por você nunca some sozinho)
- ✅ Toda movimentação mostra "2 itens levados para amanhã · Desfazer"; **Ctrl+Z** faz o mesmo enquanto o aviso está na tela
- ✅ Colocar uma tarefa solta no grupo e tirar um item do grupo
- ✅ Adiar, mover para outro dia, seleção múltipla e trazer pendências de ontem seguem a mesma regra; no modo Selecionar, clicar no cabeçalho do card marca o card inteiro
- ✅ Arquivar um item ou o card inteiro

### Procedimentos

- ✅ Procedimento = título, categoria e etapas numeradas sozinhas (Etapa 1, 2, 3…)
- ✅ Adicionar, renomear (ali mesmo) e excluir etapas; a numeração se ajusta. Editor compacto: uma linha por etapa, Enter cria a próxima e Backspace numa etapa vazia apaga
- ✅ Edição grava sozinha; excluir o procedimento pede confirmação
- ✅ Lista separada por categoria, com a cor dela, e "Sem categoria" no fim, em cartões com as 3 primeiras etapas (01/11/2026)
- ✅ Busca em títulos e etapas, sem diferenciar acentos

### Conteúdo e dados

- ✅ Notas com texto livre que se salva sozinho, busca e anexos
- ✅ Notas ligadas a uma tarefa, a um grupo (valem em todos os dias dele) ou a um item (acompanham o item levado a outro dia), abertas numa gaveta lateral sem sair da tela
- ✅ Aba Notas em cartões, por categoria, por grupo ou recentes, com filtros e busca também pelos nomes da tarefa, do grupo e da categoria
- ✅ Anexos em tarefas e notas: fotos, desenhos à mão livre, gravações de áudio e links
- ✅ Backup: exportar e importar todos os dados, incluindo anexos

### Aparência

- ✅ Tema Claro, Escuro ou Sistema (segue o sistema operacional), lembrado entre sessões e igual em todas as abas
- ✅ Fundo à escolha: Aurora (luz difusa que deriva devagar), Grade de pontos, Grade com holofote ou Liso

## Stack

| Área                | Tecnologia                       |
| ------------------- | -------------------------------- |
| Interface           | React 19 + TypeScript 7 + Vite 8 |
| Estilo              | Tailwind CSS 4 + shadcn/ui       |
| Rotas               | React Router 8                   |
| Formulários         | React Hook Form + Zod            |
| Dados locais        | IndexedDB com Dexie 4            |
| Arrastar e soltar   | dnd-kit                          |
| Datas               | date-fns 4 (pt-BR)               |
| Testes              | Vitest + Testing Library         |
| Testes no navegador | Playwright                       |
| Qualidade           | oxlint + Prettier                |

Não há servidor nem banco externo: o app roda inteiro no navegador.

## Como instalar e rodar

Pré-requisito: [Node.js](https://nodejs.org/) 22 ou mais recente (desenvolvido com o 24).

```bash
npm install
```

```bash
npm run dev
```

Depois, abra no navegador **`http://localhost:5173`**.

> **Sempre pelo mesmo endereço e no mesmo navegador.** Os dados ficam guardados para o endereço em que o app abre. Por isso a porta é fixa: se a 5173 estiver ocupada, o `npm run dev` mostra um erro em vez de abrir em outra porta, onde o app pareceria vazio. Feche o que estiver usando a porta e rode de novo.

### Usando

- O app abre no **Início**, com o campo pronto: escreva e tecle Enter para criar uma tarefa de hoje. Shift+Enter abre outra linha, que vira uma nota da tarefa. Em **Grupo**, escreva o nome, Enter, e um item por linha (Enter abre a próxima, Backspace numa linha vazia volta); Ctrl+Enter cria o grupo com tudo. Escolha também a categoria e o dia. Tab passa pelo tipo, categoria e dia. De qualquer tela, **Ctrl+K** (ou **N**) volta para cá com o campo pronto.
- Para pôr um item num grupo que já existe, escolha **Em grupo…**, o grupo (busque pelo nome) e o dia; a categoria vem do grupo. No bloco **Hoje**, o **+** que aparece ao passar o mouse num grupo também adiciona item.
- No Início, marque o que é de hoje no bloco **Hoje** e traga o que ficou para trás em **Atrasadas**. Clique num dia dos **Próximos 7 dias** ou num quadrado do mapa para abrir aquele dia.
- Na barra lateral, **Calendário** junta Dia, Semana, Mês e Ano. Clicar nele só abre e fecha (escolher uma visão não fecha o grupo); o app lembra a escolha e abre o grupo sozinho quando você está numa dessas visões. Pelo teclado: Tab até ele, Enter ou espaço abre e fecha, setas andam entre as visões.
- Para dar mais espaço à tela, recolha a barra pelo botão ao lado do nome **MemorIA** ou com **Ctrl+B** (de novo para expandir). Recolhida, ela mostra só os ícones, com o nome ao passar o mouse; o ícone de calendário abre Dia, Semana, Mês e Ano num menu. O app lembra se ela estava recolhida.
- No rodapé da barra lateral, os ícones de sol, lua e monitor escolhem o tema: **Claro**, **Escuro** ou **Sistema** (o padrão, que acompanha o sistema operacional). **Ctrl+Shift+L** alterna entre claro e escuro. O ícone de camadas ao lado escolhe o **fundo**: Aurora (padrão), Grade de pontos, Grade com holofote ou Liso. Com a barra recolhida, um ícone só abre tema e fundo. A animação do fundo para quando a aba fica escondida e não roda se o sistema pede movimento reduzido.
- Escreva na linha **Nova tarefa** e tecle Enter; o campo continua pronto para a próxima.
- Clique no título para renomear (Enter salva, Esc cancela).
- Arraste pela alça à esquerda para reordenar. Pelo teclado: foque a alça, tecle espaço, use as setas e espaço de novo.
- O menu **⋯** de cada tarefa tem Renomear, Adicionar subtarefa, Categoria, Arquivar e Excluir.
- Clique no progresso ("2 de 5") para abrir ou fechar as subtarefas. Concluir todas as subtarefas não conclui a tarefa: você decide.
- **Categorias** tem duas seções lado a lado: **Grupos** (vale para grupos e tarefas do Início e do calendário) e **Procedimentos** (só na aba Procedimentos). Cada uma tem o seu **+ Nova categoria** (nome e cor), que já cria no tipo da seção. O **+** pequeno ao lado do nome cria uma subcategoria. Clique no nome para renomear e na bolinha para trocar a cor. Cada categoria mostra quantos itens a usam ("1 grupo · 2 tarefas" ou "1 procedimento"). Arraste pela alça ⋮⋮ para mudar a ordem dentro da seção. O mesmo nome pode existir nos dois tipos (ex.: "Github"), mas não repetido no mesmo. No menu **⋯**: **Mover para Procedimentos** (ou **para Grupos**), que avisa quais itens ficarão "Sem categoria", e **Excluir**, que pede confirmação e não apaga nada além da categoria: os itens ficam "Sem categoria" (ou, ao excluir uma subcategoria, só perdem a subcategoria).
- **Cor personalizada**: depois das 12 cores, a bolinha de arco-íris abre o misturador ali mesmo. Arraste o ponto na área (saturação e brilho) e na barra de matiz, ou digite/cole o código (`#3b82f6` ou `3b82f6`). A prévia mostra o nome na cor, no tema claro e no escuro, e avisa quando a cor fica com pouco contraste num deles (só avisa). Enter ou **Aplicar** escolhe; Esc ou **Cancelar** volta. Pelo teclado, as setas movem o ponto e a matiz (com Shift, passos maiores). Ao lado, as últimas cores personalizadas usadas em categorias, para reaproveitar.
- Não precisa sair da tela para usar uma categoria nova: em **Categoria ›** (menu ⋯), ao lado de **Novo grupo** ou no campo **Categoria** do procedimento, use **+ Nova categoria** ou **+ Nova subcategoria** (aparece ao passar o mouse sobre a categoria). Enter cria e já aplica ao item; Esc volta.
- Tudo se atualiza sozinho em todas as telas, inclusive em outra aba do navegador aberta no app.
- Mover uma tarefa só muda o dia dela: nada é copiado ou apagado, e a contagem "pendente há N dias" continua contando desde o dia em que foi criada.
- No menu **⋯**: **Adiar para amanhã** e **Mover para outro dia…**. Para várias de uma vez, use **Selecionar** acima da lista. Depois de mover, o aviso no rodapé tem **Desfazer**.
- Quando sobra algo pendente ontem, a página de hoje oferece **Trazer para hoje** (tarefas soltas vêm; itens de grupo são levados).
- **+ Novo grupo**, ao lado de **Nova tarefa**, cria um card. Escreva os itens em **Adicionar item**.
- Arrastar um card para outro dia (na Semana ou no Mês), ou usar **Levar pendentes para amanhã** e **Levar pendentes para…** (menu **⋯** do card, no Dia e na Semana), leva **todos** os itens pendentes de uma vez para o card desse grupo no outro dia. O card original fica onde estava, como registro: os itens levados aparecem como "transferido para 03/11". Enquanto arrasta, a prévia mostra "Casa · 2 pendentes → 03/11".
- Na Semana, para levar um item só, arraste pela alça **⋮⋮** que aparece à esquerda dele ao passar o mouse; solto no próprio card, ele só muda de posição. Apertar no resto do item não arrasta nada.
- Levou para o dia errado? Arraste de volta: o item volta a ser pendente no card de antes (nada duplicado) e o card que tinha sido criado para recebê-lo some, se ficou vazio. Ou use **Desfazer** no aviso / **Ctrl+Z**.
- Tarefas soltas continuam sendo **movidas** (não copiadas).
- Grupos com o mesmo nome são o mesmo grupo em dias diferentes: se o destino já tem o card "Casa", os itens entram nele. Renomear ou trocar a categoria do card vale para todos os dias.
- Arraste uma tarefa solta para dentro de um card, ou um item para fora (vira tarefa solta). Pelo menu **⋯** também: **Colocar no grupo** e **Tirar do grupo**. As notas acompanham (a tarefa vira item e o item vira tarefa); subtarefas e anexos da tarefa não passam para o item.
- Em **Procedimentos**, **Novo procedimento** pede título, categoria (e subcategoria, se quiser) e etapas (**Adicionar etapa** quantas vezes quiser). A lista mostra um cartão por procedimento, com as 3 primeiras etapas. Clique no cartão (ou Tab até ele e Enter) para ver e editar: o texto das etapas se edita ali mesmo e tudo grava sozinho ("Salvo"). Enter cria a próxima etapa (Shift+Enter quebra a linha) e Backspace numa etapa vazia apaga e volta para a anterior. A lixeira, que aparece ao passar o mouse, exclui a etapa e a numeração se ajusta.
- Em **Mês**, cada dia mostra até 3 pendentes (atrasadas com marca-texto) e o resto como "+N". Arraste uma tarefa para outro dia; pelo teclado, foque a tarefa, tecle espaço, use as setas (lados = um dia, cima/baixo = uma semana) e espaço de novo.
- Em **Ano**, o tom de cada dia indica quantas tarefas há, e um ponto amarelo marca pendência atrasada. Clique no mês ou no dia para abrir.
- Em **Notas**, **Nova nota** abre uma página que se salva sozinha enquanto você escreve (nota avulsa; **Vincular a…** liga a uma tarefa, grupo ou item, **Desvincular** solta).
- Nota de uma tarefa, grupo ou item: menu **⋯ → Adicionar nota** (ou **Ver notas (N)**) no Dia e na Semana; no Início, passe o mouse na linha ou no card e clique no ícone de nota. Abre uma gaveta à direita com o mesmo editor da aba Notas. Quem tem nota mostra um ícone discreto ao lado do título (com o número quando há mais de uma); clique para abrir. A nota de um item aparece em todos os dias para onde ele foi levado; a de um grupo, em todos os dias do grupo.
- Excluir uma tarefa, grupo ou item com notas avisa antes: as notas viram avulsas, nada é apagado. Arquivar não mexe nelas.
- A aba **Notas** mostra todas as notas em cartões: a quem pertencem ("Hostinger › Fazer Deploy"; clique no nome para abrir o dia), prévia, quando foi editada e os tipos de anexo. Organize **Por categoria**, **Por grupo** ou **Recentes** (a escolha fica lembrada), filtre por tipo (tarefas, grupos, itens, avulsas) e categoria, e busque também pelo nome da tarefa, do grupo ou da categoria.
- Anexos (em notas e no menu **⋯ → Anexos** de uma tarefa):
  - **Foto:** escolha uma ou várias imagens. Fotos com mais de 2048 px são reduzidas para não encher o armazenamento e o backup.
  - **Desenho:** desenhe com mouse, caneta (sensível à pressão) ou dedo; cores, espessuras, borracha e desfazer. O lápis na miniatura reabre para continuar o desenho.
  - **Áudio:** grave pelo microfone (o navegador pede permissão na primeira vez). Para sozinho em 10 minutos.
  - **Link:** só endereços `http://` ou `https://`; abrem em outra aba.
  - Excluir um anexo mostra **Desfazer** por alguns segundos.

Outros comandos:

| Comando          | O que faz                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| `npm run build`  | Gera a versão de produção                                                 |
| `npm test`       | Roda os testes                                                            |
| `npm run e2e`    | Testes no navegador (Playwright, porta 5190; capturas em `e2e/capturas/`) |
| `npm run lint`   | Verifica o código                                                         |
| `npm run format` | Formata o código                                                          |

## Backup e restauração

Os dados ficam no IndexedDB do navegador. Por isso, **limpar os dados do site ou trocar de navegador apaga tudo**. O app pede ao navegador armazenamento persistente, mas o navegador nem sempre concede; a página **Backup** mostra a situação e permite pedir de novo.

- **Fazer backup:** em **Backup → Baixar backup**, o app baixa `memoria-backup-AAAA-MM-DD.json` com tudo: tarefas, subtarefas, grupos, categorias, procedimentos, notas e anexos (fotos, desenhos e áudios vão dentro do arquivo). A página lembra quando foi o último backup neste navegador.
- **Restaurar:** em **Backup → Escolher arquivo de backup**, o app confere o arquivo e mostra o que tem nele ao lado do que você tem agora. Ao confirmar **Substituir meus dados**, todos os dados deste navegador são trocados pelos do arquivo.
- Arquivo que não é backup do MemorIA, que foi alterado ou que veio de uma versão mais nova do app é recusado, com a explicação, e nada muda.
- A troca é feita de uma vez: se algo falhar no meio, os dados atuais ficam como estavam.
- Antes de restaurar, use **Baixar backup dos dados atuais** se quiser poder voltar.

Recomendação: faça backup com frequência e guarde o arquivo fora do computador (pendrive ou nuvem).

## Roadmap

| Fase | Entrega                                                                                | Status         |
| ---- | -------------------------------------------------------------------------------------- | -------------- |
| 1    | Visão do dia: tarefas, caixas de seleção, concluídas riscadas e agrupadas, reordenação | ✅             |
| 2    | Subtarefas com progresso                                                               | ✅             |
| 3    | Categorias e subcategorias com cores e filtro                                          | ✅             |
| 4    | Visão de semana, arrastar entre dias e ações de mover pendências                       | ✅             |
| 5    | Procedimentos: título, categoria, etapas numeradas, lista por categoria e busca        | ✅             |
| 6    | Visões de mês e ano                                                                    | ✅             |
| 7    | Backup: exportar e importar (JSON com anexos)                                          | ✅             |
| 8    | Notas (ligadas a tarefas, grupos e itens), fotos, desenhos à mão livre e áudio         | ✅             |
| 9    | Compartilhamento (ver ou editar), com servidor                                         | Fora do escopo |

## Fora do escopo

Decidido em 30/10/2026: o MemorIA é só para um computador, para organizar os seus compromissos.

- **Compartilhamento (fase 9)** e **sincronização entre aparelhos**: exigiriam um servidor. A estrutura dos dados já está preparada (identificadores universais e data de alteração em cada registro), caso um dia isso mude.
- **Versão para celular**: a interface foi feita para tela de computador.
- **Abrir sem terminal (opcional):** o app pode ser servido pelo Laragon em `https://memoria.test`. Isso exige ativar o SSL no Laragon (sem `https` o navegador bloqueia funções que o app usa) e levar os dados para o novo endereço com o backup.
