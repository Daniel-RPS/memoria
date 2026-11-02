# Cores do MemorIA

Todas as cores abaixo foram lidas de [`src/index.css`](../../src/index.css). Os valores calculados (misturas `color-mix`, rgb, hsl e contraste) saem de [`scripts/gerar-tokens.mjs`](scripts/gerar-tokens.mjs), que também gera o [`tokens.json`](tokens.json).

**Como o tema funciona:** o tema claro fica em `:root` e o escuro em `:root[data-tema='escuro']`. Os **nomes dos tokens são os mesmos** nos dois temas; só o valor muda. Os componentes nunca sabem em que tema estão. No Tailwind, cada token vira classe (`bg-papel`, `text-grafite`, `border-pauta`…).

> O app não usa `--bg`, `--surface`, `--text` ou `--accent` como nomes de marca. A paleta tem nomes próprios inspirados numa agenda de papel (névoa, papel, tinta, grafite, pauta, caneta…), e os nomes do shadcn (`background`, `primary`…) são apelidos que apontam para eles.

---

## 1. Cores da marca

| Token                | Claro                                            | Escuro                                           | Para que serve                                                                               |
| -------------------- | ------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `--nevoa`            | `#F4F2F8` · rgb(244 242 248) · hsl(260 30% 96%)  | `#0F0D15` · rgb(15 13 21) · hsl(255 24% 7%)      | Fundo da página (`<html>`), atrás das folhas e da barra lateral                              |
| `--papel`            | `#FFFFFF` · rgb(255 255 255) · hsl(0 0% 100%)    | `#19161F` · rgb(25 22 31) · hsl(260 17% 10%)     | Superfície das folhas, fichas/cards, popovers e campos                                       |
| `--tinta`            | `#111019` · rgb(17 16 25) · hsl(247 22% 8%)      | `#ECE8F5` · rgb(236 232 245) · hsl(258 39% 94%)  | Texto principal; fundo do botão "Criar" da captura                                           |
| `--grafite`          | `#625E70` · rgb(98 94 112) · hsl(253 9% 40%)     | `#A39EB3` · rgb(163 158 179) · hsl(254 12% 66%)  | Texto secundário: datas, contadores, rótulos, ícones discretos                               |
| `--pauta`            | `#E4E0EE` · rgb(228 224 238) · hsl(257 29% 91%)  | `#2C2738` · rgb(44 39 56) · hsl(258 18% 19%)     | Linhas e bordas: pauta da folha, borda de card, divisórias                                   |
| `--caneta`           | `#8B3DFF` · rgb(139 61 255) · hsl(264 100% 62%)  | `#A274FF` · rgb(162 116 255) · hsl(260 100% 73%) | **Cor da marca**: ação principal, item ativo, foco, ✓ dos menus, links                       |
| `--violeta-profundo` | `#4B16A8` · rgb(75 22 168) · hsl(262 77% 37%)    | `#C6A8FF` · rgb(198 168 255) · hsl(261 100% 83%) | Destaques miúdos: texto sobre marca-texto, "hoje", item ativo do Calendário, nível 4 do mapa |
| `--marca-texto`      | `#ECE2FF` · rgb(236 226 255) · hsl(261 100% 94%) | `#2B2042` · rgb(43 32 66) · hsl(259 35% 19%)     | Fundo lavanda **só para atrasos** ("há X dias", "pendente desde") e a sombra dos menus       |
| `--alerta`           | `#A84C0A` · rgb(168 76 10) · hsl(25 89% 35%)     | `#F0A25E` · rgb(240 162 94) · hsl(28 83% 65%)    | Laranja **só** no título e no contador de Atrasadas do Início                                |

No escuro, a caneta clareia (`#8B3DFF` → `#A274FF`) para manter 4,5:1 sobre o papel escuro. Por isso, o texto sobre ela passa a ser escuro (`--primary-foreground`).

## 2. Apelidos do shadcn/ui

Os componentes de `src/components/ui/` usam estes nomes. A coluna "Aponta para" mostra qual cor da marca cada um usa; quando diz "próprio", o token tem valor só dele.

| Token                    | Aponta para                      | Claro     | Escuro    | Para que serve                                        |
| ------------------------ | -------------------------------- | --------- | --------- | ----------------------------------------------------- |
| `--background`           | nevoa                            | `#F4F2F8` | `#0F0D15` | Fundo da página                                       |
| `--foreground`           | tinta                            | `#111019` | `#ECE8F5` | Texto                                                 |
| `--card`                 | papel                            | `#FFFFFF` | `#19161F` | Card                                                  |
| `--card-foreground`      | tinta                            | `#111019` | `#ECE8F5` | Texto do card (**sem uso**)                           |
| `--popover`              | papel (claro) / próprio (escuro) | `#FFFFFF` | `#1E1A26` | Menus e popovers (no escuro, um pouco acima do papel) |
| `--popover-foreground`   | tinta                            | `#111019` | `#ECE8F5` | Texto de menus                                        |
| `--primary`              | caneta                           | `#8B3DFF` | `#A274FF` | Botão principal                                       |
| `--primary-foreground`   | próprio                          | `#FFFFFF` | `#14101F` | Texto sobre a caneta                                  |
| `--secondary`            | próprio                          | `#ECE9F3` | `#231F2C` | Botão secundário                                      |
| `--secondary-foreground` | tinta                            | `#111019` | `#ECE8F5` | Texto do botão secundário                             |
| `--muted`                | próprio                          | `#ECE9F3` | `#231F2C` | Áreas neutras, skeleton                               |
| `--muted-foreground`     | grafite                          | `#625E70` | `#A39EB3` | Texto apagado                                         |
| `--accent`               | próprio                          | `#F1EAFF` | `#2A2240` | Hover e item realçado em menus e listas               |
| `--accent-foreground`    | tinta                            | `#111019` | `#ECE8F5` | Texto sobre accent                                    |
| `--destructive`          | próprio                          | `#B42323` | `#F07A7A` | Erro e ações de excluir                               |
| `--border`               | pauta                            | `#E4E0EE` | `#2C2738` | Borda padrão de tudo (`* { border-border }`)          |
| `--input`                | próprio                          | `#CDC7DA` | `#3B3549` | Borda dos campos                                      |
| `--ring`                 | caneta                           | `#8B3DFF` | `#A274FF` | Anel de foco (usado a 50%)                            |

rgb e hsl de cada um estão no [`tokens.json`](tokens.json).

## 3. Barra lateral

| Token            | Claro                        | Escuro                      | Para que serve                                                   |
| ---------------- | ---------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `--barra`        | `#FBFAFD` · hsl(260 43% 99%) | `#121017` · hsl(257 18% 8%) | Fundo da barra (no claro, papel um pouco mais frio que o branco) |
| `--barra-borda`  | = pauta `#E4E0EE`            | = pauta `#2C2738`           | Borda direita da barra                                           |
| `--barra-texto`  | = tinta `#111019`            | = tinta `#ECE8F5`           | Texto dos itens                                                  |
| `--barra-suave`  | = grafite `#625E70`          | = grafite `#A39EB3`         | Texto secundário e ícones                                        |
| `--barra-realce` | tinta a 6% (`#11101910`)     | branco a 6% (`#FFFFFF0F`)   | Hover e item ativo                                               |

## 4. Cores com papel próprio

### Logo

A logo é **imagem PNG**, não SVG nem texto: as cores abaixo foram **amostradas dos arquivos** de `src/assets/` (pixel mais frequente de cada parte).

| Parte                      | Tema claro (`logo-memoria-clara.png`)                    | Tema escuro (`logo-memoria.png`) |
| -------------------------- | -------------------------------------------------------- | -------------------------------- |
| "Memor"                    | `#1A1625` (quase a tinta)                                | `#FCFDFF` (branco)               |
| "IA"                       | gradiente violeta ≈ `#8B3DFF` (de `#7A22FF` a `#9A50FF`) | igual                            |
| Símbolo                    | violetas ≈ `#8B3DFF`, lavandas claras e folha branca     | igual                            |
| Favicon / apple-touch-icon | símbolo sobre ficha `#111019` (tinta)                    | igual                            |

### Alerta, sucesso e erro

- **Alerta / Atrasadas:** `--alerta` (laranja), só no título "Atrasadas" e no contador. O selo "há X dias" usa `--marca-texto` + `--violeta-profundo`, sem laranja.
- **Erro:** `--destructive` (`#B42323` / `#F07A7A`).
- **Sucesso:** **não existe token de sucesso.** `toast.success` usa o aviso padrão do Sonner com as cores de `--popover`/`--border`, e não há verde de marca.

### Mapa de conclusões (Início)

Definido em [`cores-dos-niveis.ts`](../../src/features/inicio/components/cores-dos-niveis.ts). Os níveis 1 e 2 são misturas `color-mix(in oklab, caneta X%, papel)`; o valor final abaixo foi calculado pelo script.

| Nível    | Regra                         | Claro     | Escuro    |
| -------- | ----------------------------- | --------- | --------- |
| 0 (nada) | `bg-nevoa` + contorno `pauta` | `#F4F2F8` | `#0F0D15` |
| 1        | caneta 24% + papel            | `#E0D6FF` | `#362B4E` |
| 2        | caneta 52% + papel            | `#BDA5FF` | `#5B458B` |
| 3        | `bg-caneta`                   | `#8B3DFF` | `#A274FF` |
| 4        | `bg-violeta-profundo`         | `#4B16A8` | `#C6A8FF` |

No escuro, a escala vai do escuro para o **claro** (o nível 4 é o mais claro), seguindo o violeta-profundo do tema.

### Visão de Ano

[`tons.ts`](../../src/features/ano/tons.ts): `bg-caneta/15`, `bg-caneta/40` e `bg-caneta text-white`, sobre o papel.

| Faixa     | Claro                       | Escuro    |
| --------- | --------------------------- | --------- |
| 0         | sem fundo (papel `#FFFFFF`) | `#19161F` |
| 1 (`/15`) | `#EEE2FF`                   | `#2E2441` |
| 2 (`/40`) | `#D1B1FF`                   | `#503C79` |
| 3 (cheia) | `#8B3DFF`                   | `#A274FF` |

### Fundos decorativos (`FundoDoApp`)

O usuário escolhe no rodapé da barra lateral: **Aurora** (padrão), **Pontos**, **Grade** ou **Liso**. Todos ficam atrás da tela, numa camada fixa sobre a névoa.

| Token              | Claro           | Escuro          | Onde                                           |
| ------------------ | --------------- | --------------- | ---------------------------------------------- |
| `--fundo-mancha-1` | caneta a 12%    | caneta a 22%    | Aurora: mancha violeta, canto superior direito |
| `--fundo-mancha-2` | `#4F7DFF` a 13% | `#4F7DFF` a 13% | Aurora: mancha azul, embaixo à esquerda        |
| `--fundo-mancha-3` | `#D36BFF` a 12% | `#D36BFF` a 10% | Aurora: mancha magenta, no centro              |
| `--fundo-grao`     | opacidade 0,05  | 0,07            | Aurora: grão (ruído SVG) por cima              |
| `--fundo-ponto`    | tinta a 15%     | tinta a 12%     | Pontos: pontos de 1 px a cada 22 px            |
| `--fundo-brilho`   | caneta a 15%    | caneta a 20%    | Pontos: brilho no canto superior direito       |
| `--fundo-linha`    | tinta a 7%      | tinta a 6%      | Grade: linhas a cada 32 px, somem nas bordas   |
| `--fundo-holofote` | caneta a 11%    | caneta a 14%    | Grade: holofote de 380 px que segue o ponteiro |

"A X%" = `color-mix(in oklab, cor X%, transparent)`, ou seja, a cor com X% de opacidade.

## 5. Cores de categoria (escolha do usuário)

**Não são cores da marca.** São as 12 opções que o usuário vê ao escolher a cor de uma categoria (`PaletaCores`, definidas em [`src/lib/cores.ts`](../../src/lib/cores.ts)). Também há uma **cor personalizada** com misturador. A cor escolhida fica gravada no banco.

Na tela há dois ajustes, que só mudam a exibição:

- `corNaTela`: no tema escuro, a cor é **clareada 28%** (misturada com branco) para destacar do papel escuro.
- `corDeTraco`: faixas e barras de progresso escurecem (claro) ou clareiam (escuro) aos poucos até chegarem a 3:1 sobre o papel.

| Nome          | Cor gravada (claro) | Na tela no escuro (+28%) |
| ------------- | ------------------- | ------------------------ |
| Tomate        | `#C8402F`           | `#D77569`                |
| Laranja       | `#D0702A`           | `#DD9866`                |
| Mostarda      | `#B88D14`           | `#CCAD56`                |
| Oliva         | `#71842A`           | `#99A666`                |
| Verde         | `#2F8A57`           | `#69AB86`                |
| Petróleo      | `#1F7A80`           | `#5E9FA4`                |
| Azul (padrão) | `#3366C2`           | `#6C91D3`                |
| Índigo        | `#5B4FBF`           | `#8980D1`                |
| Ameixa        | `#8E4A9E`           | `#AE7DB9`                |
| Rosa          | `#C2477A`           | `#D37B9F`                |
| Terra         | `#8A5A3C`           | `#AB8873`                |
| Grafite       | `#5E6B7A`           | `#8B949F`                |

Subcategoria sem cor própria usa `variacaoCor`: a cor da categoria alternadamente +30% branco, +22% preto, +50% branco, +38% preto, pela ordem de criação.

## 6. Contraste WCAG

Calculado com a fórmula WCAG 2.x (a mesma de `contraste()` em `src/lib/cores.ts`). Critérios: texto normal **AA ≥ 4,5:1**, **AAA ≥ 7:1**; texto grande e elementos gráficos ≥ 3:1.

| Par (texto sobre fundo)                             | Claro      | Escuro                    |
| --------------------------------------------------- | ---------- | ------------------------- |
| tinta sobre névoa (texto na página)                 | 17,0:1 AAA | 16,0:1 AAA                |
| tinta sobre papel (texto na folha/card)             | 18,9:1 AAA | 14,8:1 AAA                |
| grafite sobre papel (texto secundário)              | 6,3:1 AA   | 6,9:1 AA                  |
| grafite sobre névoa                                 | 5,6:1 AA   | 7,4:1 AAA                 |
| grafite sobre muted                                 | 5,2:1 AA   | 6,2:1 AA                  |
| caneta sobre papel (link, item ativo)               | 5,0:1 AA   | 5,5:1 AA                  |
| primary-foreground sobre caneta (botão principal)   | 5,0:1 AA   | 5,8:1 AA                  |
| violeta-profundo sobre papel                        | 10,6:1 AAA | 8,9:1 AAA                 |
| violeta-profundo sobre marca-texto (selo de atraso) | 8,5:1 AAA  | 7,5:1 AAA                 |
| alerta sobre papel (Atrasadas)                      | 5,7:1 AA   | 8,5:1 AAA                 |
| alerta sobre névoa                                  | 5,1:1 AA   | 9,2:1 AAA                 |
| destructive sobre papel (erro)                      | 6,6:1 AA   | 6,6:1 AA                  |
| tinta sobre popover (menus)                         | 18,9:1 AAA | 14,2:1 AAA                |
| tinta sobre accent (hover de menu)                  | 16,1:1 AAA | 12,4:1 AAA                |
| barra-texto sobre barra                             | 18,2:1 AAA | 15,7:1 AAA                |
| barra-suave sobre barra                             | 6,0:1 AA   | 7,3:1 AAA                 |
| papel sobre tinta (botão "Criar")                   | 18,9:1 AAA | 14,8:1 AAA                |
| branco sobre caneta (faixa cheia do Ano)            | 5,0:1 AA   | **3,2:1 só texto grande** |
| input sobre papel (borda de campo)                  | 1,6:1      | 1,5:1                     |
| pauta sobre papel (linhas, decorativo)              | 1,3:1      | 1,2:1                     |

As duas últimas linhas são bordas, não texto. Para bordas de campo, a WCAG 1.4.11 pede 3:1, a menos que o campo seja identificado de outro jeito. Ver "Pontos de atenção" no [README](README.md).

## 7. Cores fixas fora dos tokens

Hex e classes `white`/`black` encontrados em `src/` fora das definições de token (sem contar testes). **Só registro, sem correção.** A lista sai de `node docs/branding/scripts/contar-cores.mjs` (hex) e de `grep` por `-(white|black)`.

| Arquivo:linha                                       | Valor                                      | O que é                                                                                             |
| --------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/components/anexos/dialogo-desenho.tsx:25`      | `#ffffff`                                  | Fundo do canvas de desenho                                                                          |
| `src/components/anexos/dialogo-desenho.tsx:30–33`   | `#1b2838`, `#2343c4`, `#c8402f`, `#2f8a57` | Pincéis do desenho (Tinta, Caneta azul, Vermelho, Verde): a "Tinta" daqui não é a `--tinta` do tema |
| `src/components/anexos/dialogo-desenho.tsx:265`     | `bg-white`                                 | Moldura do canvas                                                                                   |
| `src/components/anexos/item-anexo.tsx:40`           | `bg-white`                                 | Fundo da miniatura de anexo                                                                         |
| `src/components/misturador-cor.tsx:88`              | `#3366c2`                                  | Cor inicial do misturador (= Azul da paleta)                                                        |
| `src/components/misturador-cor.tsx:161`             | `#000`, `#fff`                             | Gradientes de saturação/brilho (funcionais)                                                         |
| `src/components/misturador-cor.tsx:166, 189`        | `border-white`, `rgb(0 0 0/0.35)`          | Alças do misturador                                                                                 |
| `src/components/misturador-cor.tsx:185`             | `#f00 … #f0f`                              | Faixa de matiz (funcional)                                                                          |
| `src/components/misturador-cor.tsx:218`             | `#3b82f6`                                  | Exemplo no texto de ajuda ("como #3b82f6")                                                          |
| `src/components/paleta-cores.tsx:20`                | 8 hex (`#f43f5e` … `#ec4899`)              | Bolinha arco-íris de "Cor personalizada"                                                            |
| `src/components/paleta-cores.tsx:64, 89, 90`        | `text-white`, `text-black/75`              | ✓ sobre a bolinha de cor                                                                            |
| `src/components/paleta-cores.tsx:97`                | `rgb(0 0 0/0.6)`                           | Sombra do ícone "+"                                                                                 |
| `src/features/ano/tons.ts:2`                        | `text-white`                               | Número sobre a faixa cheia do Ano                                                                   |
| `src/components/ui/{alert-dialog,dialog,sheet}.tsx` | `bg-black/10`                              | Véu dos diálogos (gerado pelo shadcn; o da gaveta de notas é sobrescrito no `index.css`)            |
| `src/lib/cores.ts:5–16`                             | 12 hex                                     | Paleta de categorias (dados, ver seção 5)                                                           |
| `src/lib/cores.ts:167`                              | `#ffffff`, `#19161f`                       | `PAPEL_DO_TEMA`, cópia de `--papel` para as contas de contraste                                     |
| `src/lib/cores.ts:186`                              | `#000000`, `#ffffff`                       | Referências da conta `isCorClara`                                                                   |
| `src/index.css:146–147`                             | `#4f7dff`, `#d36bff`                       | Manchas 2 e 3 da Aurora (cores sem token)                                                           |
| `src/index.css:124`                                 | `#ffffff`                                  | `--primary-foreground` no claro (não aponta para `--papel`)                                         |
| `index.html:28, 31`                                 | `#f4f2f8`, `#0f0d15`                       | Fundo antes do CSS carregar (cópia de `--nevoa`, para não piscar)                                   |
