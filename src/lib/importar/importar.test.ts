import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  lerTabelaCsv,
  lerDataDoCsv,
  montarRascunhoDoCsv,
  sugerirMapeamento,
} from '@/lib/importar/csv'
import { lerArquivosDoKeep, lerNotaDoKeep } from '@/lib/importar/keep'
import { lerMarkdown } from '@/lib/importar/markdown'
import { acharDuplicados, planejarImportacao, type Existentes } from '@/lib/importar/planejar'
import { lerZip } from '@/lib/importar/zip'

describe('Markdown: tarefas', () => {
  it('linhas viram tarefas, [x] conclui, recuo vira subtarefa e "# Nome" + lista vira grupo', () => {
    const rascunho = lerMarkdown(
      [
        '- [ ] Ligar para o dentista',
        '- [x] Pagar a luz',
        '  - [ ] Conferir o valor',
        '\t- [x] Guardar o comprovante',
        'Comprar pão',
        '',
        '# Mercado',
        '- [ ] Leite',
        '- [x] Café',
        '',
        '- [ ] Depois do grupo',
      ].join('\n'),
      'tarefas',
    )
    expect(rascunho.tarefas.map((tarefa) => [tarefa.titulo, tarefa.isConcluida])).toEqual([
      ['Ligar para o dentista', false],
      ['Pagar a luz', true],
      ['Comprar pão', false],
      ['Depois do grupo', false],
    ])
    expect(rascunho.tarefas[1].subtarefas).toEqual([
      { titulo: 'Conferir o valor', isConcluida: false },
      { titulo: 'Guardar o comprovante', isConcluida: true },
    ])
    expect(rascunho.grupos).toEqual([
      expect.objectContaining({
        titulo: 'Mercado',
        itens: [
          { titulo: 'Leite', isConcluido: false },
          { titulo: 'Café', isConcluido: true },
        ],
      }),
    ])
    expect(rascunho.avisos).toEqual([])
  })

  it('linhas que não dá para entender viram aviso sem travar o resto', () => {
    const rascunho = lerMarkdown(
      ['| a | b |', '```', 'codigo', '```', '![foto](x.png)', '- [ ]', '# Sozinho', '- Uma'].join(
        '\n',
      ),
      'tarefas',
    )
    expect(rascunho.avisos).toEqual([
      'Linha 1: tabela ignorada (“| a | b |”).',
      'Linha 2: bloco de código ignorado.',
      'Linha 5: imagem ignorada (“![foto](x.png)”).',
      'Linha 6: item sem texto.',
    ])
    expect(rascunho.grupos.map((grupo) => grupo.titulo)).toEqual(['Sozinho'])
  })

  it('título sem lista embaixo vira aviso', () => {
    const rascunho = lerMarkdown('# Vazio\n\n# Outro\n- Item', 'tarefas')
    expect(rascunho.avisos).toEqual(['Linha 1: “Vazio” não tem lista embaixo.'])
    expect(rascunho.grupos).toHaveLength(1)
  })
})

describe('Markdown: procedimento e nota', () => {
  it('# Título, itens numerados e ## Etapa viram etapas com a descrição de baixo', () => {
    const rascunho = lerMarkdown(
      [
        '# Deploy do simulador',
        'Introdução solta',
        '1. Conferir variáveis',
        '   No painel da Cloudflare',
        '2. Rodar a migração',
        '## Avisar o time',
        'Mandar no canal de lançamentos',
        '# Segundo',
        '- Única etapa',
      ].join('\n'),
      'procedimento',
    )
    expect(rascunho.procedimentos.map(({ titulo, etapas }) => ({ titulo, etapas }))).toEqual([
      {
        titulo: 'Deploy do simulador',
        etapas: [
          'Conferir variáveis\nNo painel da Cloudflare',
          'Rodar a migração',
          'Avisar o time\nMandar no canal de lançamentos',
        ],
      },
      { titulo: 'Segundo', etapas: ['Única etapa'] },
    ])
    expect(rascunho.avisos).toEqual([
      'Linha 2: texto antes da primeira etapa de “Deploy do simulador” ficou de fora.',
    ])
  })

  it('nota: título = "# Título" ou a 1ª linha; o resto é o conteúdo', () => {
    expect(lerMarkdown('# Ideias\n\nUma\nDuas', 'nota').notas[0]).toMatchObject({
      titulo: 'Ideias',
      conteudo: 'Uma\nDuas',
    })
    expect(lerMarkdown('\nReunião\ncom o time', 'nota').notas[0]).toMatchObject({
      titulo: 'Reunião',
      conteudo: 'com o time',
    })
  })
})

describe('CSV', () => {
  const texto = [
    'Tarefa;Dia;Rótulo;Feito;Lista',
    'Pagar a luz;03/11/2026;Casa;sim;',
    '"Comprar ""pão""";2026-11-04;;;Mercado',
    'Café;2026-11-04;;x;Mercado',
    ';2026-11-04;;;',
    'Data ruim;31/02/2026;;;',
  ].join('\n')

  it('lê aspas e ponto e vírgula e sugere o mapeamento pelo cabeçalho', () => {
    const tabela = lerTabelaCsv(texto)
    expect(tabela.linhas[1][0]).toBe('Comprar "pão"')
    expect(sugerirMapeamento(tabela.cabecalho)).toEqual({
      titulo: 0,
      data: 1,
      categoria: 2,
      concluida: 3,
      grupo: 4,
    })
  })

  it('com o mapeamento: tarefas, grupo por nome e dia, e avisos por linha', () => {
    const tabela = lerTabelaCsv(texto)
    const rascunho = montarRascunhoDoCsv(tabela, sugerirMapeamento(tabela.cabecalho))
    expect(
      rascunho.tarefas.map(({ titulo, data, isConcluida, categoria }) => ({
        titulo,
        data,
        isConcluida,
        categoria,
      })),
    ).toEqual([
      { titulo: 'Pagar a luz', data: '2026-11-03', isConcluida: true, categoria: 'Casa' },
      { titulo: 'Data ruim', data: undefined, isConcluida: false, categoria: undefined },
    ])
    expect(rascunho.grupos).toEqual([
      expect.objectContaining({
        titulo: 'Mercado',
        data: '2026-11-04',
        itens: [
          { titulo: 'Comprar "pão"', isConcluido: false },
          { titulo: 'Café', isConcluido: true },
        ],
      }),
    ])
    expect(rascunho.avisos).toEqual([
      'Linha 5: sem título.',
      'Linha 6: data “31/02/2026” não reconhecida; vai para o dia escolhido.',
    ])
  })

  it('mapeamento trocado na prévia muda o resultado', () => {
    const tabela = lerTabelaCsv('a,b\nx,y')
    const rascunho = montarRascunhoDoCsv(tabela, {
      titulo: 1,
      data: null,
      categoria: 0,
      concluida: null,
      grupo: null,
    })
    expect(rascunho.tarefas[0]).toMatchObject({ titulo: 'y', categoria: 'x' })
    expect(lerDataDoCsv('3/1/26')).toBe('2026-01-03')
  })
})

describe('Google Keep', () => {
  const EDITADA = 1_793_660_400_000_000 // 2026-11-02T23:00:00Z em microssegundos

  it('nota de texto vira nota com a data de edição; rótulo de nota fica nos ignorados', () => {
    const foto = new Blob([new Uint8Array([1, 2])], { type: 'image/png' })
    const rascunho = lerNotaDoKeep(
      {
        title: 'Viagem',
        textContent: 'Levar casaco',
        labels: [{ name: 'Pessoal' }],
        userEditedTimestampUsec: EDITADA,
        attachments: [
          { filePath: 'foto.png', mimetype: 'image/png' },
          { filePath: 'gravacao.3gp', mimetype: 'audio/3gpp' },
        ],
        annotations: [{ url: 'https://exemplo.com/a', title: 'Roteiro' }],
      },
      'Viagem.json',
      new Map([
        ['foto.png', foto],
        ['gravacao.3gp', new Blob([])],
      ]),
    )
    expect(rascunho.notas[0]).toMatchObject({
      titulo: 'Viagem',
      conteudo: 'Levar casaco',
      editadaEm: '2026-11-02T23:00:00.000Z',
    })
    expect(rascunho.notas[0].anexos.map(({ nome, tipo }) => [nome, tipo])).toEqual([
      ['foto.png', 'foto'],
      ['Roteiro', 'link'],
    ])
    expect(rascunho.ignorados).toEqual([
      'gravacao.3gp: formato audio/3gpp não suportado.',
      'Rótulo “Pessoal” de “Viagem”: nota não tem categoria.',
    ])
  })

  it('lista vira grupo (marcados concluídos) com o rótulo como categoria; lixeira fica de fora', () => {
    const lista = lerNotaDoKeep(
      {
        title: 'Mercado',
        listContent: [
          { text: 'Leite', isChecked: false },
          { text: 'Pão', isChecked: true },
        ],
        labels: [{ name: 'Casa' }],
      },
      'Mercado.json',
    )
    expect(lista.grupos[0]).toMatchObject({
      titulo: 'Mercado',
      categoria: 'Casa',
      itens: [
        { titulo: 'Leite', isConcluido: false },
        { titulo: 'Pão', isConcluido: true },
      ],
    })
    expect(
      lerNotaDoKeep({ title: 'Velha', textContent: 'x', isTrashed: true }, 'v.json').ignorados,
    ).toEqual(['Velha: estava na lixeira do Keep.'])
    expect(lerNotaDoKeep({ foo: 1, listContent: 'x' }, 'ruim.json').avisos).toEqual([
      'ruim.json: não parece uma nota do Google Keep.',
    ])
  })

  it('lê o .zip do Takeout (deflate e sem compressão) com os anexos', async () => {
    const zip = montarZip([
      [
        'Takeout/Keep/Ideia.json',
        JSON.stringify({
          title: 'Ideia',
          textContent: 'Texto',
          attachments: [{ filePath: 'img.png', mimetype: 'image/png' }],
        }),
        true,
      ],
      ['Takeout/Keep/img.png', '\x89PNG', false],
      ['Takeout/Keep/Labels.txt', 'Casa', true],
    ])
    const arquivos = lerZip(zip)
    expect(arquivos.map((arquivo) => arquivo.nome)).toEqual([
      'Takeout/Keep/Ideia.json',
      'Takeout/Keep/img.png',
      'Takeout/Keep/Labels.txt',
    ])
    const rascunho = await lerArquivosDoKeep(arquivos)
    expect(rascunho.notas[0]).toMatchObject({ titulo: 'Ideia', conteudo: 'Texto' })
    expect(rascunho.notas[0].anexos[0]).toMatchObject({ nome: 'img.png', tipo: 'foto' })
  })
})

describe('duplicados e plano', () => {
  const existentes: Existentes = {
    tarefas: [{ id: 't1', titulo: 'Pagar a luz', data: '2026-11-02' }],
    grupos: [{ cardId: 'c1', titulo: 'Mercado', data: '2026-11-02' }],
    procedimentos: [{ id: 'p1', titulo: 'Deploy' }],
    notas: [{ id: 'n1', titulo: 'Ideias' }],
  }

  it('acha por título + dia (tarefas e grupos) e por título (procedimentos e notas)', () => {
    const rascunho = lerMarkdown('- pagar a LUZ\n- Outra\n\n# mercado\n- Leite', 'tarefas')
    rascunho.procedimentos.push({ chave: 'p', titulo: 'deploy', etapas: [] })
    rascunho.notas.push({ chave: 'n', titulo: 'Idéias', conteudo: '', anexos: [] })
    const duplicados = acharDuplicados(rascunho, existentes, '2026-11-02')
    expect([...duplicados.values()]).toEqual(['t1', 'c1', 'p1', 'n1'])
    // Noutro dia, tarefa e grupo não são duplicados.
    expect(acharDuplicados(rascunho, existentes, '2026-11-03').size).toBe(2)
  })

  it('pular tira, importar mantém, substituir aponta o existente; desmarcadas saem', () => {
    const rascunho = lerMarkdown('- Pagar a luz\n- Outra\n- Desmarcada', 'tarefas')
    const duplicados = acharDuplicados(rascunho, existentes, '2026-11-02')
    const plano = (acao: 'pular' | 'importar' | 'substituir') =>
      planejarImportacao(rascunho, {
        desmarcadas: new Set([rascunho.tarefas[2].chave]),
        duplicados,
        acao,
        dataPadrao: '2026-11-02',
      }).tarefas.map(({ entrada, substitui }) => [entrada.titulo, entrada.data, substitui])
    expect(plano('pular')).toEqual([['Outra', '2026-11-02', undefined]])
    expect(plano('importar')).toEqual([
      ['Pagar a luz', '2026-11-02', undefined],
      ['Outra', '2026-11-02', undefined],
    ])
    expect(plano('substituir')[0]).toEqual(['Pagar a luz', '2026-11-02', 't1'])
  })
})

/** .zip mínimo para o teste: [nome, conteúdo, comprimir?]. */
function montarZip(arquivos: [string, string, boolean][]) {
  const locais: Buffer[] = []
  const centrais: Buffer[] = []
  let deslocamento = 0
  for (const [nome, conteudo, isComprimido] of arquivos) {
    const nomeBytes = Buffer.from(nome, 'utf8')
    const original = Buffer.from(conteudo, 'latin1')
    const dados = isComprimido ? deflateRawSync(original) : original
    const metodo = isComprimido ? 8 : 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(metodo, 8)
    local.writeUInt32LE(dados.length, 18)
    local.writeUInt32LE(original.length, 22)
    local.writeUInt16LE(nomeBytes.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(metodo, 10)
    central.writeUInt32LE(dados.length, 20)
    central.writeUInt32LE(original.length, 24)
    central.writeUInt16LE(nomeBytes.length, 28)
    central.writeUInt32LE(deslocamento, 42)
    locais.push(local, nomeBytes, dados)
    centrais.push(central, nomeBytes)
    deslocamento += local.length + nomeBytes.length + dados.length
  }
  const diretorio = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(diretorio.length, 12)
  fim.writeUInt32LE(deslocamento, 16)
  const tudo = Buffer.concat([...locais, diretorio, fim])
  return tudo.buffer.slice(tudo.byteOffset, tudo.byteOffset + tudo.length)
}
