# Tipografia do MemorIA

O app usa **uma família só**: **Bricolage Grotesque**, na versão variável. O mesmo arquivo dá todos os pesos e larguras, e a hierarquia vem de peso, tamanho e **largura**: os títulos são condensados.

## Famílias

| Uso                                      | Família                                          | Pilha completa (com fallback)                                                                                               | Onde está definida                                                       |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Interface (texto corrido, botões, menus) | Bricolage Grotesque Variable                     | `'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif`                                                      | `--font-sans` em `src/index.css`, aplicada no `<html>`                   |
| Títulos                                  | a mesma                                          | `--font-heading: var(--font-sans)`                                                                                          | `src/index.css` (usada pelos títulos de diálogo/gaveta do shadcn)        |
| Números / monoespaçada                   | **fonte do sistema** (não há fonte mono própria) | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` (padrão do Tailwind 4) | `font-mono`, usada **uma vez**: o campo hexadecimal do misturador de cor |
| Números tabulares                        | Bricolage com `tabular-nums`                     | —                                                                                                                           | 26 usos: dias do calendário, contadores, datas grandes                   |
| Logo                                     | **nenhuma fonte**: a logo é imagem PNG           | —                                                                                                                           | `src/assets/logo-memoria*.png`                                           |

## De onde vem e licença

- **Origem:** pacote npm [`@fontsource-variable/bricolage-grotesque`](https://fontsource.org/fonts/bricolage-grotesque) 5.3.0, importado em `src/index.css` (`@import '@fontsource-variable/bricolage-grotesque/standard.css'`). O Vite empacota os `.woff2` junto com o app, então **o app não chama o Google Fonts**: a fonte vem de arquivo local e funciona offline.
- **Arquivo:** `standard.css` traz os eixos **peso (wght) 200–800** e **largura (wdth) 75%–100%**, em três subconjuntos (latin, latin-ext, vietnamese). O navegador baixa só o que a página usa.
- **Autoria e licença:** © 2022 The Bricolage Grotesque Project Authors ([ateliertriay/bricolage](https://github.com/ateliertriay/bricolage)), **SIL Open Font License 1.1**: uso livre, inclusive comercial; pode embutir e redistribuir, mas não vender a fonte sozinha. Cópia da licença e do `.woff2` (subconjunto latin) em [`fonte/`](fonte/).
- A família também está no Google Fonts, mas o app não usa essa via.

## Pesos usados

Contagem de classes `font-*` em `src/**/*.tsx`:

| Peso | Classe                 | Usos                                    | Onde aparece                                                     |
| ---- | ---------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| 400  | `font-normal` (padrão) | 12 explícitos + todo o texto corrido    | Texto, itens de lista                                            |
| 500  | `font-medium`          | 23 (+ opção marcada nos menus, via CSS) | Rótulos, selos, títulos de diálogo                               |
| 600  | `font-semibold`        | 32                                      | Botões, item ativo, nomes de grupo                               |
| 700  | `font-bold`            | 11                                      | Títulos de seção (mapa, categorias)                              |
| 800  | `font-extrabold`       | 13                                      | Títulos de página, números grandes do calendário, título de card |

## Larguras (eixo wdth)

Os títulos encolhem a largura com `[font-stretch:X%]` e apertam o espaçamento com `tracking-[-0.0Xem]`:

| Largura | Usos               | Exemplos                                                                                                                      |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 75%     | 4                  | Número gigante do Dia (`text-[6rem]`), título do Mês (`text-5xl`) e do Ano (`text-6xl`), número do dia na Semana (`text-4xl`) |
| 80%     | 5                  | Títulos de página "Início", "Semana", procedimento, nota (`text-4xl`/`text-3xl`, `tracking-[-0.02em]`)                        |
| 85%     | 6                  | Título de seção e de card (`text-lg`/`text-xl`, `tracking-[-0.01em]`)                                                         |
| 100%    | 1 (+ todo o resto) | Texto normal                                                                                                                  |

## Escala de tamanhos

Base 16 px. Tailwind 4 define tamanho e altura de linha juntos (dá para trocar a altura com `leading-*`).

| Classe             | Tamanho | Altura de linha  | Usos | Papel                                                  |
| ------------------ | ------- | ---------------- | ---- | ------------------------------------------------------ |
| `text-[0.6875rem]` | 11 px   | herdada          | 2    | Miúdos (dia da semana em Próximos 7 dias)              |
| `text-xs`          | 12 px   | 16 px            | 44   | Contadores, selos, datas, legendas                     |
| `text-[0.8rem]`    | 12,8 px | herdada          | 3    | Detalhes (em `components/ui`, gerados pelo shadcn)     |
| `text-sm`          | 14 px   | 20 px            | 99   | **Tamanho mais comum**: interface, menus, listas       |
| `text-[0.9375rem]` | 15 px   | herdada          | 14   | Campos compactos e itens da Semana, subtarefas, Backup |
| `text-base`        | 16 px   | 24 px            | 16   | Título de tarefa no Dia, campos, editor de nota        |
| `text-lg`          | 18 px   | 28 px            | 6    | Títulos de seção e de card                             |
| `text-xl`          | 20 px   | 28 px            | 9    | Títulos de seção maiores, gaveta de notas              |
| `text-2xl`         | 24 px   | 32 px            | 2    | Título de nota na gaveta                               |
| `text-3xl`         | 30 px   | 36 px            | 2    | Título do procedimento                                 |
| `text-4xl`         | 36 px   | 40 px            | 5    | Títulos de página, números da Semana                   |
| `text-5xl`         | 48 px   | 1 (48 px)        | 1    | Mês                                                    |
| `text-6xl`         | 60 px   | 1 (60 px)        | 1    | Ano                                                    |
| `text-[6rem]`      | 96 px   | `leading-[0.78]` | 1    | Número do Dia                                          |

Alturas de linha extras usadas: `leading-none` (4), `leading-tight` (2), `leading-snug` (4), `leading-relaxed` (1), `leading-5/6/8/9` (20/24/32/36 px).

Exemplos de cada uso estão na [`paleta.html`](paleta.html).
