# MemorIA

App pessoal de organização em formato de calendário. Reúne tarefas do dia, subtarefas, categorias coloridas e **procedimentos reutilizáveis**: passo a passo que você executa várias vezes, como uma configuração de servidor ou uma rotina mensal.

A primeira versão é para computador, para uso pessoal, e funciona **sem servidor**: todos os dados ficam no seu navegador. A versão para celular e o compartilhamento vêm depois.

> **Status:** fases 1 a 3 concluídas (visão do dia, subtarefas e categorias). Próxima: fase 4, visão de semana e mover tarefas.

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
- 🔜 Visões de semana, mês e ano

### Mover tarefas
- 🔜 Arrastar uma tarefa de um dia para outro
- 🔜 Trazer as pendências de ontem para hoje
- 🔜 Adiar para amanhã
- 🔜 Mover para outro dia escolhido
- 🔜 Mover várias tarefas selecionadas de uma vez
- ✅ Arquivar (tirar do calendário sem concluir)
- 🔜 Ver e restaurar tarefas arquivadas

### Procedimentos
- 🔜 Criar e editar procedimentos com seções, passos, subpassos, trechos de código, alertas e anexos
- 🔜 Campos variáveis preenchidos a cada execução
- 🔜 Modo execução: marcar e pular passos sem alterar o modelo original
- 🔜 Ligação com o calendário (agendar uma execução como tarefa)
- 🔜 Histórico de execuções
- 🔜 Versões: cada edição guarda a versão anterior
- 🔜 Busca

> **Sobre senhas:** o MemorIA não guarda senhas. Ele guarda só **onde** a senha está, por exemplo "cofre X, item Y".

### Conteúdo e dados
- 🔜 Notas, fotos, desenhos à mão livre e gravação de áudio
- 🔜 Backup: exportar e importar todos os dados, incluindo anexos
- 🔜 Compartilhamento com outras pessoas, só para ver ou para editar (exige servidor)

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

O projeto vai ser estruturado para virar PWA (instalável, funcionando offline) e, no futuro, sincronizar com um servidor.

## Como instalar e rodar

Pré-requisito: [Node.js](https://nodejs.org/) 22 ou mais recente (desenvolvido com o 24).

```bash
npm install
```

```bash
npm run dev
```

Depois, abra no navegador o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

### Usando

- Escreva na linha **Nova tarefa** e tecle Enter; o campo continua pronto para a próxima.
- Clique no título para renomear (Enter salva, Esc cancela).
- Arraste pela alça à esquerda para reordenar. Pelo teclado: foque a alça, tecle espaço, use as setas e espaço de novo.
- O menu **⋯** de cada tarefa tem Renomear, Adicionar subtarefa, Categoria, Arquivar e Excluir.
- Clique no progresso ("2 de 5") para abrir ou fechar as subtarefas. Concluir todas as subtarefas não conclui a tarefa: você decide.
- Em **Categorias**, crie categorias e subcategorias e clique na bolinha de cor para trocar a cor. Excluir uma categoria não apaga as tarefas: elas só ficam sem categoria.
- Na visão do dia, os botões de categoria filtram as tarefas. Com um filtro ativo, a tarefa nova já nasce naquela categoria.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera a versão de produção |
| `npm test` | Roda os testes |
| `npm run lint` | Verifica o código |
| `npm run format` | Formata o código |

## Backup e restauração

> Planejado para a fase 7.

Os dados ficam no IndexedDB do navegador. Por isso, **limpar os dados do site ou trocar de navegador apaga tudo**. O app pede ao navegador armazenamento persistente, mas o navegador nem sempre concede. O backup vai funcionar assim:

- **Exportar:** gera um arquivo `.json` com todas as tarefas, categorias, procedimentos, notas e anexos (fotos, desenhos e áudios incluídos).
- **Importar:** carrega esse arquivo e restaura todos os dados.

Recomendação: exporte o backup com frequência e guarde o arquivo fora do computador.

## Roadmap

| Fase | Entrega | Status |
| --- | --- | --- |
| 1 | Visão do dia: tarefas, caixas de seleção, concluídas riscadas e agrupadas, reordenação | ✅ |
| 2 | Subtarefas com progresso | ✅ |
| 3 | Categorias e subcategorias com cores e filtro | ✅ |
| 4 | Visão de semana, arrastar entre dias e ações de mover pendências | 🔜 |
| 5 | Procedimentos: edição, modo execução, calendário, histórico, campos variáveis, versões e busca | 🔜 |
| 6 | Visões de mês e ano | 🔜 |
| 7 | Backup: exportar e importar (JSON com anexos) | 🔜 |
| 8 | Notas, fotos, desenhos à mão livre e áudio | 🔜 |
| 9 | Compartilhamento (ver ou editar), com servidor | 🔜 |
