/**
 * `matchMedia` de mentira para o jsdom (que não tem): por padrão nenhuma consulta casa
 * (sistema claro, movimento normal); `simularMidia` muda uma e avisa quem escuta.
 */
const consultasQueCasam = new Set<string>()
const ouvintes = new Map<string, Set<() => void>>()

export function simularMidia(consulta: string, isCasa: boolean) {
  if (isCasa) consultasQueCasam.add(consulta)
  else consultasQueCasam.delete(consulta)
  ouvintes.get(consulta)?.forEach((avisar) => avisar())
}

export function limparMidia() {
  consultasQueCasam.clear()
}

export function instalarMatchMedia() {
  window.matchMedia = (consulta: string) => {
    const daConsulta = ouvintes.get(consulta) ?? new Set()
    ouvintes.set(consulta, daConsulta)
    return {
      media: consulta,
      get matches() {
        return consultasQueCasam.has(consulta)
      },
      onchange: null,
      addEventListener: (_tipo: string, avisar: () => void) => daConsulta.add(avisar),
      removeEventListener: (_tipo: string, avisar: () => void) => daConsulta.delete(avisar),
      addListener: (avisar: () => void) => daConsulta.add(avisar),
      removeListener: (avisar: () => void) => daConsulta.delete(avisar),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }
}
