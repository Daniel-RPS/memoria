import { describe, expect, it } from 'vitest'
import type { Category, GroupCard, GroupItem, GroupSeries, Note, Task } from '@/db/types'
import { montarCategorias } from '@/lib/categorias'
import { preencherCadeias } from '@/lib/grupos'
import {
  agruparNotas,
  alvosParaVincular,
  avisoNotasAvulsas,
  buscarNotas,
  buscarNotasComDono,
  converterNotaAntiga,
  diaMaisPerto,
  donoDaNota,
  filtrarNotas,
  indexarVinculos,
  previaDaNota,
  textoDoVinculo,
  tituloDaNota,
  type DadosDosVinculos,
  type NotaComDono,
} from '@/lib/notas'

const HOJE = '2026-11-02'
const base = { criadoEm: '1', atualizadoEm: '1' }

const categoria = (id: string, nome: string, ordem: number): Category => ({
  ...base,
  id,
  nome,
  cor: '#5b4fbf',
  tipo: 'grupo',
  ordem,
})

const tarefa = (id: string, titulo: string, extras: Partial<Task> = {}): Task => ({
  ...base,
  id,
  titulo,
  data: HOJE,
  dataOriginal: HOJE,
  ordem: 1,
  status: 'pendente',
  ...extras,
})

const serie = (id: string, titulo: string, categoryId?: string): GroupSeries => ({
  ...base,
  id,
  titulo,
  categoryId,
})

const card = (id: string, seriesId: string, data: string): GroupCard => ({
  ...base,
  id,
  seriesId,
  data,
  ordem: 1,
  arquivado: false,
})

const item = (
  id: string,
  cardId: string,
  titulo: string,
  extras: Partial<GroupItem> = {},
): GroupItem => ({
  ...base,
  id,
  cadeiaId: id,
  cardId,
  titulo,
  ordem: 1,
  status: 'pendente',
  dataOriginal: '2026-11-01',
  ...extras,
})

const nota = (id: string, extras: Partial<Note> = {}): Note => ({
  ...base,
  id,
  titulo: '',
  conteudo: '',
  ...extras,
})

/**
 * Hostinger (categoria Hostinger) com "Fazer Deploy" levado de 01/11 para 02/11, a tarefa
 * "Ligar para Fulano" (categoria Casa) e o grupo "Mercado" sem categoria.
 */
function dadosDoExemplo(): DadosDosVinculos {
  return {
    tarefas: [tarefa('ligar', 'Ligar para Fulano', { categoryId: 'casa' })],
    series: [serie('hostinger', 'Hostinger', 'cat-hostinger'), serie('mercado', 'Mercado')],
    cards: [
      card('h1', 'hostinger', '2026-11-01'),
      card('h2', 'hostinger', '2026-11-02'),
      card('m1', 'mercado', '2026-10-30'),
    ],
    itens: [
      item('deploy-1', 'h1', 'Fazer Deploy', {
        status: 'transferido',
        transferidoParaCardId: 'h2',
      }),
      item('deploy-2', 'h2', 'Fazer Deploy', { origemItemId: 'deploy-1', cadeiaId: 'deploy-1' }),
    ],
    categorias: montarCategorias([
      categoria('cat-hostinger', 'Hostinger', 1),
      categoria('casa', 'Casa', 2),
    ]),
  }
}

function comDono(notas: Note[], dados = dadosDoExemplo()): NotaComDono[] {
  const indice = indexarVinculos(dados, HOJE)
  return notas.map((uma) => ({ nota: uma, dono: donoDaNota(uma.vinculo, indice) }))
}

describe('título e prévia', () => {
  it('usa o título, senão a primeira linha com texto, senão "Sem título"', () => {
    expect(tituloDaNota({ titulo: ' Ideias ', conteudo: 'x' })).toBe('Ideias')
    expect(tituloDaNota({ titulo: '', conteudo: '\n  Comprar tinta\nbranca' })).toBe(
      'Comprar tinta',
    )
    expect(tituloDaNota({ titulo: '', conteudo: '   ' })).toBe('Sem título')
  })

  it('a prévia não repete a linha que virou título', () => {
    expect(previaDaNota({ titulo: '', conteudo: 'Comprar tinta\nbranca\nfosca' })).toBe(
      'branca\nfosca',
    )
    expect(previaDaNota({ titulo: 'Tinta', conteudo: 'branca' })).toBe('branca')
  })

  it('busca no título e no texto, sem diferenciar acentos', () => {
    const notas = [
      { titulo: 'Reunião', conteudo: 'pauta do condomínio' },
      { titulo: 'Receitas', conteudo: 'pão de queijo' },
    ]
    expect(buscarNotas(notas, 'condominio')).toHaveLength(1)
    expect(buscarNotas(notas, 'reuniao pauta')).toHaveLength(1)
    expect(buscarNotas(notas, 'queijo reuniao')).toHaveLength(0)
    expect(buscarNotas(notas, '')).toHaveLength(2)
  })
})

describe('a quem a nota pertence', () => {
  it('monta o caminho "Categoria › Grupo › Item" pelo item atual da cadeia', () => {
    const [deploy] = comDono([nota('n', { vinculo: { tipo: 'item', id: 'deploy-1' } })])
    expect(deploy.dono.tipo).toBe('item')
    expect(deploy.dono.caminho).toEqual([
      { tipo: 'categoria', texto: 'Hostinger' },
      { tipo: 'grupo', texto: 'Hostinger', data: HOJE },
      { tipo: 'item', texto: 'Fazer Deploy', data: '2026-11-02' },
    ])
    expect(textoDoVinculo(deploy.dono)).toBe('Hostinger › Fazer Deploy')
  })

  it('tarefa solta: "Categoria › Tarefa", com o dia atual da tarefa', () => {
    const [ligar] = comDono([nota('n', { vinculo: { tipo: 'tarefa', id: 'ligar' } })])
    expect(ligar.dono.caminho.map((trecho) => trecho.texto)).toEqual(['Casa', 'Ligar para Fulano'])
    expect(ligar.dono.caminho[1].data).toBe(HOJE)
  })

  it('sem categoria o caminho começa no grupo; avulsa e alvo apagado = "Nota avulsa"', () => {
    const [mercado, avulsa, sumiu] = comDono([
      nota('a', { vinculo: { tipo: 'grupo', id: 'mercado' } }),
      nota('b'),
      nota('c', { vinculo: { tipo: 'tarefa', id: 'nao-existe' } }),
    ])
    expect(mercado.dono.caminho).toEqual([{ tipo: 'grupo', texto: 'Mercado', data: '2026-10-30' }])
    expect(mercado.dono.categoria).toBeUndefined()
    expect(textoDoVinculo(avulsa.dono)).toBe('Nota avulsa')
    expect(sumiu.dono.tipo).toBe('avulsa')
  })

  it('o link do grupo abre hoje se houver card; senão o mais recente; senão o próximo', () => {
    expect(diaMaisPerto(['2026-11-01', HOJE, '2026-11-05'], HOJE)).toBe(HOJE)
    expect(diaMaisPerto(['2026-10-20', '2026-11-01', '2026-11-05'], HOJE)).toBe('2026-11-01')
    expect(diaMaisPerto(['2026-11-09', '2026-11-05'], HOJE)).toBe('2026-11-05')
    expect(diaMaisPerto([], HOJE)).toBeUndefined()
  })
})

describe('aba Notas', () => {
  const notas = () =>
    comDono([
      nota('deploy', { vinculo: { tipo: 'item', id: 'deploy-1' }, atualizadoEm: '5' }),
      nota('host', { vinculo: { tipo: 'grupo', id: 'hostinger' }, atualizadoEm: '2' }),
      nota('ligar', { vinculo: { tipo: 'tarefa', id: 'ligar' }, atualizadoEm: '4' }),
      nota('mercado', { vinculo: { tipo: 'grupo', id: 'mercado' }, atualizadoEm: '1' }),
      nota('solta', { titulo: 'Ideias', atualizadoEm: '3' }),
    ])
  const categorias = [
    { id: 'cat-hostinger', nome: 'Hostinger', cor: '#000000' },
    { id: 'casa', nome: 'Casa', cor: '#000000' },
  ]
  const resumo = (blocos: ReturnType<typeof agruparNotas>) =>
    blocos.map((bloco) => `${bloco.titulo}: ${bloco.notas.map((n) => n.nota.id).join(' ')}`)

  it('"Por categoria": categorias na ordem do usuário, "Sem categoria" e avulsas no fim', () => {
    expect(resumo(agruparNotas(notas(), 'categoria', categorias, HOJE))).toEqual([
      'Hostinger: deploy host',
      'Casa: ligar',
      'Sem categoria: mercado',
      'Notas avulsas: solta',
    ])
  })

  it('"Por grupo": notas do grupo e dos itens juntas, depois tarefas soltas e avulsas', () => {
    expect(resumo(agruparNotas(notas(), 'grupo', categorias, HOJE))).toEqual([
      'Hostinger: host deploy',
      'Mercado: mercado',
      'Tarefas soltas: ligar',
      'Notas avulsas: solta',
    ])
  })

  it('"Recentes": um bloco por dia local da edição, mais recentes primeiro', () => {
    const em = (local: string) => new Date(`${local}-03:00`).toISOString()
    const lista = comDono(
      [
        nota('ontem-tarde', { atualizadoEm: em('2026-11-01T23:59:00') }),
        nota('hoje-cedo', { atualizadoEm: em('2026-11-02T00:01:00') }),
        nota('sexta', { atualizadoEm: em('2026-10-30T10:00:00') }),
        nota('hoje-tarde', { atualizadoEm: em('2026-11-02T15:00:00') }),
        nota('ano-passado', { atualizadoEm: em('2025-10-30T10:00:00') }),
      ],
      dadosDoExemplo(),
    )
    expect(resumo(agruparNotas(lista, 'recentes', categorias, HOJE))).toEqual([
      'Hoje: hoje-tarde hoje-cedo',
      'Ontem: ontem-tarde',
      'sexta, 30/10: sexta',
      '30/10/2025: ano-passado',
    ])
  })

  it('filtra por tipo de vínculo e por categoria', () => {
    const ids = (lista: NotaComDono[]) => lista.map((n) => n.nota.id)
    expect(ids(filtrarNotas(notas(), { tipo: 'item' }))).toEqual(['deploy'])
    expect(ids(filtrarNotas(notas(), { tipo: 'avulsa' }))).toEqual(['solta'])
    expect(ids(filtrarNotas(notas(), { tipo: 'todas', categoryId: 'cat-hostinger' }))).toEqual([
      'deploy',
      'host',
    ])
  })

  it('busca também nos nomes do vínculo (categoria, grupo, tarefa e item)', () => {
    const ids = (termo: string) => buscarNotasComDono(notas(), termo).map((n) => n.nota.id)
    expect(ids('hostinger')).toEqual(['deploy', 'host'])
    expect(ids('deploy')).toEqual(['deploy'])
    expect(ids('fulano')).toEqual(['ligar'])
    expect(ids('ideias')).toEqual(['solta'])
  })

  it('trocar a categoria do grupo muda o bloco da nota', () => {
    const dados = dadosDoExemplo()
    dados.series[1] = { ...dados.series[1], categoryId: 'casa' }
    const blocos = agruparNotas(
      comDono([nota('m', { vinculo: { tipo: 'grupo', id: 'mercado' } })], dados),
      'categoria',
      categorias,
      HOJE,
    )
    expect(resumo(blocos)).toEqual(['Casa: m'])
  })
})

describe('vincular a…', () => {
  it('lista tarefas, grupos e um item por cadeia (o atual), filtrando pelo termo', () => {
    const alvos = alvosParaVincular(dadosDoExemplo(), '', HOJE)
    expect(alvos.map((alvo) => `${alvo.vinculo.tipo}:${alvo.vinculo.id}`).sort()).toEqual([
      'grupo:hostinger',
      'grupo:mercado',
      'item:deploy-1',
      'tarefa:ligar',
    ])
    const deploy = alvosParaVincular(dadosDoExemplo(), 'deploy', HOJE)
    expect(deploy).toEqual([
      {
        vinculo: { tipo: 'item', id: 'deploy-1' },
        titulo: 'Fazer Deploy',
        contexto: 'Hostinger',
        data: '2026-11-02',
      },
    ])
  })
})

describe('migração e avisos', () => {
  it('a anotação de tarefa vira nota ligada; o resto fica avulsa, sem perder nada', () => {
    const tarefas = new Set(['t1'])
    const anotacao = { ...nota('a', { conteudo: 'texto' }), dono: { tipo: 'task', id: 't1' } }
    const orfa = { ...nota('b', { titulo: 'X' }), dono: { tipo: 'task', id: 'sumiu' } }
    expect(converterNotaAntiga(anotacao, tarefas)).toEqual({
      ...nota('a', { conteudo: 'texto' }),
      vinculo: { tipo: 'tarefa', id: 't1' },
    })
    expect(converterNotaAntiga(orfa, tarefas)).toEqual(nota('b', { titulo: 'X' }))
    expect(converterNotaAntiga(nota('c'), tarefas)).toEqual(nota('c'))
  })

  it('preenche a cadeia pelo ancestral mais antigo que ainda existe', () => {
    const semCadeia = [
      { id: 'a' },
      { id: 'b', origemItemId: 'a' },
      { id: 'c', origemItemId: 'b' },
      { id: 'd', origemItemId: 'apagado' },
      { id: 'e', origemItemId: 'a', cadeiaId: 'outra' },
    ]
    expect(preencherCadeias(semCadeia).map((item) => item.cadeiaId)).toEqual([
      'a',
      'a',
      'a',
      'd',
      'outra',
    ])
  })

  it('avisa quantas notas ficarão avulsas', () => {
    expect(avisoNotasAvulsas(0, 'tarefa')).toBe('')
    expect(avisoNotasAvulsas(2, 'tarefa')).toBe(
      'Esta tarefa tem 2 notas. Elas ficarão como notas avulsas.',
    )
    expect(avisoNotasAvulsas(1, 'item')).toBe('Este item tem 1 nota. Ela ficará como nota avulsa.')
  })
})
