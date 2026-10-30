import { describe, expect, it } from 'vitest'
import type { CampoVariavel, Procedure } from '@/db/types'
import {
  buscarProcedimentos,
  camposDesconhecidos,
  definirEstadoDoPasso,
  idsDosPassos,
  partesDoTexto,
  progressoExecucao,
  substituirCampos,
} from '@/lib/procedimentos'

const campos: CampoVariavel[] = [
  { id: 'c1', nome: 'Servidor', tipo: 'texto' },
  { id: 'c2', nome: 'Porta', tipo: 'numero' },
  {
    id: 'c3',
    nome: 'Senha do banco',
    tipo: 'credencial',
    localCredencial: 'Cofre TI, item Postgres',
  },
]

function procedimento(campos: Partial<Procedure>): Procedure {
  return {
    id: 'p',
    titulo: 'Procedimento',
    descricao: '',
    secoes: [],
    camposVariaveis: [],
    versao: 1,
    criadoEm: '',
    atualizadoEm: '',
    ...campos,
  }
}

const passo = (id: string, texto: string) => ({ id, texto, anexos: [], subpassos: [] })

describe('campos variáveis', () => {
  it('troca {{campo}} pelo valor, sem diferenciar maiúsculas, acentos e espaços', () => {
    expect(
      substituirCampos('ssh admin@{{ servidor }} -p {{PORTA}}', campos, { c1: 'db01', c2: '22' }),
    ).toBe('ssh admin@db01 -p 22')
  })

  it('credencial mostra só onde a senha está', () => {
    expect(substituirCampos('Senha: {{senha do banco}}', campos, { c3: 'nao-deveria' })).toBe(
      'Senha: [senha em: Cofre TI, item Postgres]',
    )
  })

  it('marca o que falta preencher e o que não existe', () => {
    expect(partesDoTexto('{{Servidor}} {{inexistente}}', campos, {})).toEqual([
      { tipo: 'faltando', texto: '{{Servidor}}', campo: 'Servidor' },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'desconhecido', texto: '{{inexistente}}' },
    ])
  })

  it('lista nomes usados que não são campos', () => {
    const proc = procedimento({
      camposVariaveis: campos,
      secoes: [{ id: 's', titulo: 'S', passos: [passo('a', '{{servidor}} {{usuario}}')] }],
    })
    expect(camposDesconhecidos(proc)).toEqual(['usuario'])
  })
})

describe('progresso da execução', () => {
  const proc = procedimento({
    secoes: [
      { id: 's1', titulo: 'Preparar', passos: [passo('a', 'A'), passo('b', 'B')] },
      { id: 's2', titulo: 'Aplicar', passos: [passo('c', 'C')] },
    ],
  })

  it('lista os passos em ordem e conta feitos e pulados', () => {
    expect(idsDosPassos(proc)).toEqual(['a', 'b', 'c'])
    expect(
      progressoExecucao(proc, { passosMarcados: ['a', 'sumiu'], passosPulados: ['c'] }),
    ).toEqual({ feitos: 1, pulados: 1, total: 3 })
  })

  it('um passo nunca fica feito e pulado ao mesmo tempo', () => {
    const feito = definirEstadoDoPasso({ passosMarcados: [], passosPulados: ['a'] }, 'a', 'feito')
    expect(feito).toEqual({ passosMarcados: ['a'], passosPulados: [] })
    expect(definirEstadoDoPasso(feito, 'a', 'pendente')).toEqual({
      passosMarcados: [],
      passosPulados: [],
    })
  })
})

describe('buscarProcedimentos', () => {
  const lista = [
    procedimento({ id: '1', titulo: 'Backup do servidor' }),
    procedimento({
      id: '2',
      titulo: 'Configurar e-mail',
      secoes: [{ id: 's', titulo: 'S', passos: [passo('a', 'Reiniciar o serviço do servidor')] }],
    }),
    procedimento({ id: '3', titulo: 'Declaração de imposto', descricao: 'Receita federal' }),
  ]

  it('procura em título, descrição e passos, ignorando acentos', () => {
    expect(buscarProcedimentos(lista, 'servico').map((p) => p.id)).toEqual(['2'])
    expect(buscarProcedimentos(lista, 'receita').map((p) => p.id)).toEqual(['3'])
  })

  it('exige todas as palavras e põe quem tem no título primeiro', () => {
    expect(buscarProcedimentos(lista, 'servidor').map((p) => p.id)).toEqual(['1', '2'])
    expect(buscarProcedimentos(lista, 'servidor email')).toHaveLength(0)
  })

  it('sem termo, devolve todos em ordem alfabética', () => {
    expect(buscarProcedimentos(lista, '  ').map((p) => p.id)).toEqual(['1', '2', '3'])
  })
})
