# Testes: jsdom, Playwright e armadilhas de teste

> Detalhe de uma área do MemorIA. Leia só quando for mexer nela (o índice está no `AGENTS.md`). Se algo aqui divergir do código, o código vale: corrija este arquivo.

- Testes rodam com `TZ=America/Sao_Paulo` (definido em `vite.config.ts`); sem `globals`, importe `describe/it/expect` de `vitest`
- Testes de tela: `findBy`/`waitFor` esperam 5 s (`configure` em `src/test/setup.ts`) e o Vitest usa metade dos núcleos (`maxWorkers`); NÃO passe `timeout` menor num teste (encurta a espera e volta a falhar com a máquina ocupada)
- Teste de tela: `renderizarApp(caminho)` (`src/test/`) monta rotas + layout reais (avisos incluídos)
- date-fns 4 pt-BR: `EEE` = "quarta" e `MMM` = "out", sem ponto — confira antes de testar textos de data
- Arrastar não é testável no jsdom (sem posições): cubra a lógica em `lib/quadro`, `lib/mover-grupos` e no repositório, e o gesto no Playwright (`e2e/`)
- E2E semeia dados importando os módulos do app pelo Vite (`await import('/src/db/...')` no `page.evaluate`) e fixa a data com `page.clock.setFixedTime`
- Teste que navega: espere um elemento da página nova (o endereço muda antes da tela desenhar)
- A área de avisos do Sonner é uma `region` ("Notifications"): filtre por nome ao contar regiões
- Nos testes, `Blob`/`File` são os do Node e `URL.createObjectURL` é fixo (`src/test/setup.ts`): o Blob do jsdom vira objeto vazio no fake-indexeddb
- Canvas, câmera, microfone e `createImageBitmap` não existem no jsdom: verifique desenho, foto e áudio no navegador
- Testes têm tsconfig próprio (`tsconfig.test.json`, com tipos do Node); o app não enxerga tipos do Node
- `userEvent.type`: `{` é tecla especial; para digitar `{{campo}}` escreva `'{{{{campo}}'`
- Playwright `getByLabel('Etapa 1')` / `getByRole(..., { name })` casam por trecho (pega "Excluir etapa 1", "Mover Trabalho"): use `{ exact: true }`
- Submenu Radix em teste: use teclado (`ArrowRight`, `Enter`); no jsdom o ponteiro fecha o submenu
- Testes: o jsdom não tem `matchMedia`; `src/test/midia.ts` instala um e `simularMidia(consulta, casa)` simula sistema escuro/movimento reduzido
- E2E: semeadura das abas Notas/Procedimentos/Categorias em `e2e/semear-ajustes.ts`; o calendário do shadcn marca cada dia com `data-day="dd/MM/aaaa"`; no seletor de emoji (frimousse) cada emoji é `gridcell` com o nome em pt ("Casa")
- E2E `corDaFaixa` lê a cor em `[data-cor]` (bolinha do grupo no Dia) ou, sem ele, no PRIMEIRO `span[aria-hidden]` do card (Semana: a borda de cima da ficha): mantenha esse span primeiro ao mexer no card da Semana
