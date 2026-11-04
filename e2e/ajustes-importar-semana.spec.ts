import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'
import { fixarTema } from './semear-ajustes.ts'

/**
 * Ajuste de 02/11/2026: ícones Cloudflare, MemorIA e genérico (Amazon/AWS); cards da Semana
 * recolhíveis e colunas com largura mínima (rolagem lateral); importar texto/arquivo; criar
 * categoria de Grupo a partir de uma de Procedimentos. Capturas em e2e/capturas/importar-*.png.
 */

const SEGUNDA = '2026-11-02'
const TERCA = '2026-11-03'
const COLUNA_SEGUNDA = 'segunda-feira, 2 de novembro'
const COLUNA_TERCA = 'terça-feira, 3 de novembro'
const COLUNA_QUARTA = 'quarta-feira, 4 de novembro'
const TEXTO_LONGO = 'Conferir as variáveis de ambiente no painel da Cloudflare antes de publicar'

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/importar-${nome}.png` })
}

interface Banco {
  db: Record<string, { toArray: () => Promise<Record<string, unknown>[]> }>
}

async function lerTabela(page: Page, tabela: string) {
  return page.evaluate(
    async ({ tabela: nome }) => {
      const { db } = (await import(/* @vite-ignore */ String('/src/db/database.ts'))) as Banco
      return db[nome].toArray()
    },
    { tabela },
  )
}

/** Card "Casa" com itens em cada dia pedido; devolve os ids dos cards. */
async function semearCasa(page: Page, dias: { data: string; itens: string[] }[]) {
  return page.evaluate(async (pedidos) => {
    const grupos = (await import(
      /* @vite-ignore */ String('/src/db/repositories/group-repository.ts')
    )) as {
      criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
      criarItem: (cardId: string, titulo: string) => Promise<unknown>
    }
    const ids: string[] = []
    for (const { data, itens } of pedidos) {
      const card = await grupos.criarGrupo({ titulo: 'Casa', data })
      for (const titulo of itens) await grupos.criarItem(card.id, titulo)
      ids.push(card.id)
    }
    return ids
  }, dias)
}

function coluna(page: Page, nome: string) {
  return page.getByRole('region', { name: nome })
}

/** Aperta em `origem` e solta no meio de `alvo`, passando pela distância mínima do arrasto. */
async function arrastar(page: Page, origem: Locator, alvo: Locator) {
  const de = (await origem.boundingBox())!
  const para = (await alvo.boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 30), {
    steps: 20,
  })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000)
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('Ícones: Cloudflare e MemorIA no seletor; amazon/aws só sugerem um genérico', async ({
  page,
}) => {
  await page.goto('/procedimentos')
  const ids = await page.evaluate(async () => {
    const categorias = await import(
      /* @vite-ignore */ String('/src/db/repositories/category-repository.ts')
    )
    const procedimentos = await import(
      /* @vite-ignore */ String('/src/db/repositories/procedure-repository.ts')
    )
    const deploy = await categorias.criarCategoria({ nome: 'Deploy', tipo: 'procedimento' })
    const publicar = await procedimentos.criarProcedimento({
      titulo: 'Publicar o app',
      categoryId: deploy.id,
      etapas: [{ id: 'e1', texto: 'Rodar o build' }],
    })
    return { publicar: publicar.id as string }
  })

  await page.goto(`/procedimentos/${ids.publicar}`)
  const botaoIcone = page.getByRole('button', { name: 'Ícone do procedimento' })
  await botaoIcone.click()
  const painel = page.getByRole('dialog')
  await painel.getByRole('tab', { name: 'Marcas' }).click()
  const sugestoes = painel.getByRole('button', { name: 'MemorIA', exact: true })
  await expect(sugestoes).toBeVisible()
  await expect(painel.getByRole('button', { name: 'Cloudflare', exact: true })).toBeVisible()
  await capturar(page, 'seletor-marcas-claro')

  await painel.getByRole('searchbox', { name: 'Buscar marca' }).fill('amazon')
  await expect(painel.getByRole('button', { name: 'Pacote (ícone genérico)' })).toBeVisible()
  await expect(painel.getByText('Nenhuma marca')).toHaveCount(0)
  await capturar(page, 'seletor-amazon')
  await painel.getByRole('searchbox', { name: 'Buscar marca' }).fill('aws')
  await expect(painel.getByRole('button', { name: 'Nuvem (ícone genérico)' })).toBeVisible()
  await expect(painel.getByRole('button', { name: 'Servidor (ícone genérico)' })).toBeVisible()

  await painel.getByRole('searchbox', { name: 'Buscar marca' }).fill('')
  await painel.getByRole('button', { name: 'MemorIA', exact: true }).click()
  await expect(botaoIcone.locator('[data-marca="memoria"]')).toBeVisible()
  await expect(page.getByText('Salvo')).toBeVisible()

  await page.goto('/procedimentos')
  await expect(
    page.getByRole('link', { name: /^Publicar o app/ }).locator('[data-marca="memoria"]'),
  ).toBeVisible()
  await capturar(page, 'procedimento-memoria')

  // Categoria de Procedimentos "Deploy" ← Cloudflare.
  await page.goto('/categorias')
  await page.getByRole('button', { name: 'Ícone da categoria Deploy' }).click()
  await page.getByRole('dialog').getByRole('tab', { name: 'Marcas' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cloudflare', exact: true }).click()
  await expect(
    page
      .getByRole('button', { name: 'Ícone da categoria Deploy' })
      .locator('[data-marca="cloudflare"]'),
  ).toBeVisible()
  await capturar(page, 'categoria-cloudflare')
})

test('Ícones no tema escuro: MemorIA usa o recorte do tema', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.goto('/procedimentos')
  await page.evaluate(async () => {
    const procedimentos = await import(
      /* @vite-ignore */ String('/src/db/repositories/procedure-repository.ts')
    )
    await procedimentos.criarProcedimento({
      titulo: 'Publicar o app',
      categoryId: '',
      icone: { tipo: 'marca', valor: 'memoria' },
      etapas: [],
    })
  })
  const icone = page
    .getByRole('link', { name: /^Publicar o app/ })
    .locator('[data-marca="memoria"]')
  await expect(icone).toBeVisible()
  // No escuro aparece o recorte escuro (o segundo) e o claro fica invisível.
  const visiveis = await icone
    .locator('img')
    .evaluateAll((imagens) => imagens.map((imagem) => getComputedStyle(imagem).visibility))
  expect(visiveis).toEqual(['hidden', 'visible'])
  await page.getByRole('link', { name: /^Publicar o app/ }).click()
  await page.getByRole('button', { name: 'Ícone do procedimento' }).click()
  await page.getByRole('dialog').getByRole('tab', { name: 'Marcas' }).click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Cloudflare', exact: true }),
  ).toBeVisible()
  await capturar(page, 'seletor-marcas-escuro')
})

test('Semana: cards abrem recolhidos; aberto ele arrasta e recebe item; recolhido, arrasta inteiro', async ({
  page,
}) => {
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCasa(page, [
    { data: SEGUNDA, itens: [TEXTO_LONGO, 'Lavar roupa'] },
    { data: TERCA, itens: ['Varrer'] },
  ])
  // Ao abrir a Semana, todos recolhidos (grupo sem estado salvo).
  await page.reload()
  const casaSegunda = coluna(page, COLUNA_SEGUNDA)
  const expandirTerca = coluna(page, COLUNA_TERCA).getByRole('button', { name: 'Expandir Casa' })
  await expect(expandirTerca).toHaveAttribute('aria-expanded', 'false')
  await expect(coluna(page, COLUNA_TERCA).getByText('Varrer')).toBeHidden()
  await capturar(page, 'semana-recolhida')

  // Os dois cards são da mesma série (Casa): abrir um abre o outro.
  await casaSegunda.getByRole('button', { name: 'Expandir Casa' }).click()
  await expect(casaSegunda.getByRole('list', { name: 'Itens de Casa' })).toBeVisible()
  await expect(
    coluna(page, COLUNA_TERCA).getByRole('button', { name: 'Recolher Casa' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await capturar(page, 'semana-aberta')

  // Item de segunda solto em cima do card de terça: vai para o card da série lá.
  const linha = casaSegunda
    .getByRole('list', { name: 'Itens de Casa' })
    .getByRole('listitem')
    .filter({ hasText: 'Lavar roupa' })
  await linha.hover()
  const alca = casaSegunda.getByRole('button', { name: /^Arrastar Lavar roupa/ })
  const cardTerca = coluna(page, COLUNA_TERCA)
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Recolher Casa' }) })
  await arrastar(page, alca, cardTerca)
  await expect(page.getByText('1 item levado para amanhã')).toBeVisible()
  await expect(
    coluna(page, COLUNA_TERCA).getByRole('list', { name: 'Itens de Casa' }).getByRole('listitem'),
  ).toHaveText(['Varrer', /^Lavar roupa/])

  // Card de segunda recolhido (a série toda) e arrastado inteiro para quarta: leva o pendente que sobrou.
  await casaSegunda.getByRole('button', { name: 'Recolher Casa' }).click()
  await expect(casaSegunda.getByRole('button', { name: 'Expandir Casa' })).toBeVisible()
  await arrastar(
    page,
    casaSegunda.getByRole('button', { name: /^Grupo Casa, / }),
    coluna(page, COLUNA_QUARTA).getByRole('list', { name: /^Pendentes de / }),
  )
  await expect(page.getByText(/^1 item levado para (?!amanhã)/)).toBeVisible()
  await expect(coluna(page, COLUNA_QUARTA).getByText(TEXTO_LONGO)).toBeVisible()
  await capturar(page, 'semana-recolhida-depois-arrasto')
})

test('Semana: texto longo não quebra palavra por palavra; tela estreita rola e mostra hoje', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00-03:00'))
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCasa(page, [{ data: SEGUNDA, itens: [TEXTO_LONGO] }])
  await expandirGrupos(page)
  const texto = coluna(page, COLUNA_SEGUNDA).getByText(TEXTO_LONGO)
  await expect(texto).toBeVisible()
  // ~260 px por coluna: várias palavras por linha (antes, 8 linhas de uma ou duas palavras).
  const linhas = await texto.evaluate((elemento) => {
    const altura = elemento.getBoundingClientRect().height
    return Math.round(altura / parseFloat(getComputedStyle(elemento).lineHeight))
  })
  const palavras = TEXTO_LONGO.split(' ').length
  expect(palavras / linhas).toBeGreaterThanOrEqual(2.5)
  await capturar(page, 'semana-larga-claro')

  await page.setViewportSize({ width: 1100, height: 900 })
  await page.reload()
  const sexta = coluna(page, 'sexta-feira, 6 de novembro')
  await expect(sexta).toBeInViewport()
  await capturar(page, 'semana-estreita-hoje-visivel')
})

test('Semana no tema escuro, aberta e recolhida', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCasa(page, [
    { data: SEGUNDA, itens: [TEXTO_LONGO, 'Lavar roupa'] },
    { data: TERCA, itens: ['Varrer'] },
  ])
  await expandirGrupos(page)
  await expect(coluna(page, COLUNA_SEGUNDA).getByText(TEXTO_LONGO)).toBeVisible()
  await capturar(page, 'semana-aberta-escuro')
  await page.getByRole('button', { name: 'Recolher tudo' }).click()
  await expect(page.getByRole('button', { name: 'Expandir Casa' })).toHaveCount(2)
  // Espera a animação de fechar (~300 ms) terminar antes da captura.
  await page.waitForTimeout(500)
  await capturar(page, 'semana-recolhida-escuro')
})

test('Importar: .md com tarefas para amanhã, um procedimento e uma nota; desfazer', async ({
  page,
}) => {
  await page.goto('/backup')
  const dialogo = page.getByRole('dialog', { name: 'Importar' })

  // 1) Tarefas de um arquivo .md, para amanhã.
  await page.getByRole('button', { name: 'Importar', exact: true }).click()
  await capturar(page, 'dialogo-1-origem')
  await dialogo.getByRole('button', { name: /^Texto ou Markdown/ }).click()
  await capturar(page, 'dialogo-2-conteudo')
  await dialogo.getByLabel('Arquivo para Texto ou Markdown').setInputFiles({
    name: 'tarefas.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '- [ ] Ligar para o dentista\n- [x] Pagar a luz\n  - [ ] Guardar o comprovante\n\n# Mercado\n- [ ] Leite\n- [x] Café\n\n| tabela | ignorada |',
    ),
  })
  await expect(dialogo.getByRole('region', { name: 'Tarefas' })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Escolher data', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Escolher o dia' })
    .getByRole('button', { name: 'Amanhã' })
    .click()
  await expect(dialogo.getByText('1 aviso')).toBeVisible()
  await capturar(page, 'dialogo-3-previa')
  await dialogo.getByRole('button', { name: 'Importar 3 itens' }).click()
  await expect(page.getByText('3 itens importados')).toBeVisible()
  const tarefas = await lerTabela(page, 'tasks')
  expect(tarefas.map((tarefa) => [tarefa.titulo, tarefa.data, tarefa.status]).sort()).toEqual([
    ['Ligar para o dentista', TERCA, 'pendente'],
    ['Pagar a luz', TERCA, 'concluida'],
  ])
  expect(await lerTabela(page, 'groupItems')).toHaveLength(2)
  await capturar(page, 'aviso-importados')

  // Desfazer tira tudo o que entrou.
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(async () => (await lerTabela(page, 'tasks')).length).toBe(0)
  expect(await lerTabela(page, 'groupItems')).toHaveLength(0)
  expect(await lerTabela(page, 'subtasks')).toHaveLength(0)

  // 2) Procedimento colado como texto.
  await page.goto('/procedimentos')
  await page.getByRole('button', { name: 'Importar', exact: true }).click()
  await dialogo.getByRole('button', { name: /^Texto ou Markdown/ }).click()
  await expect(dialogo.getByRole('button', { name: 'Procedimento' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialogo
    .getByRole('textbox', { name: 'Cole o texto' })
    .fill('# Publicar o site\n1. Rodar os testes\n2. Gerar o build\n   Conferir se não deu erro')
  await dialogo.getByRole('button', { name: 'Ver prévia' }).click()
  await dialogo.getByRole('button', { name: 'Importar 1 item' }).click()
  await expect(page.getByText('1 item importado')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Publicar o site/ })).toContainText('2 etapas')

  // 3) Nota de um arquivo .md.
  await page.goto('/notas')
  await page.getByRole('button', { name: 'Importar', exact: true }).click()
  await dialogo.getByRole('button', { name: /^Texto ou Markdown/ }).click()
  await dialogo.getByLabel('Arquivo para Texto ou Markdown').setInputFiles({
    name: 'ideias.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Ideias para a viagem\nLevar casaco.'),
  })
  await dialogo.getByRole('button', { name: 'Importar 1 item' }).click()
  await expect(page.getByText('1 item importado')).toBeVisible()
  const notas = await lerTabela(page, 'notes')
  expect(notas.map((nota) => [nota.titulo, nota.conteudo])).toEqual([
    ['Ideias para a viagem', 'Levar casaco.'],
  ])
})

test('Categoria de Grupo pelo chip "Cloudflare" de Procedimentos; depois fica "já existe"', async ({
  page,
}) => {
  await page.goto('/categorias')
  await page.evaluate(async () => {
    const categorias = await import(
      /* @vite-ignore */ String('/src/db/repositories/category-repository.ts')
    )
    const cloudflare = await categorias.criarCategoria({
      nome: 'Cloudflare',
      cor: '#f38020',
      tipo: 'procedimento',
    })
    await categorias.definirIconeDaCategoria(cloudflare.id, { tipo: 'marca', valor: 'cloudflare' })
    await categorias.criarCategoria({ nome: 'Automação', tipo: 'procedimento' })
  })
  await page.getByRole('button', { name: 'Nova categoria em Grupos' }).click()
  const chips = page.getByRole('region', { name: 'Usar de Procedimentos' })
  await expect(chips.getByRole('button')).toHaveCount(2)
  await capturar(page, 'chips-claro')

  // Digitar filtra os chips.
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('cloud')
  await expect(chips.getByRole('button')).toHaveCount(1)
  await chips.getByRole('button', { name: 'Criar Cloudflare igual à de Procedimentos' }).click()

  const grupos = page.getByRole('region', { name: /^Grupos/ })
  await expect(grupos.getByText('Cloudflare', { exact: true })).toBeVisible()
  await expect(
    chips.getByRole('button', { name: 'Cloudflare (já existe em Grupos)' }),
  ).toBeDisabled()
  const categorias = await lerTabela(page, 'categories')
  expect(
    categorias
      .filter((categoria) => categoria.nome === 'Cloudflare')
      .map((categoria) => [
        categoria.tipo,
        categoria.cor,
        (categoria.icone as { valor: string }).valor,
      ])
      .sort(),
  ).toEqual([
    ['grupo', '#f38020', 'cloudflare'],
    ['procedimento', '#f38020', 'cloudflare'],
  ])
  await capturar(page, 'chips-ja-existe')
})

test('Chips no tema escuro e na tela estreita', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.setViewportSize({ width: 420, height: 900 })
  await page.goto('/categorias')
  await page.evaluate(async () => {
    const categorias = await import(
      /* @vite-ignore */ String('/src/db/repositories/category-repository.ts')
    )
    for (const nome of ['Deploy Poose', 'Deploy Simulador', 'Cloudflare', 'Automação']) {
      await categorias.criarCategoria({ nome, tipo: 'procedimento' })
    }
  })
  await page.getByRole('button', { name: 'Nova categoria em Grupos' }).click()
  await expect(
    page.getByRole('region', { name: 'Usar de Procedimentos' }).getByRole('button'),
  ).toHaveCount(4)
  await capturar(page, 'chips-escuro-estreito')
})

test('Diálogo de importação no tema escuro e na tela estreita', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.setViewportSize({ width: 420, height: 860 })
  await page.goto('/notas')
  await page.getByRole('button', { name: 'Importar', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Importar' })
  await capturar(page, 'dialogo-escuro-estreito-origem')
  await dialogo.getByRole('button', { name: /^Planilha CSV/ }).click()
  await dialogo.getByLabel('Arquivo para Planilha CSV').setInputFiles({
    name: 'tarefas.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Tarefa;Dia;Lista;Feito\nPagar a luz;03/11/2026;;sim\nLeite;;Mercado;\n;;;',
    ),
  })
  await expect(dialogo.getByRole('group', { name: 'Colunas da planilha' })).toBeVisible()
  await capturar(page, 'dialogo-escuro-estreito-csv')
})
