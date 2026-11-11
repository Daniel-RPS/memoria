import { describe, expect, it } from 'vitest'
import type { Lembrete } from '@/db/types'
import {
  agruparPorDia,
  cabecalhoDoDia,
  classificarLembrete,
  contarNaoVistos,
  contextoDoAviso,
  minutosDaAntecedencia,
  momentoDoAviso,
  rotuloDaAntecedencia,
  textoDeQuandoAvisa,
  textoDoBadge,
  tituloDaAba,
  type AlvoDoLembrete,
} from '@/domain/lembretes'

const DIA = '2026-11-11'

function alvo(mudancas: Partial<AlvoDoLembrete> = {}): AlvoDoLembrete {
  return {
    tipo: 'tarefa',
    id: 't1',
    titulo: 'Reunião',
    data: DIA,
    horario: '18:00',
    isAtivo: true,
    ...mudancas,
  }
}

function lembrete(mudancas: Partial<Lembrete> = {}): Lembrete {
  return {
    id: 'l1',
    alvoTipo: 'tarefa',
    alvoId: 't1',
    antecedenciaMin: 10,
    canais: ['app'],
    referencia: `${DIA}T18:00`,
    criadoEm: '2026-11-11T12:00:00.000Z',
    atualizadoEm: '2026-11-11T12:00:00.000Z',
    ...mudancas,
  }
}

const as = (hora: string, dia = DIA) => new Date(`${dia}T${hora}:00-03:00`)

describe('converter dias/horas/minutos', () => {
  it('soma em minutos', () => {
    expect(minutosDaAntecedencia({ dias: 0, horas: 2, minutos: 30 })).toEqual({
      isValida: true,
      minutos: 150,
    })
    expect(minutosDaAntecedencia({ dias: 3, horas: 0, minutos: 0 })).toEqual({
      isValida: true,
      minutos: 4320,
    })
    expect(minutosDaAntecedencia({ dias: 0, horas: 0, minutos: 1 })).toMatchObject({
      isValida: true,
    })
    expect(minutosDaAntecedencia({ dias: 365, horas: 0, minutos: 0 })).toMatchObject({
      isValida: true,
    })
  })

  it('rejeita zero e mais de 365 dias', () => {
    expect(minutosDaAntecedencia({ dias: 0, horas: 0, minutos: 0 })).toMatchObject({
      isValida: false,
    })
    expect(minutosDaAntecedencia({ dias: 365, horas: 0, minutos: 1 })).toMatchObject({
      isValida: false,
    })
    expect(minutosDaAntecedencia({ dias: 366, horas: 0, minutos: 0 })).toMatchObject({
      isValida: false,
    })
  })
})

describe('rótulos', () => {
  it('gera o texto de cada antecedência', () => {
    expect(rotuloDaAntecedencia(0)).toBe('No horário do evento')
    expect(rotuloDaAntecedencia(10)).toBe('10 min antes')
    expect(rotuloDaAntecedencia(60)).toBe('1 hora antes')
    expect(rotuloDaAntecedencia(120)).toBe('2 horas antes')
    expect(rotuloDaAntecedencia(1440)).toBe('1 dia antes')
    expect(rotuloDaAntecedencia(150)).toBe('2 h 30 min antes')
    expect(rotuloDaAntecedencia(4320)).toBe('3 dias antes')
    expect(rotuloDaAntecedencia(1500)).toBe('1 dia 1 h antes')
  })

  it('contexto do card', () => {
    expect(contextoDoAviso(0)).toBe('Agora')
    expect(contextoDoAviso(10)).toBe('Em 10 min')
    expect(contextoDoAviso(60)).toBe('Em 1 hora')
    expect(contextoDoAviso(1440)).toBe('Amanhã')
  })

  it('cabeçalhos de dia e badge', () => {
    expect(cabecalhoDoDia(DIA, DIA)).toBe('Hoje')
    expect(cabecalhoDoDia('2026-11-12', DIA)).toBe('Amanhã')
    expect(cabecalhoDoDia('2026-11-13', DIA)).toBe('sex, 13/11')
    expect(textoDoBadge(3)).toBe('3')
    expect(textoDoBadge(12)).toBe('9+')
  })
})

describe('momento do aviso', () => {
  it('é dia + horário − antecedência, no horário local', () => {
    expect(momentoDoAviso(DIA, '18:00', 10).getTime()).toBe(as('17:50').getTime())
    expect(momentoDoAviso(DIA, '00:30', 60).getTime()).toBe(as('23:30', '2026-11-10').getTime())
    expect(momentoDoAviso(DIA, '18:00', 1440).getTime()).toBe(as('18:00', '2026-11-10').getTime())
  })

  it('texto de quando avisa e "já passou"', () => {
    expect(textoDeQuandoAvisa(as('17:50'), as('12:00'))).toBe('avisa hoje às 17:50')
    expect(textoDeQuandoAvisa(as('17:50'), as('17:51'))).toBe('já passou')
  })
})

describe('classificar', () => {
  it('agendado antes da hora', () => {
    expect(classificarLembrete(lembrete(), alvo(), as('12:00')).situacao).toBe('agendado')
  })

  it('dispara na hora e até 60 s depois', () => {
    expect(classificarLembrete(lembrete(), alvo(), as('17:50')).situacao).toBe('disparar')
    const em59s = new Date(as('17:50').getTime() + 59_000)
    expect(classificarLembrete(lembrete(), alvo(), em59s).situacao).toBe('disparar')
  })

  it('perdido quando venceu há mais de 60 s com o app fechado', () => {
    const resultado = classificarLembrete(lembrete(), alvo(), as('17:52'))
    expect(resultado.situacao).toBe('perdido')
    expect(resultado.mudanca).toEqual({ perdido: true })
  })

  it('com o app aberto, o que venceu depois da última conferência dispara mesmo atrasado', () => {
    expect(classificarLembrete(lembrete(), alvo(), as('17:53'), as('17:49')).situacao).toBe(
      'disparar',
    )
  })

  it('alvo mudou para um momento que já passou: silenciado, não perdido', () => {
    const resultado = classificarLembrete(
      lembrete({ referencia: '2026-11-12T12:00' }),
      alvo({ horario: '12:00' }),
      as('17:51'),
    )
    expect(resultado.situacao).toBe('silenciado')
    expect(resultado.mudanca).toMatchObject({ silenciado: true, referencia: `${DIA}T12:00` })
  })

  it('alvo mudou para o futuro: volta a agendado e zera o disparo', () => {
    const resultado = classificarLembrete(
      lembrete({ disparadoEm: as('17:50').toISOString(), visto: true }),
      alvo({ data: '2026-11-12' }),
      as('18:30'),
    )
    expect(resultado.situacao).toBe('agendado')
    expect(resultado.mudanca).toMatchObject({
      referencia: '2026-11-12T18:00',
      disparadoEm: undefined,
      visto: undefined,
    })
  })

  it('alvo concluído, arquivado ou transferido é ignorado; vencido assim é silenciado', () => {
    expect(classificarLembrete(lembrete(), alvo({ isAtivo: false }), as('12:00')).situacao).toBe(
      'ignorado',
    )
    expect(classificarLembrete(lembrete(), alvo({ isAtivo: false }), as('17:55')).situacao).toBe(
      'silenciado',
    )
  })

  it('sem horário ou sem alvo: ignorado', () => {
    expect(
      classificarLembrete(lembrete(), alvo({ horario: undefined }), as('12:00')).situacao,
    ).toBe('ignorado')
    expect(classificarLembrete(lembrete(), undefined, as('12:00')).situacao).toBe('ignorado')
  })
})

describe('não vistos e título da aba', () => {
  const disparado = lembrete({ id: 'a', disparadoEm: as('17:50').toISOString() })

  it('conta disparados e perdidos não vistos; visto (X, clique ou aba) não conta', () => {
    const linhas = [
      { lembrete: disparado, alvo: alvo() },
      { lembrete: lembrete({ id: 'b', perdido: true }), alvo: alvo() },
      { lembrete: lembrete({ id: 'c', disparadoEm: 'x', visto: true }), alvo: alvo() },
      { lembrete: lembrete({ id: 'd', perdido: true, silenciado: true }), alvo: alvo() },
      { lembrete: lembrete({ id: 'e' }), alvo: alvo() },
      { lembrete: lembrete({ id: 'f', perdido: true }) },
    ]
    // O card que sai sozinho não marca nada: o disparado "a" continua contando.
    expect(contarNaoVistos(linhas)).toBe(2)
  })

  it('monta o título com e sem não vistos', () => {
    expect(tituloDaAba(2)).toBe('(2) MemorIA')
    expect(tituloDaAba(0)).toBe('MemorIA')
  })
})

describe('agrupar por dia', () => {
  it('ordena pelo próximo aviso e agrupa pelo dia do evento', () => {
    const linhas = [
      { id: 'x', data: '2026-11-12', proximoAviso: as('09:00', '2026-11-12') },
      { id: 'y', data: DIA, proximoAviso: as('17:50') },
      { id: 'z', data: DIA, proximoAviso: as('08:00') },
    ]
    const dias = agruparPorDia(linhas, DIA)
    expect(dias.map((dia) => dia.titulo)).toEqual(['Hoje', 'Amanhã'])
    expect(dias[0].linhas.map((linha) => linha.id)).toEqual(['z', 'y'])
  })
})
