/*
 * Geometria da meia-roda da barra lateral: semicírculo voltado para a direita, com N setores
 * empilhados de cima para baixo (4 em Calendário, Organização e Ajustes; 2 em Dados). O centro fica na borda esquerda, na metade da altura
 * (0,0 no viewBox "0 -96 96 192").
 */

/** Área da meia-roda, em px. */
export const LARGURA_DA_RODA = 96
export const ALTURA_DA_RODA = 192
/** Espaço reservado abaixo da meia-roda para a etiqueta (4 px de vão + a pílula). */
export const ALTURA_DA_ETIQUETA = 30
export const RAIO_EXTERNO = 84
export const RAIO_INTERNO = 26
export const RAIO_DO_ARCO = 89
export const RAIO_DO_FURO = 20

/** Distância do centro da roda ao centro do ícone de cada setor. */
export const RAIO_DOS_ICONES = 55
/** Lado do botão de cada setor (alvo do teclado), centrado no ícone. */
export const LADO_DO_BOTAO = 34

const ABERTURA_DA_RODA = 180
const VAO_ENTRE_SETORES = 5
const MARGEM_DO_ARCO = 11

/** Abertura de cada setor quando a roda tem `total` setores. */
export function aberturaDoSetor(total: number) {
  return ABERTURA_DA_RODA / total
}

/**
 * Ângulo central do setor `indice` (0° aponta para a direita), de cima para baixo:
 * −90° + (i + 0,5)·(180°/N). Com 4: −67,5°, −22,5°, 22,5°, 67,5°; com 2: −45°, 45°.
 */
export function anguloDoSetor(indice: number, total: number) {
  return -90 + (indice + 0.5) * aberturaDoSetor(total)
}

/**
 * Canto superior esquerdo (px) do botão do setor dentro da caixa da roda, com o centro do botão
 * a `RAIO_DOS_ICONES` do centro da roda (borda esquerda, metade da altura).
 */
export function posicaoDoBotao(anguloCentral: number) {
  const radianos = (anguloCentral * Math.PI) / 180
  const metade = LADO_DO_BOTAO / 2
  return {
    top: Math.round(ALTURA_DA_RODA / 2 + RAIO_DOS_ICONES * Math.sin(radianos) - metade),
    left: Math.round(RAIO_DOS_ICONES * Math.cos(radianos) - metade),
  }
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

function ponto(raio: number, graus: number) {
  const radianos = (graus * Math.PI) / 180
  return `${arredondar(raio * Math.cos(radianos))} ${arredondar(raio * Math.sin(radianos))}`
}

/** Setor do anel: arco externo no sentido horário (sweep 1), interno de volta (sweep 0). */
export function caminhoDoSetor(anguloCentral: number, total: number) {
  const meio = (aberturaDoSetor(total) - VAO_ENTRE_SETORES) / 2
  const inicio = anguloCentral - meio
  const fim = anguloCentral + meio
  return [
    `M ${ponto(RAIO_EXTERNO, inicio)}`,
    `A ${RAIO_EXTERNO} ${RAIO_EXTERNO} 0 0 1 ${ponto(RAIO_EXTERNO, fim)}`,
    `L ${ponto(RAIO_INTERNO, fim)}`,
    `A ${RAIO_INTERNO} ${RAIO_INTERNO} 0 0 0 ${ponto(RAIO_INTERNO, inicio)}`,
    'Z',
  ].join(' ')
}

/** Arco fino por fora do setor, um pouco mais curto que ele. */
export function caminhoDoArco(anguloCentral: number, total: number) {
  const meio = (aberturaDoSetor(total) - VAO_ENTRE_SETORES - MARGEM_DO_ARCO) / 2
  return `M ${ponto(RAIO_DO_ARCO, anguloCentral - meio)} A ${RAIO_DO_ARCO} ${RAIO_DO_ARCO} 0 0 1 ${ponto(RAIO_DO_ARCO, anguloCentral + meio)}`
}
