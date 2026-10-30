# MemorIA

App pessoal de organização em formato de calendário. Reúne tarefas do dia, subtarefas, categorias coloridas e **procedimentos reutilizáveis**: passo a passo que você executa várias vezes, como uma configuração de servidor ou uma rotina mensal.

Feito para **uso pessoal, num computador**. Funciona **sem servidor e sem banco externo**: todos os dados (inclusive fotos, desenhos e áudios) ficam no banco de dados do próprio navegador (IndexedDB). Não precisa de MySQL, de SSL nem de internet.

> **Status:** completo para o uso planejado. Fases 1 a 8 concluídas (dia, subtarefas, categorias, semana, mover tarefas, procedimentos, mês, ano, backup, notas e anexos). Compartilhamento e versão para celular ficaram fora do escopo (veja abaixo).

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
- ✅ Filtro por categoria e subcategoria na visão do dia
- ✅ Visão de semana (segunda a domingo)
- ✅ Visão de mês, com arrastar tarefas entre dias
- ✅ Visão de ano, com a quantidade de tarefas e os atrasos de cada dia

### Mover tarefas
- ✅ Arrastar uma tarefa de um dia para outro na visão de semana (mouse ou teclado)
- ✅ Trazer as pendências de ontem para hoje
- ✅ Adiar para amanhã
- ✅ Mover para outro dia escolhido no calendário
- ✅ Mover ou adiar várias tarefas selecionadas de uma vez
- ✅ "Desfazer" depois de mover ou adiar
- ✅ Arquivar (tirar do calendário sem concluir)
- 🔜 Ver e restaurar tarefas arquivadas

### Procedimentos
- ✅ Criar e editar procedimentos com seções, passos, subpassos, trechos de código e alertas
- ✅ Anexos no procedimento e em cada passo (vistos também no modo execução)
- ✅ Campos variáveis preenchidos a cada execução (`{{nome}}` nos passos)
- ✅ Modo execução: marcar e pular passos, copiar comandos, observações, sem alterar o modelo original
- ✅ Execução pela metade fica salva e pode ser retomada
- ✅ Ligação com o calendário: agendar cria uma tarefa; executar por ela conclui a tarefa
- ✅ Histórico de execuções com valores usados, passos feitos e pulados
- ✅ Versões: cada edição salva guarda a versão anterior, que pode ser vista e restaurada
- ✅ Busca em títulos, descrições e passos, sem diferenciar acentos

> **Sobre senhas:** o MemorIA não guarda senhas. Ele guarda só **onde** a senha está, por exemplo "cofre X, item Y".

### Conteúdo e dados
- ✅ Notas com texto livre que se salva sozinho, busca e anexos
- ✅ Anexos em tarefas, notas e procedimentos: fotos, desenhos à mão livre, gravações de áudio e links
- ✅ Anotação de texto em cada tarefa
- ✅ Backup: exportar e importar todos os dados, incluindo anexos

## Stack

| Área | Tecnologia |
| --- | --- |
| Interface | React 19 + TypeScript 7 + Vite 8 |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| Rotas | React Router 8 |
| Formulários | React Hook Form + Zod |
| Dados locais | IndexedDB com Dexie 4 |
| Arrastar e soltar | dnd-kit |
| Datas | date-fns 4 (pt-BR) |
| Testes | Vitest + Testing Library |
| Qualidade | oxlint + Prettier |

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
- Em **Categorias**, crie categorias e subcategorias e clique na bolinha de cor para trocar a cor. Excluir uma categoria não apaga as tarefas: elas só ficam sem categoria.
- Na visão do dia, os botões de categoria filtram as tarefas. Com um filtro ativo, a tarefa nova já nasce naquela categoria.
- Mover uma tarefa só muda o dia dela: nada é copiado ou apagado, e a contagem "pendente há N dias" continua contando desde o dia em que foi criada.
- No menu **⋯**: **Adiar para amanhã** e **Mover para outro dia…**. Para várias de uma vez, use **Selecionar** acima da lista. Depois de mover, o aviso no rodapé tem **Desfazer**.
- Quando sobra algo pendente ontem, a página de hoje oferece **Trazer para hoje**.
- Em **Semana**, arraste as tarefas entre os dias. Pelo teclado: foque a tarefa, tecle espaço, use as setas e espaço de novo. Clique no dia para abrir a visão dele.
- Em **Procedimentos**, crie o passo a passo. Valores que mudam (servidor, data, número do chamado) viram **campos variáveis**: escreva `{{Servidor}}` no passo e, ao executar, o valor digitado aparece no lugar, inclusive no comando copiado.
- Para senhas, use um campo do tipo **credencial**: ele guarda só onde a senha está (ex.: "cofre X, item Y"). O MemorIA não tem campo de senha.
- **Executar** abre o checklist. O modelo nunca muda; o que você marca e preenche vai para o histórico daquela execução.
- **Agendar** cria uma tarefa no dia escolhido. Na tarefa, **Executar procedimento** abre a execução, e concluí-la conclui a tarefa.
- Cada **Salvar nova versão** guarda a anterior em **Versões anteriores**, onde dá para ver e restaurar.
- Em **Mês**, cada dia mostra até 3 pendentes (atrasadas com marca-texto) e o resto como "+N". Arraste uma tarefa para outro dia; pelo teclado, foque a tarefa, tecle espaço, use as setas (lados = um dia, cima/baixo = uma semana) e espaço de novo.
- Em **Ano**, o tom de cada dia indica quantas tarefas há, e um ponto amarelo marca pendência atrasada. Clique no mês ou no dia para abrir.
- Em **Notas**, **Nova nota** abre uma página que se salva sozinha enquanto você escreve.
- Anexos (em notas, no menu **⋯ → Anotação e anexos** de uma tarefa e na página de um procedimento):
  - **Foto:** escolha uma ou várias imagens. Fotos com mais de 2048 px são reduzidas para não encher o armazenamento e o backup.
  - **Desenho:** desenhe com mouse, caneta (sensível à pressão) ou dedo; cores, espessuras, borracha e desfazer. O lápis na miniatura reabre para continuar o desenho.
  - **Áudio:** grave pelo microfone (o navegador pede permissão na primeira vez). Para sozinho em 10 minutos.
  - **Link:** só endereços `http://` ou `https://`; abrem em outra aba.
  - Excluir um anexo mostra **Desfazer** por alguns segundos.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera a versão de produção |
| `npm test` | Roda os testes |
| `npm run lint` | Verifica o código |
| `npm run format` | Formata o código |

## Backup e restauração

Os dados ficam no IndexedDB do navegador. Por isso, **limpar os dados do site ou trocar de navegador apaga tudo**. O app pede ao navegador armazenamento persistente, mas o navegador nem sempre concede; a página **Backup** mostra a situação e permite pedir de novo.

- **Fazer backup:** em **Backup → Baixar backup**, o app baixa `memoria-backup-AAAA-MM-DD.json` com tudo: tarefas, subtarefas, categorias, procedimentos (com versões e execuções), notas e anexos (fotos, desenhos e áudios vão dentro do arquivo). A página lembra quando foi o último backup neste navegador.
- **Restaurar:** em **Backup → Escolher arquivo de backup**, o app confere o arquivo e mostra o que tem nele ao lado do que você tem agora. Ao confirmar **Substituir meus dados**, todos os dados deste navegador são trocados pelos do arquivo.
- Arquivo que não é backup do MemorIA, que foi alterado ou que veio de uma versão mais nova do app é recusado, com a explicação, e nada muda.
- A troca é feita de uma vez: se algo falhar no meio, os dados atuais ficam como estavam.
- Antes de restaurar, use **Baixar backup dos dados atuais** se quiser poder voltar.

Recomendação: faça backup com frequência e guarde o arquivo fora do computador (pendrive ou nuvem).

## Roadmap

| Fase | Entrega | Status |
| --- | --- | --- |
| 1 | Visão do dia: tarefas, caixas de seleção, concluídas riscadas e agrupadas, reordenação | ✅ |
| 2 | Subtarefas com progresso | ✅ |
| 3 | Categorias e subcategorias com cores e filtro | ✅ |
| 4 | Visão de semana, arrastar entre dias e ações de mover pendências | ✅ |
| 5 | Procedimentos: edição, modo execução, calendário, histórico, campos variáveis, versões e busca | ✅ |
| 6 | Visões de mês e ano | ✅ |
| 7 | Backup: exportar e importar (JSON com anexos) | ✅ |
| 8 | Notas, fotos, desenhos à mão livre e áudio | ✅ |
| 9 | Compartilhamento (ver ou editar), com servidor | Fora do escopo |

## Fora do escopo

Decidido em 30/10/2026: o MemorIA é só para um computador, para organizar os seus compromissos.

- **Compartilhamento (fase 9)** e **sincronização entre aparelhos**: exigiriam um servidor. A estrutura dos dados já está preparada (identificadores universais e data de alteração em cada registro), caso um dia isso mude.
- **Versão para celular**: a interface foi feita para tela de computador.
- **Abrir sem terminal (opcional):** o app pode ser servido pelo Laragon em `https://memoria.test`. Isso exige ativar o SSL no Laragon (sem `https` o navegador bloqueia funções que o app usa) e levar os dados para o novo endereço com o backup.
