# Histórico de ajustes do MemorIA

> Registro cronológico. Ajuste novo: acrescente 1–2 linhas no fim da lista de ajustes, com a data. NÃO copie isto para o `AGENTS.md`.

## Fases

1. Visão do dia (tarefas, seleção, concluídas agrupadas, reordenação)
2. Subtarefas com progresso ("2 de 5")
3. Categorias e subcategorias com cores e filtro
4. Semana, arrastar entre dias, ações de mover pendências
5. Procedimentos: título, categoria, etapas numeradas, lista por categoria e busca (remodelado em 01/11/2026)
6. Visões de mês e ano
7. Backup: exportar/importar JSON com anexos
8. Notas, fotos, desenho à mão livre, áudio
9. Compartilhamento (ver/editar) — FORA DO ESCOPO

Fases 1 a 8 concluídas: app completo para o uso planejado. Mudanças agora são ajustes pedidos pelo usuário.

- Ajuste 30/10/2026: grupos de tarefas (cards por dia em séries; levar a outro dia duplica o card com os pendentes) — detalhes em `docs/proposta-inicial.md`
- Ajuste 31/10/2026: arrastar o card leva o grupo inteiro (item só pela alça), menu → "Levar pendentes", volta desfaz a transferência sem card fantasma, Ctrl+Z
- Ajuste 01/11/2026: Procedimentos remodelados (só título, categoria e etapas; banco v7, backup formato 4) — detalhes em `docs/proposta-inicial.md`
- Ajuste 01/11/2026: categorias criadas e aplicadas ali mesmo (seletor único), aba Categorias com uso e ordem arrastável, card editável na Semana (banco v8, backup formato 5)
- Ajuste 01/11/2026: nova interface "folha pautada + barra lateral" na paleta violeta (só camada visual): tokens, `BarraLateral` com o filtro do Dia, folhas com traço grafite, card como ficha, hoje circulado (`CirculoHoje`), menus por `data-slot` e `CabecalhoPagina` nas telas de lista — detalhes em `docs/proposta-inicial.md`
- Ajuste 01/11/2026: grupo "Calendário" na barra lateral (variação "traço de caneta": traço violeta desliza pela linha-guia; só CSS, sem biblioteca de animação)
- Ajuste 01/11/2026: barra lateral recolhível só pelo usuário (botão/Ctrl+B, lembrada; não recolhe mais na Semana), rótulo só "Calendário" e filtro por categoria removido do Dia
- Ajuste 01/11/2026: logo oficial na barra (completa ↔ símbolo), favicon, apple-touch-icon e README
- Ajuste 01/11/2026: tela Início (tela principal): captura rápida, Hoje/Atrasadas ao lado, próximos 7 dias e mapa de conclusões estilo GitHub — detalhes em `docs/proposta-inicial.md`. "Sem data" ficou de fora
- Ajuste 01/11/2026: modo claro/escuro/sistema, fundo (Aurora, pontos, grade com holofote, liso) e logo por tema — só camada visual
- Ajuste 01/11/2026: "Em grupo…" na captura e "+" no Hoje (`adicionarItensNaSerie`); mapa sem sequências/dia mais produtivo, filtro em menu
- Ajuste 01/11/2026: layout do Início — sem "Próxima semana", Próximos 7 dias na lateral (faixa discreta), captura multilinha (linhas extras = anotação ou itens) e mapa logo abaixo
- Ajuste 01/11/2026: captura cria o grupo já com os itens (nome em destaque + linhas com caixinha, teclado próprio, colar = vários itens) e "Em grupo…" usa a mesma lista
- Ajuste 01/11/2026: um texto apagado por modo no campo da captura ("Escreva a tarefa a ser feita" etc.)
- Ajuste 01/11/2026: Procedimentos em cartões (grade por categoria, prévia de 3 etapas) e editor de etapas compacto com Enter/Backspace — só camada visual, sem mudar o banco
- Ajuste 01/11/2026: Hoje e Atrasadas do Início em cards por tipo (um por grupo + "Tarefas soltas"), Atrasadas com título laranja e "Tudo em dia"
- Ajuste 02/11/2026: categorias por tipo (Grupos × Procedimentos, banco v9, backup formato 6) e cor personalizada com misturador — detalhes em `docs/proposta-inicial.md`
- Ajuste 02/11/2026: notas vinculadas a tarefa, grupo e item (gaveta lateral; aba Notas em cartões por categoria, grupo ou recentes; banco v10, backup formato 7) — detalhes em `docs/proposta-inicial.md`
- Ajuste 02/11/2026: blocos recolhíveis e filtro por dia em Notas (Recentes por dia) e Procedimentos (dia de criação); ícone (emoji ou marca do Simple Icons) em procedimentos e categorias dos dois tipos (backup formato 8)
- Ajuste 02/11/2026: ícones Cloudflare, MemorIA e genérico (Amazon/AWS; backup formato 9), cards da Semana recolhíveis e colunas com largura mínima (opção A), importar (texto/Markdown, CSV, Google Keep, partes do backup) e "Usar de Procedimentos" ao criar categoria de Grupo
- Ajuste 03/11/2026: Hoje/Atrasadas do Início viram resumo em números (frase, contagem, barra) + link; grupos do Dia e da Semana abrem sempre recolhidos
- Ajuste 03/11/2026: captura enxuta — sai o modo "Em grupo…" (grupo que já existe pelo seletor "Sem grupo ▾" ao lado da categoria) e sai o "Amanhã" (só Hoje e Escolher data, que mostra a data escolhida)
- Ajuste 03/11/2026: aba Arquivados (tarefas soltas, grupos, notas e procedimentos; desarquivar, abrir, excluir de vez, seleção múltipla; banco v11, backup formato 10) — **Faça backup antes de publicar esta versão**
- Ajuste 03/11/2026: Dia em duas seções (Grupos × Tarefas soltas), alternador Lista/Colunas e ordem lembrados, grupos como linha simples e selo de atraso discreto — só camada visual
- Ajuste 03/11/2026: **em andamento** (tarefa solta e item de grupo; filete, "agora" e ponto no grupo recolhido; sai ao mover/adiar/arrastar/duplicar/concluir/arquivar), layout do Dia e da Semana lembrado (seções e grupos por série; substitui "grupos sempre recolhidos") e Semana mais compacta (backup formato 11, sem mudar o banco)
- Ajuste 04/11/2026: aba **Dados › Tempo nas tarefas** (sessões automáticas ao ligar/desligar "Em andamento", "agora · 12 min" no Dia, "Tempo gasto" no menu ⋯, aviso de sessão longa ≥ 4h ou meia-noite com "Manter"/"Ajustar…", resumo com tempo médio por tarefa, tarefas realizadas e mais/menos tempo, barras nítidas de 7px sem distorção e sem texto secundário de categoria/grupo, gráfico de rosca baseado no tempo real trabalhado [jornada − pausas e divisão por minuto entre categorias simultâneas] visível em Hoje, dia escolhido, Semana e Mês com agrupamento 'Outras' acima de 6 categorias, filtro 'Escolher…' para seleção de dia único com pontinho nos dias com tempo e datas futuras desabilitadas, lista por categoria expansível com histórico de sessões detalhado, busca e categorias abertas lembradas; banco v12, backup formato 12) — **Faça backup antes de publicar esta versão**
- Ajuste 05/11/2026: **subetapas** em tarefas soltas e itens de grupo (cópia ao levar o item, conclusão automática pela última, backup formato 13, sem mudar o banco) — **Faça backup antes de publicar esta versão**
- Ajuste 05/11/2026: **prioridade** (bandeira) em tarefa solta e item de grupo: menu ⋯, tecla P, botões na barra de Selecionar, mantida ao adiar/mover/arrastar/duplicar e removida ao concluir (campos `prioridade`/`prioridadeDesde`, backup formato 13, sem mudar o banco) — **Faça backup antes de publicar esta versão**
- Ajuste 05/11/2026: **ordem de exibição**: prioridade e em andamento sobem para o topo do grupo, das tarefas soltas do Dia e da coluna da Semana (prioridade+andamento → andamento → prioridade → demais), calculada na hora sem reescrever a `ordem`; arrastar dentro de um bloco do topo reordena só ele (`ordemNoTopo`, backup formato 13, sem mudar o banco) — **Faça backup antes de publicar esta versão**
- Ajuste 05/11/2026: **seleção em lote**: Shift+clique (intervalo) e Ctrl+clique (põe/tira) na tarefa solta, no item e na subetapa, sem entrar no modo "Selecionar" (também na Semana); Esc ou clique fora limpa; arrastar uma das selecionadas leva todas juntas (prévia "N tarefas"), Alt+↑/↓ sobe e desce, barra com Prioridade, Adiar, Mover para…, Arquivar; tudo em UMA operação com aviso e Desfazer (Ctrl+Z). Sem mudar o banco nem o backup
- Ajuste 05/11/2026: Início — novo bloco "Em andamento" no topo da coluna lateral (somente quando há tarefas soltas ou itens em andamento, atualizado via `useLiveQuery`, função pura `montarResumoDeAndamento` em `domain/andamento.ts`, exibindo grupos e contagens sem nomes de tarefas, ponto pulsante discreto e link "Ver no dia →"); contagem de Hoje e Atrasadas em lista vertical moderadamente destacada (ícones na cor de destaque suave, itens alinhados abaixo dos grupos em cinza)
- Ajuste 05/11/2026: coluna da direita do Início em cartões de vidro (`GlassCard` em `src/components/ui/glass-card.tsx`: `as="section"`, superfície translúcida `glass-surface` com `backdrop-blur-md`, borda fina de 1px com reflexo chanfrado superior `before:h-px`, cantos `rounded-lg`, fallback sólido sem backdrop-filter; prop `borda`: "accent" roxo no Em andamento, "warning" laranja nas Atrasadas com pendências, e neutro "padrao" no Hoje, Próximos 7 dias e Atrasadas em dia; sem brilho difuso neon/respiração); espaçamento padronizado de 14px (`gap-3.5`) entre cartões e topo alinhado à caixa de captura (`lg:pt-0`)
- Ajuste 05/11/2026: cartões da lateral do Início recolhíveis ("Em andamento", "Hoje" e "Atrasadas"; cabeçalho com `button`, `aria-expanded`/`aria-controls`, `ChevronDown` 180°, animação de 200ms; estado lembrado em `memoria:dia-layout` como `cartoesRecolhidosNoInicio`, padrão expandidos; "Hoje" recolhido com barra de progresso de 2px na base; "Atrasadas" com "em dia" neutro; "Próximos 7 dias" sem recolher); remoção do botão "Trazer todas para hoje" do Início (apenas link "Ver atrasadas →")
- Ajuste 06/11/2026: aviso com Desfazer quando a tarefa solta perde a categoria ao entrar num grupo (arrastar, menu ⋯ "Colocar no grupo", seleção em lote) ou o item sai de um grupo com categoria; sem mudar o banco nem o backup
- Ajuste 06/11/2026: aba **Grupos** na barra lateral (`/grupos`, ícone FolderKanban, contador): grupos (séries com algum card fora de Arquivados) em blocos por categoria, com busca, "N pendentes · N feitos · N dias" e clique que abre o dia (hoje, o próximo ou o mais recente); só visualização
  Regra pura `montarListaDeGrupos`/`contarGrupos` (`lib/grupos.ts`) e hooks `useListaDeGrupos`/`useTotalDeGrupos`, para a barra e a tela mostrarem o mesmo número; sem mudar o banco nem o backup
- Ajuste 06/11/2026: aba **Grupos** em cartões (faixa na cor da categoria, resumo e barra de progresso) que abrem na largura toda com Pendentes (dia e marcas de prioridade/andamento), chips de Dias ("07/11 · 3/4") e Feitos recolhidos; só leitura, a navegação é por "Abrir no dia" e pelos chips
  `montarListaDeGrupos` devolve `itensPendentes`/`diasComCard`/`itensFeitos` já ordenados (`rotuloDoDia`, `fracaoFeita`); cartões abertos só em memória; sem mudar o banco nem o backup
- Ajuste 06/11/2026: aba Grupos na barra lateral sem o contador (o total fica só no subtítulo da tela); saíram `useTotalDeGrupos` e `contarGrupos`
- Ajuste 06/11/2026: novo isotipo ("M" geométrico em fita 3D) em `src/assets/` (`512×512` transparente por tema), `public/` (favicon e `apple-touch-icon.png`), `docs/logo-memoria.png` e `docs/branding/logo/`
  Na barra lateral (`LogoDaBarra`), o símbolo combina com o nome "MemorIA" em SVG (`currentColor` + `fill-caneta`), sem re-render nem transição no tema; removidos `src/assets/logo-memoria*.png` e `docs/branding/logo/logo-original.png`
- Ajuste 06/11/2026: logo do MemorIA no topo da barra lateral (expandida e recolhida) vira link acessível para a tela Início (`/inicio`) com foco visível e navegação sem recarregar
- Ajuste 10/11/2026: **sem subcategorias**: fica só a categoria (de Grupo ou de Procedimento); aba Categorias, seletor e menus ⋯ sem subcategoria e rótulos só com a categoria. Banco v13 religa tarefas, grupos e procedimentos à categoria-mãe (`religarACategoriaMae`) e apaga a tabela; backup formato 14 (o antigo importa religando à mãe) — **Faça backup antes de publicar esta versão**
- Ajuste 12/11/2026: modo **Cartões** no Dia com prevenção de arrasto em elementos interativos (`SensorPonteiroSeguro` e `SensorTecladoSeguro` ignorando inputs/botões/subetapas), cancelamento de arrasto ao focar campos e ao perder foco da janela, e teste E2E validando adição de subetapa sem disparar arrasto
