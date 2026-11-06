<p align="center">
  <img src="docs/logo-memoria.png" alt="MemorIA" width="420" />
</p>

# MemorIA

App pessoal de organização em formato de calendário. Reúne tarefas do dia, subtarefas, **grupos de tarefas**, categorias coloridas e **procedimentos**: etapas numeradas de algo que você repete, como uma configuração de servidor ou uma rotina mensal.

Feito para **uso pessoal, num computador**. Publicado em **[daniel-rps.github.io/memoria](https://daniel-rps.github.io/memoria/)** (ou rodando local). Funciona **sem servidor de dados e sem banco externo**: todos os dados (inclusive fotos, desenhos e áudios) ficam no banco de dados do próprio navegador (IndexedDB). Não precisa de MySQL, de SSL nem de internet.

> **Status:** completo para o uso planejado. Fases 1 a 8 concluídas (dia, subtarefas, categorias, semana, mover tarefas, procedimentos, mês, ano, backup, notas e anexos), mais os grupos de tarefas e as categorias criadas ali mesmo (01/11/2026). Interface nova na paleta violeta, com barra lateral e telas em folha pautada (01/11/2026); Dia, Semana, Mês e Ano agrupados em **Calendário** na barra lateral, que recolhe só quando você manda, com a logo oficial na barra e na aba do navegador (01/11/2026). O app abre no **Início**: anotar tarefas e grupos sem escolher uma visão, resumo em números de hoje e das atrasadas, com link para o dia, e os próximos dias, e o mapa de conclusões do último ano (01/11/2026). Modo claro e escuro (ou seguindo o sistema) e um fundo animado discreto, com a logo ajustada a cada tema (01/11/2026). Notas ligadas a tarefas, grupos e itens, com a aba Notas organizada por categoria, grupo ou data (02/11/2026). Blocos recolhíveis e filtro por dia em Notas e Procedimentos, e ícones (emoji ou logotipo de serviço) em procedimentos e categorias (02/11/2026). Importar tarefas, procedimentos e notas de texto, CSV, Google Keep ou parte de um backup; cards da Semana recolhíveis e colunas mais largas; categorias de Procedimentos reaproveitadas ao criar uma de Grupo (02/11/2026). O Dia separa **Grupos** e **Tarefas soltas** em duas seções, em lista ou em colunas; marque o que está fazendo agora como **em andamento**; o layout do Dia e da Semana (seções e grupos abertos) é lembrado, e a Semana ficou mais compacta (03/11/2026). Aba **Grupos** na barra lateral, com todos os grupos e quantos são, por categoria, em cartões que abrem e mostram pendentes, dias e feitos (06/11/2026). Compartilhamento e versão para celular ficaram fora do escopo (veja abaixo).

## Funcionalidades

Legenda: ✅ pronto · 🔜 planejado

### Início

- ✅ Tela principal do app (primeiro item da barra lateral): o app abre nela
- ✅ Captura rápida, já focada, com um texto apagado que diz o que fazer em cada modo ("Escreva a tarefa a ser feita", "Crie o grupo e coloque a(s) tarefa(s) a ser(em) feita(s)", "Escreva a tarefa do grupo"). Tarefa: Enter cria e Shift+Enter quebra a linha (as linhas de baixo viram uma nota da tarefa). Categoria pelo seletor de sempre (com "+ Nova categoria" ali mesmo), grupo (ou "Sem grupo") e dia: Hoje ou Escolher data (a data escolhida aparece no próprio botão, ex.: "05/11"; Hoje volta ao padrão)
- ✅ **Grupo já com os itens**: o nome do grupo em destaque e, embaixo, uma linha com caixinha para cada item. Enter no nome desce para o 1º item; Enter num item abre o próximo; Backspace num item vazio apaga a linha e volta; ↑/↓ andam entre as linhas; colar várias linhas gera um item por linha; Ctrl+Enter (ou **Criar**) cria tudo de uma vez, na ordem, ignorando linhas vazias. Aviso "Grupo Casa criado com 3 itens · 02/11 · Ver no dia · Desfazer" (desfazer tira o grupo e os itens). Trocar entre Tarefa e Grupo, ou escolher e tirar o grupo, não perde o que foi digitado
- ✅ Anexar foto/imagem ou link à tarefa já na captura
- ✅ **Item num grupo que já existe**: na Tarefa, o seletor "Sem grupo ▾" ao lado da categoria escolhe o grupo (ex.: Casa); o texto vira a mesma lista de itens (sem o nome), que vai para o card do grupo no dia escolhido. A categoria fica travada na do grupo ("Usa a categoria do grupo") e, depois de criar, o grupo continua escolhido para os próximos itens; "Sem grupo" devolve o texto como tarefa. No modo Grupo o seletor some. Lista de grupos com busca, "Sem grupo" no topo, os usados por último primeiro, na cor da categoria do grupo e com "já existe em 01/11" quando o card do dia já existe; senão o card é criado. Aviso "1 item adicionado a Casa · 01/11 · Ver no dia · Desfazer"
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
- ✅ **Selecionar várias e mover juntas** (05/11/2026): **Shift+clique** seleciona o intervalo entre a última clicada e esta, **Ctrl+clique** põe ou tira uma da seleção (tarefas soltas, itens de grupo e subetapas da mesma tarefa), sem precisar do botão Selecionar; **Esc** ou um clique fora limpa, e a caixa de concluir continua só concluindo. As selecionadas ficam com fundo suave e a barra mostra "3 selecionadas" com Em andamento, Prioridade, Adiar, Mover para…, Arquivar. **Arrastar** qualquer uma leva todas juntas, na ordem (a prévia diz "3 tarefas"): reordena dentro do grupo ou da seção, leva para outro grupo ou para as tarefas soltas, e na Semana para outro dia; **Alt+↑ / Alt+↓** sobe e desce uma posição. Subetapas da mesma tarefa também se reordenam juntas (não se misturam com tarefas). Cada movimento em lote é uma operação só, com aviso e **Desfazer** (também Ctrl+Z)
- ✅ **Prioridade e em andamento no topo** (05/11/2026): dentro de cada grupo, nas tarefas soltas do Dia e na coluna de cada dia da Semana, ficam primeiro o que é prioridade e está em andamento, depois o que está em andamento, depois a prioridade (cada bloco na ordem em que foi marcado) e, por fim, o resto na sua ordem. É só a ordem na tela: parar o andamento ou tirar a prioridade devolve o item ao lugar de antes, e concluir manda para o fundo. Dá para arrastar dentro de um bloco do topo para reordená-lo; o item solto fora do próprio bloco para na borda dele. Subir e descer são animados (parado com movimento reduzido)
- ✅ **Prioridade** (05/11/2026): bandeira discreta em tarefa solta e item de grupo (menu **⋯ › Marcar como prioridade**, tecla **P** com a linha em foco ou várias selecionadas, ou **Prioridade** na barra de Selecionar). Aparece no Dia e na Semana e, com o grupo recolhido, ao lado da contagem. É mantida ao adiar, mover, arrastar e duplicar o grupo (a cópia do item leva a bandeira) e some ao concluir. Backup formato 13
- ✅ Subetapas com progresso (ex.: "1/3"), reordenáveis e abertas logo abaixo da tarefa ou do item de grupo (05/11/2026)
- ✅ Categorias e subcategorias com cores (subcategoria sem cor usa um tom da categoria)
- ✅ Criar e aplicar categoria ou subcategoria ali mesmo, no seletor de categoria (menu ⋯ do card e da tarefa, "+ Novo grupo" e editor de procedimento)
- ✅ Ordem das categorias e subcategorias definida por você, arrastando; vale em todo o app
- ✅ Categorias de dois tipos, independentes: **Grupos** (grupos e tarefas do Início e do calendário) e **Procedimentos** (só na aba Procedimentos); cada seletor mostra só as do seu tipo
- ✅ Ícone por categoria: um emoji ou o logotipo de um serviço (ex.: GitHub), mostrado antes do nome em todo o app (02/11/2026)
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
- ✅ Colocar uma tarefa solta no grupo e tirar um item do grupo. O item usa a categoria do grupo: se a tarefa perde a dela, aparece o aviso "“Ligar para Fulano” foi para o grupo Casa e deixou a categoria Trabalho." com **Desfazer** (volta solta, com a categoria, no mesmo lugar); várias de uma vez dão um aviso só ("3 tarefas deixaram suas categorias."); tirar de um grupo com categoria avisa que ficou sem categoria (06/11/2026)
- ✅ Adiar, mover para outro dia, seleção múltipla e trazer pendências de ontem seguem a mesma regra; no modo Selecionar, clicar no cabeçalho do card marca o card inteiro
- ✅ Arquivar um item ou o card inteiro
- ✅ Na Semana, a seta do cabeçalho recolhe o card (fica só a alça, o nome, a contagem e a faixa de cor), lembrado por grupo e dia; "Expandir tudo" e "Recolher tudo" abaixo da navegação. Recolhido, o card continua arrastável e recebe item solto em cima (02/11/2026)
- ✅ Colunas da Semana com pelo menos ~260 px: sem espaço, a semana rola para o lado e abre mostrando hoje (02/11/2026)
- ✅ Aba **Grupos** na barra lateral (06/11/2026): quais grupos existem e quantos são, em blocos recolhíveis por categoria ("Sem categoria" por último), com busca pelo nome do grupo ou da categoria. Cada grupo é um cartão com faixa na cor da categoria, "3 pendentes · 5 feitos · 4 dias" e barra de progresso; clicar abre o cartão na largura toda, só para ler: os pendentes (com o dia, prioridade e em andamento), um chip por dia com card ("07/11 · 3/4", abre aquele dia) e "Feitos (n)" recolhido. "Abrir no dia" leva a hoje, senão ao próximo dia com card, senão ao mais recente. Grupo com todos os cards arquivados fica só em Arquivados

### Procedimentos

- ✅ Procedimento = título, categoria e etapas numeradas sozinhas (Etapa 1, 2, 3…)
- ✅ Adicionar, renomear (ali mesmo) e excluir etapas; a numeração se ajusta. Editor compacto: uma linha por etapa, Enter cria a próxima e Backspace numa etapa vazia apaga
- ✅ Edição grava sozinha; excluir o procedimento pede confirmação
- ✅ Lista separada por categoria, com a cor dela, e "Sem categoria" no fim, em cartões com as 3 primeiras etapas (01/11/2026)
- ✅ Busca em títulos e etapas, sem diferenciar acentos (e pelo nome da marca do ícone: "github")
- ✅ Ícone antes do título: emoji (busca em português, categorias e usados recentemente) ou marca (logotipos de serviços) (02/11/2026). Na aba Marcas, o símbolo do MemorIA vem primeiro e a Cloudflare está nas sugestões; buscar "amazon" ou "aws" oferece um ícone genérico (veja abaixo)
- ✅ Filtro pelo dia de criação (hoje, ontem, últimos 7 dias, este mês, um dia ou um intervalo); blocos de categoria recolhíveis e lembrados (02/11/2026)

### Conteúdo e dados

- ✅ Notas com texto livre que se salva sozinho, busca e anexos
- ✅ Notas ligadas a uma tarefa, a um grupo (valem em todos os dias dele) ou a um item (acompanham o item levado a outro dia), abertas numa gaveta lateral sem sair da tela
- ✅ Aba Notas em cartões, por categoria, por grupo ou recentes, com filtros e busca também pelos nomes da tarefa, do grupo e da categoria
- ✅ Blocos recolhíveis (lembrados entre sessões, com "Expandir tudo" e "Recolher tudo"), filtro pelo dia da última edição e Recentes separadas por dia ("Hoje", "Ontem", "sexta, 30/10") (02/11/2026)
- ✅ **Arquivados** (03/11/2026): nova aba na barra lateral (entre Categorias e Backup, com o total ao lado) que reúne o que foi arquivado: tarefas soltas, grupos de tarefas, notas e procedimentos. Cada um tem **Arquivar** no menu ⋯ (nos cartões de Notas e Procedimentos e nos editores também). A tela tem filtro por tipo com contagem (lembrado), busca no título, no texto e na categoria, um bloco recolhível por tipo e separadores por período (Esta semana · Este mês · Mais antigos). Cada linha oferece **Desarquivar**, **Abrir** (só leitura) e **Excluir permanentemente…** (com confirmação); dá para marcar várias linhas. Tarefa e grupo desarquivam para o dia que tinham, para hoje ou para outro dia (o padrão é hoje quando o dia já passou; `dataOriginal` nunca muda). Arquivar e desarquivar mostram aviso com "Desfazer" (também Ctrl+Z). Arquivar um grupo passa a levar o card inteiro, com feitos e pendentes. Arquivado some do Dia, Semana, Mês, Ano, Início, mapa de conclusões, Notas e Procedimentos. Banco v11 e backup formato 10 (guardam `arquivadoEm`)
- ✅ **Em andamento** (03/11/2026): marque o que você está fazendo agora, em tarefa solta ou item de grupo (menu **⋯ › Marcar como em andamento**, ou **Em andamento** na barra de Selecionar; pode haver várias ao mesmo tempo). A linha ganha um filete roxo, o rótulo "agora · 12 min" (atualizado a cada minuto no Dia) e um ponto que pulsa devagar (parado se o sistema pede menos movimento); o grupo recolhido mostra o ponto ao lado da contagem ("7/14"), e a Semana mostra só o ponto. O menu ⋯ mostra no rodapé "Tempo gasto: 1h 20 min". A tarefa não muda de lugar. A marca sai sozinha quando você move, adia, arrasta para outro dia (o grupo duplicado não leva a marca nem no original), conclui (basta marcar o quadradinho), arquiva ou exclui; tirar do grupo ou colocar num grupo no mesmo dia mantém. Mostra o aviso "Em andamento" / "Andamento parado" com **Desfazer**
- ✅ **Dados › Tempo nas tarefas** (04/11/2026): nova área **Dados** na barra lateral (entre Arquivados e Backup). Mede sozinho quanto tempo cada tarefa ou item de grupo ficou **Em andamento** (por horário de início e fim, sem perder nada ao fechar o navegador; soma o tempo de tarefas adiadas/movidas e de itens levados em grupos duplicados). Ao abrir o app com uma sessão ligada há 4h ou mais (ou que virou a meia-noite), um aviso discreto oferece **Manter** ou **Ajustar…** (corrige o horário de fim). Na tela **Dados**: filtros com conteúdo próprio (Hoje · Esta semana · Este mês · Escolher…, lembrado; "Escolher…" seleciona um dia único, com pontinho nos dias com tempo e datas futuras desabilitadas), resumo com 4 métricas (tempo médio por tarefa, tarefas realizadas, mais tempo e menos tempo ignorando < 1 min, com tooltip), gráfico **Por tarefa** com barras nítidas de 7px de altura fixa exibindo apenas o nome da tarefa, a barra e a duração (sem texto extra de categoria ou grupo ao lado; todas do dia em Hoje/dia escolhido ocupando a largura toda; Top 5 em Semana/Mês), gráfico de rosca minimalista por categoria baseado no tempo REAL trabalhado (jornada − pausas, dividindo minutos entre categorias ativas simultaneamente; tarefas da mesma categoria contam uma só vez; presente em Hoje, dia escolhido, Semana e Mês, com tempo ativo trabalhado no centro, legenda ordenada decrescente, linha de jornada e pausas e agrupamento "Outras" acima de 6 categorias), busca por título/categoria e lista **Por categoria (N)** ordenada por tempo total (a soma não aparece na linha da categoria, só o tempo de cada tarefa ao expandir), expansível com histórico de sessões detalhado (dia, período, duração, editar e excluir sessão, com categorias abertas lembradas). Banco v12 e backup formato 12
- ✅ **Layout lembrado** (03/11/2026): o Dia volta como você deixou (Lista ou Colunas, ordem das seções, **Grupos** e **Tarefas soltas** recolhidas ou abertas e quais grupos estão abertos), ao trocar de tela, recarregar ou no dia seguinte. Cada grupo é lembrado pela série, então a cópia levada para outro dia abre do mesmo jeito; grupo novo abre recolhido. A Semana usa os mesmos grupos. Fica no navegador (`memoria:dia-layout`); grupos excluídos são esquecidos. Janela estreita mostra Lista sem perder a preferência
- ✅ **Semana mais compacta** (03/11/2026): letra menor (13px) nas tarefas e itens, linhas finas separando os itens de cada grupo e checkbox proporcional; o texto longo continua quebrando linha
- ✅ Anexos em tarefas e notas: fotos, desenhos à mão livre, gravações de áudio e links
- ✅ Backup: exportar e importar todos os dados, incluindo anexos
- ✅ Importar conteúdo de fora em partes, sem apagar nada: texto ou Markdown, CSV, Google Keep e partes de um backup, com prévia, duplicados e "Desfazer" (02/11/2026, veja [Importar](#importar))
- ✅ Ao criar uma categoria de Grupo (aba Categorias ou seletor de categoria), "Usar de Procedimentos" mostra as categorias de Procedimentos como atalhos: um clique cria a de Grupo com o mesmo nome, cor, ícone e subcategorias (02/11/2026)

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
| Emojis              | frimousse + Emojibase (pt)       |
| Ícones de marca     | Simple Icons                     |
| Testes              | Vitest + Testing Library         |
| Testes no navegador | Playwright                       |
| Qualidade           | oxlint + Prettier                |

Não há servidor nem banco externo: o app roda inteiro no navegador.

### Ícones de marca e emojis

- Os logotipos de serviços vêm do [Simple Icons](https://simpleicons.org) (pacote `simple-icons`, licença [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)). As marcas pertencem aos seus donos; o app segue as regras da biblioteca e não usa nenhuma marca que ela não tenha (Microsoft, LinkedIn, Windows e Amazon estão entre as que ela proíbe). Nenhum logotipo é desenhado ou baixado de outro lugar.
- **Amazon e AWS** estão entre as marcas que o Simple Icons retirou a pedido do dono, então **não** aparecem como logotipo (nem desenhadas ou imitadas). Buscar "amazon" ou "aws" sugere um ícone genérico do lucide (pacote; nuvem ou servidor), com a dica "Ícone genérico (a marca não está disponível)", salvo como tipo `generico`.
- O símbolo do próprio MemorIA entra na aba Marcas como primeiro item (salvo como marca `memoria`), com os mesmos recortes PNG da barra lateral, um por tema.
- Os desenhos são servidos pelo próprio app (`/marcas/<slug>.svg`) e baixados só quando aparecem; um índice leve (`/marcas/indice.json`, ~51 kB compactado) é carregado quando o primeiro ícone de marca aparece ou o seletor abre. Marca que sair da biblioteca numa atualização vira um ícone neutro.
- Emojis: seletor [frimousse](https://frimousse.liveblocks.io) (MIT) com os dados em português do [Emojibase](https://emojibase.dev) (MIT), servidos pelo próprio app (funciona sem internet).

Cores, fontes e logo: [docs/branding/README.md](docs/branding/README.md).

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
- Para pôr um item num grupo que já existe, escolha o grupo no seletor ao lado da categoria (busque pelo nome) e o dia; a categoria vem do grupo. No bloco **Hoje**, o **+** que aparece ao passar o mouse num grupo também adiciona item.
- No Início, marque o que é de hoje no bloco **Hoje** e traga o que ficou para trás em **Atrasadas**. Clique num dia dos **Próximos 7 dias** ou num quadrado do mapa para abrir aquele dia.
- Na barra lateral, **Calendário** junta Dia, Semana, Mês e Ano. Clicar nele só abre e fecha (escolher uma visão não fecha o grupo); o app lembra a escolha e abre o grupo sozinho quando você está numa dessas visões. Pelo teclado: Tab até ele, Enter ou espaço abre e fecha, setas andam entre as visões.
- Para dar mais espaço à tela, recolha a barra pelo botão ao lado do nome **MemorIA** ou com **Ctrl+B** (de novo para expandir). Recolhida, ela mostra só os ícones, com o nome ao passar o mouse; o ícone de calendário abre Dia, Semana, Mês e Ano num menu. O app lembra se ela estava recolhida.
- No rodapé da barra lateral, os ícones de sol, lua e monitor escolhem o tema: **Claro**, **Escuro** ou **Sistema** (o padrão, que acompanha o sistema operacional). **Ctrl+Shift+L** alterna entre claro e escuro. O ícone de camadas ao lado escolhe o **fundo**: Aurora (padrão), Grade de pontos, Grade com holofote ou Liso. Com a barra recolhida, um ícone só abre tema e fundo. A animação do fundo para quando a aba fica escondida e não roda se o sistema pede movimento reduzido.
- Escreva na linha **Nova tarefa** e tecle Enter; o campo continua pronto para a próxima.
- Clique no título para renomear (Enter salva, Esc cancela).
- Arraste pela alça à esquerda para reordenar. Pelo teclado: foque a alça, tecle espaço, use as setas e espaço de novo.
- O menu **⋯** de cada tarefa tem Renomear, Adicionar subetapa, Categoria, Arquivar e Excluir.
- **Subetapas** (tarefa solta e item de grupo; menu **⋯ › Adicionar subetapa**): clique em "1/3" para abrir ou fechar a lista (na Semana ela começa recolhida). Enter cria a próxima, colar várias linhas cria várias, Backspace na linha vazia volta para a anterior, Esc sai; o ⋯ de cada subetapa tem Excluir e a alça ⋮⋮ reordena. **Marcar a última subetapa pendente conclui a tarefa ou o item sozinho** (aviso "Tarefa concluída · Desfazer"); desmarcar uma subetapa de algo concluído assim o reabre. Marcar a tarefa direto continua concluindo sem mexer nas subetapas. Ao adiar, mover ou duplicar o grupo, a cópia do item leva todas as subetapas (as feitas continuam marcadas) e o original fica como estava.
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
- Arraste uma tarefa solta para dentro de um card, ou um item para fora (vira tarefa solta). Pelo menu **⋯** também: **Colocar no grupo** e **Tirar do grupo**. As notas acompanham (a tarefa vira item e o item vira tarefa); as subetapas também acompanham; os anexos da tarefa não passam para o item.
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

- **Fazer backup:** em **Backup → Baixar backup**, o app baixa `memoria-backup-AAAA-MM-DD.json` com tudo: tarefas, subtarefas, grupos, categorias, procedimentos, notas e anexos (fotos, desenhos e áudios vão dentro do arquivo), incluindo o que está arquivado e quando foi arquivado. A página lembra quando foi o último backup neste navegador.
- **Restaurar:** em **Backup → Escolher arquivo de backup**, o app confere o arquivo e mostra o que tem nele ao lado do que você tem agora. Ao confirmar **Substituir meus dados**, todos os dados deste navegador são trocados pelos do arquivo.
- Arquivo que não é backup do MemorIA, que foi alterado ou que veio de uma versão mais nova do app é recusado, com a explicação, e nada muda.
- A troca é feita de uma vez: se algo falhar no meio, os dados atuais ficam como estavam.
- Antes de restaurar, use **Baixar backup dos dados atuais** se quiser poder voltar.

## Importar

**Backup → Importar conteúdo**, ou o botão **Importar** em Procedimentos e Notas, traz conteúdo de fora **sem substituir nada** (o Restaurar troca tudo; o Importar só acrescenta). Um diálogo em etapas: origem → colar texto ou escolher arquivo (ou soltar o arquivo na janela) → prévia → importar. Os arquivos são lidos só no navegador, até 20 MB.

| Origem            | Aceita                                                                     | O que vira                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto ou Markdown | texto colado, `.txt`, `.md`                                                | Você escolhe: **Tarefas** (cada linha é uma tarefa; `- [ ]` pendente, `- [x]` concluída; linha com recuo é subtarefa da de cima; `# Nome` seguido de uma lista é um grupo com esses itens, até a primeira linha em branco), **Procedimento** (`# Título` abre um; itens da lista, numerados ou não, ou `## Etapa` são etapas; o texto logo abaixo entra na etapa) ou **Nota** (título = `# Título` ou a primeira linha; o resto é o conteúdo; um arquivo = uma nota) |
| Planilha CSV      | `.csv` com cabeçalho (vírgula, ponto e vírgula ou tab; campos entre aspas) | Uma tarefa por linha. Na prévia você diz qual coluna é título, data (`AAAA-MM-DD` ou `dd/mm/aaaa`), categoria, concluída (`sim`, `x`, `1`, `true`…) e grupo; linhas com grupo viram itens do grupo daquele nome e dia                                                                                                                                                                                                                                                |
| Google Keep       | o `.zip` do Google Takeout ou os `.json` das notas                         | Nota de texto → nota (com a data da última edição, imagens e links como anexos); lista → grupo (marcados = concluídos; 1º rótulo sugerido como categoria). Lixeira, áudio do Keep (`.3gp`, não toca no navegador) e rótulos de notas de texto ficam em "ignorados"                                                                                                                                                                                                   |
| Backup do MemorIA | o `.json` da aba Backup                                                    | Só as partes escolhidas (tarefas, grupos, procedimentos, notas) e, se quiser, só as de uma categoria. Notas chegam avulsas                                                                                                                                                                                                                                                                                                                                           |

Na prévia: caixas para deixar itens de fora, o dia das tarefas e grupos sem data (padrão hoje), a categoria de destino (uma escolhida ou "usar as categorias que vieram", criadas se não existirem) e o que fazer com o que já existe (mesmo título no mesmo dia para tarefas e grupos; mesmo título para procedimentos e notas): **Pular**, **Importar mesmo assim** ou **Substituir**. Linhas que não deram para entender (tabela, bloco de código, imagem, data inválida, linha sem título) aparecem como avisos, sem travar o resto. Tudo é gravado de uma vez; o aviso "32 itens importados" tem **Desfazer** (e Ctrl+Z), que tira o que entrou e devolve o que foi substituído.

Recomendação: faça backup com frequência e guarde o arquivo fora do computador (pendrive ou nuvem). Quando há dados e o último backup neste navegador tem mais de 7 dias (ou nunca houve um), o ícone **Backup** da barra lateral ganha um ponto laranja; a dica diz desde quando.

## Deploy

O site é publicado no **GitHub Pages** em **https://daniel-rps.github.io/memoria/**, pelo workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): a cada push na `main`, ele roda `npm ci`, `npm test` e `npm run build` e publica a pasta `dist/`. Também dá para disparar à mão em **Actions → Deploy no GitHub Pages → Run workflow**.

- **Subcaminho:** o build usa `base: '/memoria/'` (`vite.config.ts`) e o roteador usa o mesmo caminho (`basename`); o `npm run dev` continua na raiz de `http://localhost:5173`. Ícones de marca, emojis, favicon e logo seguem o subcaminho.
- **Recarregar uma tela:** o GitHub Pages não conhece as rotas do app. O build gera um `404.html` igual ao `index.html`, então `/memoria/dia/2026-11-02` abre normalmente ao recarregar.
- **Conferir antes de publicar:** `npm run build` e depois `npm run preview`, e abra **`http://localhost:4173/memoria/`**.
- **Ativar (uma vez):** no GitHub, **Settings → Pages → Build and deployment → Source: GitHub Actions**.

> **Os dados não viajam com o site.** O navegador guarda os dados por endereço: o que está em `http://localhost:5173` **não aparece** em `https://daniel-rps.github.io/memoria/` (e vice-versa). Para levar seus dados, faça **Backup → Baixar backup** no endereço antigo e **Backup → Escolher arquivo de backup** no novo. Todos os sites `daniel-rps.github.io/...` dividem o mesmo armazenamento do navegador; o MemorIA usa nomes próprios (`memoria:` e o banco do app), então não se misturam.

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
