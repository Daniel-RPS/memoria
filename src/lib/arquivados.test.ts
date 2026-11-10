import { describe, expect, it } from 'vitest'
import type {
  Category,
  GroupCard,
  GroupItem,
  GroupSeries,
  Note,
  Procedure,
  Subtask,
  Task,
} from '@/db/types'
import {
  agruparPorPeriodo,
  alvosDosItens,
  buscarArquivados,
  contarPorTipo,
  destinoPadraoDoDesarquivar,
  filtrarPorTipo,
  montarArquivados,
  periodoDe,
  precisaDeDia,
  textoDoAviso,
  type DadosDoArquivo,
} from '@/lib/arquivados'

const HOJE = '2026-11-03'
const base = { criadoEm: '2026-10-01T12:00:00.000Z', atualizadoEm: '2026-10-01T12:00:00.000Z' }

const casa: Category = {
  ...base,
  id: 'casa',
  nome: 'Casa',
  cor: '#336699',
  tipo: 'grupo',
  ordem: 1,
}

function tarefa(extra: Partial<Task> = {}): Task {
  return {
    ...base,
    id: 't1',
    titulo: 'Ligar para Fulano',
    data: '2026-10-28',
    dataOriginal: '2026-10-28',
    ordem: 1,
    status: 'arquivada',
    arquivadoEm: '2026-11-02T15:00:00.000Z',
    ...extra,
  }
}

function dados(extra: Partial<DadosDoArquivo> = {}): DadosDoArquivo {
  return {
    tarefas: [],
    subtarefas: [],
    series: [],
    cards: [],
    itens: [],
    notas: [],
    procedimentos: [],
    vinculos: { tarefas: [], series: [], cards: [], itens: [], categorias: [casa] },
    categorias: [casa],
    ...extra,
  }
}

const serie: GroupSeries = { ...base, id: 's1', titulo: 'Casa nova', categoryId: 'casa' }
const card: GroupCard = {
  ...base,
  id: 'c1',
  seriesId: 's1',
  data: '2026-10-29',
  ordem: 1,
  arquivado: true,
  arquivadoEm: '2026-10-30T15:00:00.000Z',
}
function item(id: string, status: GroupItem['status'], extra: Partial<GroupItem> = {}): GroupItem {
  return {
    ...base,
    id,
    cadeiaId: id,
    cardId: 'c1',
    titulo: `Item ${id}`,
    ordem: 1,
    status,
    dataOriginal: '2026-10-29',
    ...extra,
  }
}
const nota: Note = {
  ...base,
  id: 'n1',
  titulo: 'Senha do roteador',
  conteudo: 'Trocar no domingo\nsegunda linha',
  arquivado: true,
  arquivadoEm: '2026-10-20T15:00:00.000Z',
}
const procedimento: Procedure = {
  ...base,
  id: 'p1',
  titulo: 'Renovar certificado',
  categoryId: 'casa',
  etapas: [
    { id: 'e1', texto: 'Abrir o portal', ordem: 0 },
    { id: 'e2', texto: 'Pagar a taxa', ordem: 1 },
  ],
  arquivado: true,
  arquivadoEm: '2026-08-01T15:00:00.000Z',
}

describe('montarArquivados', () => {
  it('tarefa: data em que estava, subtarefas e categoria', () => {
    const subtarefas: Subtask[] = [
      { ...base, id: 'a', taskId: 't1', titulo: 'Achar o número', concluida: true, ordem: 1 },
      { ...base, id: 'b', taskId: 't1', titulo: 'Ligar', concluida: false, ordem: 2 },
    ]
    const [linha] = montarArquivados(
      dados({ tarefas: [tarefa({ categoryId: 'casa' })], subtarefas }),
      HOJE,
    )
    expect(linha).toMatchObject({
      tipo: 'tarefa',
      detalhe: 'era de 28/10 · 1 de 2 subtarefas',
      cor: '#336699',
      categoriaNome: 'Casa',
      data: '2026-10-28',
    })
  })

  it('ignora tarefa que não está arquivada', () => {
    expect(montarArquivados(dados({ tarefas: [tarefa({ status: 'pendente' })] }), HOJE)).toEqual([])
  })

  it('grupo: data do card e progresso sem contar transferidos', () => {
    const itens = [item('a', 'concluido'), item('b', 'pendente'), item('c', 'transferido')]
    const [linha] = montarArquivados(dados({ series: [serie], cards: [card], itens }), HOJE)
    expect(linha).toMatchObject({
      tipo: 'grupo',
      variante: 'card',
      titulo: 'Casa nova',
      detalhe: 'era de 29/10 · 1 de 2 itens',
      categoriaNome: 'Casa',
    })
  })

  it('item arquivado sozinho num card ativo vira uma linha do grupo', () => {
    const ativo = { ...card, arquivado: false, arquivadoEm: undefined }
    const itens = [
      item('a', 'pendente'),
      item('b', 'arquivado', { arquivadoEm: '2026-11-01T15:00:00.000Z' }),
      item('c', 'arquivado', { arquivadoEm: '2026-11-02T15:00:00.000Z' }),
    ]
    const linhas = montarArquivados(dados({ series: [serie], cards: [ativo], itens }), HOJE)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      variante: 'itens',
      idsItens: ['b', 'c'],
      detalhe: '2 itens arquivados do dia 29/10',
      arquivadoEm: '2026-11-02T15:00:00.000Z',
    })
    expect(precisaDeDia(linhas[0]!)).toBe(false)
  })

  it('nota: vínculo e prévia de uma linha; avulsa sem vínculo', () => {
    const [avulsa] = montarArquivados(dados({ notas: [nota] }), HOJE)
    expect(avulsa).toMatchObject({
      tipo: 'nota',
      detalhe: 'Nota avulsa · Trocar no domingo',
      titulo: 'Senha do roteador',
    })

    const ligada = { ...nota, vinculo: { tipo: 'tarefa' as const, id: 't1' } }
    const vinculos = { ...dados().vinculos, tarefas: [tarefa({ titulo: 'Fazer Deploy' })] }
    const [com] = montarArquivados(dados({ notas: [ligada], vinculos }), HOJE)
    expect(com?.detalhe.startsWith('Fazer Deploy · ')).toBe(true)
  })

  it('procedimento: categoria e número de etapas', () => {
    const [linha] = montarArquivados(dados({ procedimentos: [procedimento] }), HOJE)
    expect(linha).toMatchObject({
      detalhe: 'Casa · 2 etapas',
      leitura: '1. Abrir o portal\n2. Pagar a taxa',
    })
    const semCategoria = {
      ...procedimento,
      categoryId: undefined,
      etapas: procedimento.etapas.slice(0, 1),
    }
    expect(montarArquivados(dados({ procedimentos: [semCategoria] }), HOJE)[0]?.detalhe).toBe(
      'Sem categoria · 1 etapa',
    )
  })

  it('nota ou procedimento não arquivado fica de fora', () => {
    const linhas = montarArquivados(
      dados({
        notas: [{ ...nota, arquivado: false }],
        procedimentos: [{ ...procedimento, arquivado: undefined }],
      }),
      HOJE,
    )
    expect(linhas).toEqual([])
  })
})

describe('filtros, busca e contagens', () => {
  const todos = montarArquivados(
    dados({
      tarefas: [tarefa({ categoryId: 'casa' })],
      series: [serie],
      cards: [card],
      itens: [item('a', 'pendente')],
      notas: [nota],
      procedimentos: [procedimento],
    }),
    HOJE,
  )

  it('conta por tipo', () => {
    expect(contarPorTipo(todos)).toEqual({
      todos: 4,
      tarefa: 1,
      grupo: 1,
      nota: 1,
      procedimento: 1,
    })
    expect(filtrarPorTipo(todos, 'nota').map((linha) => linha.id)).toEqual(['n1'])
    expect(filtrarPorTipo(todos, 'todos')).toHaveLength(4)
  })

  it('busca no título, no texto e na categoria, sem acento nem maiúscula', () => {
    expect(buscarArquivados(todos, 'FULANO').map((linha) => linha.tipo)).toEqual(['tarefa'])
    expect(buscarArquivados(todos, 'domingo').map((linha) => linha.tipo)).toEqual(['nota'])
    expect(buscarArquivados(todos, 'taxa').map((linha) => linha.tipo)).toEqual(['procedimento'])
    expect(buscarArquivados(todos, 'item a').map((linha) => linha.tipo)).toEqual(['grupo'])
    // Categoria "Casa": tarefa, grupo e procedimento.
    expect(
      buscarArquivados(todos, 'casa')
        .map((linha) => linha.tipo)
        .sort(),
    ).toEqual(['grupo', 'procedimento', 'tarefa'])
    expect(buscarArquivados(todos, 'nada disso')).toEqual([])
    expect(buscarArquivados(todos, '  ')).toHaveLength(4)
  })

  it('agrupa por período, do mais recente ao mais antigo, sem períodos vazios', () => {
    expect(periodoDe('2026-11-03T12:00:00.000Z', HOJE)).toBe('semana')
    expect(periodoDe('2026-10-28T12:00:00.000Z', HOJE)).toBe('semana')
    expect(periodoDe('2026-10-27T12:00:00.000Z', HOJE)).toBe('mes')
    expect(periodoDe('2026-10-04T12:00:00.000Z', HOJE)).toBe('antigos')

    const grupos = agruparPorPeriodo(todos, HOJE)
    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Esta semana', 'Este mês', 'Mais antigos'])
    expect(grupos.map((grupo) => grupo.itens.map((linha) => linha.tipo))).toEqual([
      ['tarefa', 'grupo'],
      ['nota'],
      ['procedimento'],
    ])
    expect(
      agruparPorPeriodo(
        todos.filter((linha) => linha.tipo === 'nota'),
        HOJE,
      ),
    ).toHaveLength(1)
  })

  it('separa os ids por tabela', () => {
    expect(alvosDosItens(todos)).toEqual({
      tarefas: ['t1'],
      cards: ['c1'],
      itens: [],
      notas: ['n1'],
      procedimentos: ['p1'],
    })
  })
})

describe('desarquivar: dia e avisos', () => {
  it('volta para o dia que tinha, ou para hoje se ele já passou', () => {
    expect(destinoPadraoDoDesarquivar('2026-10-28', HOJE)).toBe(HOJE)
    expect(destinoPadraoDoDesarquivar('2026-11-03', HOJE)).toBe(HOJE)
    expect(destinoPadraoDoDesarquivar('2026-11-10', HOJE)).toBe('2026-11-10')
  })

  it('frases dos avisos', () => {
    expect(textoDoAviso('arquivado', [{ tipo: 'tarefa' }])).toBe('Tarefa arquivada')
    expect(textoDoAviso('arquivado', [{ tipo: 'grupo' }])).toBe('Grupo de tarefas arquivado')
    expect(textoDoAviso('desarquivado', [{ tipo: 'nota' }])).toBe('Nota desarquivada')
    expect(textoDoAviso('desarquivado', [{ tipo: 'nota' }, { tipo: 'procedimento' }])).toBe(
      '2 itens desarquivados',
    )
  })
})
