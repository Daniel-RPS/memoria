/**
 * Volta à mão em torno do número de hoje, como quem circula a data na agenda.
 * Vai dentro de um elemento `relative` com o número (Semana e Mês).
 */
export function CirculoHoje() {
  return (
    <svg
      viewBox="0 0 60 44"
      aria-hidden
      className="pointer-events-none absolute -inset-x-3 -inset-y-2 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)] text-caneta"
    >
      <path
        d="M8 22c0-11 13-18 26-17 13 1 22 9 20 19-2 11-17 16-30 14C11 36 3 28 9 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  )
}
