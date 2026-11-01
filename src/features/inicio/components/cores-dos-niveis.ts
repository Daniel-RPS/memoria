import type { NivelDeIntensidade } from '@/lib/estatisticas'

/** Cor de cada nível: 0 é o papel com contorno; 1 a 4 sobem do lavanda ao violeta profundo. */
export const CORES_DOS_NIVEIS: Record<NivelDeIntensidade, string> = {
  0: 'bg-nevoa outline outline-1 -outline-offset-1 outline-pauta',
  1: 'bg-[color-mix(in_oklab,var(--caneta)_24%,var(--papel))]',
  2: 'bg-[color-mix(in_oklab,var(--caneta)_52%,var(--papel))]',
  3: 'bg-caneta',
  4: 'bg-violeta-profundo',
}
