# MemorIA

App pessoal de organização em formato de calendário. Reúne tarefas do dia, subtarefas, **grupos de tarefas**, categorias coloridas e **procedimentos**: etapas numeradas de algo que você repete, como uma configuração de servidor ou uma rotina mensal.

Feito para **uso pessoal, num computador**. Funciona **sem servidor e sem banco externo**: todos os dados (inclusive fotos, desenhos e áudios) ficam no banco de dados do próprio navegador (IndexedDB). Não precisa de MySQL, de SSL nem de internet.

> **Status:** completo para o uso planejado. Fases 1 a 8 concluídas (dia, subtarefas, categorias, semana, mover tarefas, procedimentos, mês, ano, backup, notas e anexos), mais os grupos de tarefas e as categorias criadas ali mesmo (01/11/2026). Em andamento: nova interface na paleta violeta (cores, barra lateral, Dia, Semana, Mês, Ano e menus prontos; Procedimentos, Notas, Categorias e Backup a seguir). Compartilhamento e versão para celular ficaram fora do escopo (veja abaixo).

## Funcionalidades

Legenda: ✅ pronto · 🔜 planejado

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
- ✅ Filtro por categoria e subcategoria na visão do dia
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

- ✅ "+ Novo grupo" ao lado de "+ Nova tarefa" (Dia e Semana): um card com título, categoria opcional (só cor e filtro) e itens com caixa de seleção
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
- ✅ Adicionar, renomear (ali mesmo) e excluir etapas; a numeração se ajusta
- ✅ Edição grava sozinha; excluir o procedimento pede confirmação
- ✅ Lista separada por categoria, com a cor dela, e "Sem categoria" no fim
- ✅ Busca em títulos e etapas, sem diferenciar acentos

### Conteúdo e dados

- ✅ Notas com texto livre que se salva sozinho, busca e anexos
- ✅ Anexos em tarefas e notas: fotos, desenhos à mão livre, gravações de áudio e links
- ✅ Anotação de texto em cada tarefa
- ✅ Backup: exportar e importar todos os dados, incluindo anexos

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

- Escreva na linha **Nova tarefa** e tecle Enter; o campo continua pronto para a próxima.
- Clique no título para renomear (Enter salva, Esc cancela).
- Arraste pela alça à esquerda para reordenar. Pelo teclado: foque a alça, tecle espaço, use as setas e espaço de novo.
- O menu **⋯** de cada tarefa tem Renomear, Adicionar subtarefa, Categoria, Arquivar e Excluir.
- Clique no progresso ("2 de 5") para abrir ou fechar as subtarefas. Concluir todas as subtarefas não conclui a tarefa: você decide.
- Em **Categorias**, crie a categoria no topo (nome e cor) e as subcategorias embaixo de cada uma. Clique no nome para renomear e na bolinha para trocar a cor. Cada categoria mostra quantos itens a usam ("4 tarefas · 2 grupos · 1 procedimento"). Arraste pela alça ⋮⋮ para mudar a ordem, que vale em todo o app. Excluir pede confirmação e não apaga nada além da categoria: os itens ficam "Sem categoria" (ou, ao excluir uma subcategoria, só perdem a subcategoria).
- Não precisa sair da tela para usar uma categoria nova: em **Categoria ›** (menu ⋯), ao lado de **Novo grupo** ou no campo **Categoria** do procedimento, use **+ Nova categoria** ou **+ Nova subcategoria** (aparece ao passar o mouse sobre a categoria). Enter cria e já aplica ao item; Esc volta.
- Tudo se atualiza sozinho em todas as telas, inclusive em outra aba do navegador aberta no app.
- Na visão do dia, a lista de categorias na barra lateral filtra as tarefas. Com um filtro ativo, a tarefa nova já nasce naquela categoria.
- Mover uma tarefa só muda o dia dela: nada é copiado ou apagado, e a contagem "pendente há N dias" continua contando desde o dia em que foi criada.
- No menu **⋯**: **Adiar para amanhã** e **Mover para outro dia…**. Para várias de uma vez, use **Selecionar** acima da lista. Depois de mover, o aviso no rodapé tem **Desfazer**.
- Quando sobra algo pendente ontem, a página de hoje oferece **Trazer para hoje** (tarefas soltas vêm; itens de grupo são levados).
- **+ Novo grupo**, ao lado de **Nova tarefa**, cria um card. Escreva os itens em **Adicionar item**.
- Arrastar um card para outro dia (na Semana ou no Mês), ou usar **Levar pendentes para amanhã** e **Levar pendentes para…** (menu **⋯** do card, no Dia e na Semana), leva **todos** os itens pendentes de uma vez para o card desse grupo no outro dia. O card original fica onde estava, como registro: os itens levados aparecem como "transferido para 03/11". Enquanto arrasta, a prévia mostra "Casa · 2 pendentes → 03/11".
- Na Semana, para levar um item só, arraste pela alça **⋮⋮** que aparece à esquerda dele ao passar o mouse; solto no próprio card, ele só muda de posição. Apertar no resto do item não arrasta nada.
- Levou para o dia errado? Arraste de volta: o item volta a ser pendente no card de antes (nada duplicado) e o card que tinha sido criado para recebê-lo some, se ficou vazio. Ou use **Desfazer** no aviso / **Ctrl+Z**.
- Tarefas soltas continuam sendo **movidas** (não copiadas).
- Grupos com o mesmo nome são o mesmo grupo em dias diferentes: se o destino já tem o card "Casa", os itens entram nele. Renomear ou trocar a categoria do card vale para todos os dias.
- Arraste uma tarefa solta para dentro de um card, ou um item para fora (vira tarefa solta). Pelo menu **⋯** também: **Colocar no grupo** e **Tirar do grupo**. Subtarefas, anotação e anexos da tarefa não passam para o item.
- Em **Procedimentos**, **Novo procedimento** pede título, categoria (e subcategoria, se quiser) e etapas (**Adicionar etapa** quantas vezes quiser). Depois de criado, clique nele na lista para ver e editar: o texto das etapas se edita ali mesmo e tudo grava sozinho ("Salvo"). A lixeira exclui a etapa e a numeração se ajusta.
- Em **Mês**, cada dia mostra até 3 pendentes (atrasadas com marca-texto) e o resto como "+N". Arraste uma tarefa para outro dia; pelo teclado, foque a tarefa, tecle espaço, use as setas (lados = um dia, cima/baixo = uma semana) e espaço de novo.
- Em **Ano**, o tom de cada dia indica quantas tarefas há, e um ponto amarelo marca pendência atrasada. Clique no mês ou no dia para abrir.
- Em **Notas**, **Nova nota** abre uma página que se salva sozinha enquanto você escreve.
- Anexos (em notas e no menu **⋯ → Anotação e anexos** de uma tarefa):
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
| 8    | Notas, fotos, desenhos à mão livre e áudio                                             | ✅             |
| 9    | Compartilhamento (ver ou editar), com servidor                                         | Fora do escopo |

## Fora do escopo

Decidido em 30/10/2026: o MemorIA é só para um computador, para organizar os seus compromissos.

- **Compartilhamento (fase 9)** e **sincronização entre aparelhos**: exigiriam um servidor. A estrutura dos dados já está preparada (identificadores universais e data de alteração em cada registro), caso um dia isso mude.
- **Versão para celular**: a interface foi feita para tela de computador.
- **Abrir sem terminal (opcional):** o app pode ser servido pelo Laragon em `https://memoria.test`. Isso exige ativar o SSL no Laragon (sem `https` o navegador bloqueia funções que o app usa) e levar os dados para o novo endereço com o backup.
