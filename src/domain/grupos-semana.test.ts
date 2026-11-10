import { describe, expect, it } from 'vitest'
import { somarDias } from '@/lib/datas'
import {
  alternarCardNaSemana,
  chaveCardSemana,
  defaultGroupExpanded,
  definirTodosCardsNaSemana,
  isCardAbertoNaSemana,
  resolveGroupExpanded,
} from '@/domain/grupos-semana'

describe('grupos-semana domain', () => {
  const HOJE = '2026-11-05' // quinta-feira
  const ONTEM = somarDias(HOJE, -1) // '2026-11-04' (quarta)
  const AMANHA = somarDias(HOJE, 1) // '2026-11-06' (sexta)

  describe('defaultGroupExpanded', () => {
    it('retorna true para o card na data de hoje', () => {
      expect(defaultGroupExpanded(HOJE, HOJE)).toBe(true)
    })

    it('retorna false para o card de ontem', () => {
      expect(defaultGroupExpanded(ONTEM, HOJE)).toBe(false)
    })

    it('retorna false para o card de amanhã', () => {
      expect(defaultGroupExpanded(AMANHA, HOJE)).toBe(false)
    })

    it('retorna false para todos os cards de uma semana sem o dia de hoje', () => {
      // Semana anterior: 2026-10-26 a 2026-11-01
      const diasSemanaAnterior = [
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ]
      for (const dia of diasSemanaAnterior) {
        expect(defaultGroupExpanded(dia, HOJE)).toBe(false)
      }

      // Semana seguinte: 2026-11-09 a 2026-11-15
      const diasSemanaSeguinte = [
        '2026-11-09',
        '2026-11-10',
        '2026-11-11',
        '2026-11-12',
        '2026-11-13',
        '2026-11-14',
        '2026-11-15',
      ]
      for (const dia of diasSemanaSeguinte) {
        expect(defaultGroupExpanded(dia, HOJE)).toBe(false)
      }
    })

    it('acompanha a virada da meia-noite', () => {
      const diaAntesDaMeiaNoite = HOJE
      const diaAposMeiaNoite = AMANHA

      // Antes da meia-noite (hoje = diaAntesDaMeiaNoite):
      expect(defaultGroupExpanded(diaAntesDaMeiaNoite, diaAntesDaMeiaNoite)).toBe(true)
      expect(defaultGroupExpanded(diaAposMeiaNoite, diaAntesDaMeiaNoite)).toBe(false)

      // Após a meia-noite (hoje passa a ser diaAposMeiaNoite):
      expect(defaultGroupExpanded(diaAntesDaMeiaNoite, diaAposMeiaNoite)).toBe(false)
      expect(defaultGroupExpanded(diaAposMeiaNoite, diaAposMeiaNoite)).toBe(true)
    })
  })

  describe('chaveCardSemana', () => {
    it('gera chave única combinando série e data', () => {
      expect(chaveCardSemana('serie-1', HOJE)).toBe('serie-1:2026-11-05')
      expect(chaveCardSemana('serie-1', ONTEM)).toBe('serie-1:2026-11-04')
      expect(chaveCardSemana('serie-2', HOJE)).toBe('serie-2:2026-11-05')
    })
  })

  describe('isCardAbertoNaSemana e alternarCardNaSemana', () => {
    it('respeita o padrão quando não há override', () => {
      const overrides = {}
      expect(isCardAbertoNaSemana(overrides, 'serie-1', HOJE, HOJE)).toBe(true)
      expect(isCardAbertoNaSemana(overrides, 'serie-1', ONTEM, HOJE)).toBe(false)
    })

    it('alternar card de outro dia abre apenas aquele card naquele dia', () => {
      let overrides = {}
      // Inicialmente ontem está recolhido
      expect(isCardAbertoNaSemana(overrides, 'serie-1', ONTEM, HOJE)).toBe(false)

      // Alterna ontem
      overrides = alternarCardNaSemana(overrides, 'serie-1', ONTEM, HOJE)
      expect(isCardAbertoNaSemana(overrides, 'serie-1', ONTEM, HOJE)).toBe(true)
      // Hoje continua aberto
      expect(isCardAbertoNaSemana(overrides, 'serie-1', HOJE, HOJE)).toBe(true)
      // Amanhã continua fechado
      expect(isCardAbertoNaSemana(overrides, 'serie-1', AMANHA, HOJE)).toBe(false)
    })

    it('alternar card de hoje fecha apenas o card de hoje', () => {
      let overrides = {}
      // Abre ontem primeiro
      overrides = alternarCardNaSemana(overrides, 'serie-1', ONTEM, HOJE)
      expect(isCardAbertoNaSemana(overrides, 'serie-1', ONTEM, HOJE)).toBe(true)

      // Fecha hoje
      overrides = alternarCardNaSemana(overrides, 'serie-1', HOJE, HOJE)
      expect(isCardAbertoNaSemana(overrides, 'serie-1', HOJE, HOJE)).toBe(false)
      // Ontem continua aberto
      expect(isCardAbertoNaSemana(overrides, 'serie-1', ONTEM, HOJE)).toBe(true)
    })
  })

  describe('definirTodosCardsNaSemana', () => {
    it('expande ou recolhe todos os cards da lista', () => {
      const cards = [
        { serieId: 's1', data: ONTEM },
        { serieId: 's1', data: HOJE },
        { serieId: 's2', data: AMANHA },
      ]

      const todosFechados = definirTodosCardsNaSemana(cards, false)
      expect(isCardAbertoNaSemana(todosFechados, 's1', ONTEM, HOJE)).toBe(false)
      expect(isCardAbertoNaSemana(todosFechados, 's1', HOJE, HOJE)).toBe(false)
      expect(isCardAbertoNaSemana(todosFechados, 's2', AMANHA, HOJE)).toBe(false)

      const todosAbertos = definirTodosCardsNaSemana(cards, true)
      expect(isCardAbertoNaSemana(todosAbertos, 's1', ONTEM, HOJE)).toBe(true)
      expect(isCardAbertoNaSemana(todosAbertos, 's1', HOJE, HOJE)).toBe(true)
      expect(isCardAbertoNaSemana(todosAbertos, 's2', AMANHA, HOJE)).toBe(true)
    })
  })
  describe('resolveGroupExpanded', () => {
    it('usa a escolha salva e, sem ela, o padrão (aberto só hoje)', () => {
      expect(resolveGroupExpanded(undefined, HOJE, HOJE)).toBe(true)
      expect(resolveGroupExpanded(undefined, ONTEM, HOJE)).toBe(false)
      expect(resolveGroupExpanded(false, HOJE, HOJE)).toBe(false)
      expect(resolveGroupExpanded(true, AMANHA, HOJE)).toBe(true)
    })
  })
})
