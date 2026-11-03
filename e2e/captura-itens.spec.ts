import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Captura do Início com a lista de itens: nome do grupo em destaque e uma linha com caixinha por
 * item, no modo Grupo e na Tarefa com um grupo escolhido no seletor, tudo pelo teclado. Capturas em
 * e2e/capturas/captura-itens-<fase>-<modo>-<tema>.png (FASE=antes|depois).
 */

const HOJE = '2026-11-02'

interface ModuloBanco {
  db: {
    groupCards: { toArray: () => Promise<{ id: string; seriesId: string; data: string }[]> }
    groupItems: { toArray: () => Promise<{ cardId: string; titulo: string; ordem: number }[]> }
    groupSeries: { toArray: () => Promise<{ id: string; titulo: string }[]> }
  }
}

function captura(page: Page) {
  return page.getByRole('region', { name: 'Captura rápida' })
}

function nomeDoGrupo(page: Page) {
  return captura(page).getByRole('textbox', { name: 'Nome do grupo' })
}

function itens(page: Page) {
  return captura(page).getByRole('textbox', { name: 'Item do grupo', exact: true })
}

function escolherModo(page: Page, modo: 'Tarefa' | 'Grupo') {
  return captura(page)
    .getByRole('group', { name: 'Tipo' })
    .getByRole('button', { name: modo, exact: true })
    .click()
}

function seletorDeGrupo(page: Page) {
  return captura(page).getByRole('button', { name: /^Grupo:/ })
}

/** Escolhe no seletor de grupo (ao lado da categoria) um grupo ou "Sem grupo". */
async function escolherGrupo(page: Page, nome: string) {
  await seletorDeGrupo(page).click()
  await page
    .getByRole('list', { name: 'Grupos' })
    .getByRole('button', { name: new RegExp(`^${nome}`) })
    .click()
}

/** Títulos dos itens de cada card, por nome do grupo. */
async function cardsNoBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [cards, todos, series] = await Promise.all([
      db.groupCards.toArray(),
      db.groupItems.toArray(),
      db.groupSeries.toArray(),
    ])
    return cards.map((card) => ({
      grupo: series.find((serie) => serie.id === card.seriesId)?.titulo,
      data: card.data,
      itens: todos
        .filter((item) => item.cardId === card.id)
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => item.titulo),
    }))
  })
}

async function semearCasa(page: Page) {
  await page.evaluate(async (data) => {
    const caminho = '/src/db/repositories/group-repository.ts'
    const grupos = await import(/* @vite-ignore */ caminho)
    const card = await grupos.criarGrupo({ titulo: 'Casa', data })
    await grupos.criarItem(card.id, 'Varrer a sala')
  }, HOJE)
}

/** Categoria nova e um grupo (card de hoje) com ela. */
async function semearComCategoria(page: Page, categoria: string, grupo: string) {
  await page.evaluate(
    async ({ data, categoria, grupo }) => {
      const caminhoCategorias = '/src/db/repositories/category-repository.ts'
      const categorias = await import(/* @vite-ignore */ caminhoCategorias)
      const caminhoGrupos = '/src/db/repositories/group-repository.ts'
      const grupos = await import(/* @vite-ignore */ caminhoGrupos)
      const criada = await categorias.criarCategoria({ nome: categoria, cor: '#d9822b' })
      await grupos.criarGrupo({ titulo: grupo, data, categoryId: criada.id })
    },
    { data: HOJE, categoria, grupo },
  )
}

/** Cola como o navegador faz: um evento `paste` com o texto na área de transferência. */
async function colar(page: Page, texto: string) {
  await page.evaluate((conteudo) => {
    const dados = new DataTransfer()
    dados.setData('text/plain', conteudo)
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dados, bubbles: true, cancelable: true }),
    )
  }, texto)
}

test.beforeEach(async ({ page }) => {
  // Segunda, 2/11/2026, 10h em São Paulo.
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('Grupo: nome, Enter, três itens e Ctrl+Enter criam o card no Hoje e no Dia', async ({
  page,
}) => {
  await page.goto('/inicio')
  await escolherModo(page, 'Grupo')
  await expect(nomeDoGrupo(page)).toBeFocused()

  await page.keyboard.type('Casa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Lavar roupa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Fazer comida')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Regar plantas')
  await expect(itens(page)).toHaveCount(3)
  await page.keyboard.press('Control+Enter')

  await expect(page.getByText('Grupo Casa criado com 3 itens · 02/11')).toBeVisible()
  const hoje = page.getByRole('region', { name: 'Hoje', exact: true })
  await expect(hoje.getByText('3 pendentes', { exact: true })).toBeVisible()
  expect(await cardsNoBanco(page)).toEqual([
    { grupo: 'Casa', data: HOJE, itens: ['Lavar roupa', 'Fazer comida', 'Regar plantas'] },
  ])
  // A captura volta limpa para a próxima tarefa.
  await expect(captura(page).getByRole('textbox', { name: 'Título da tarefa' })).toBeFocused()

  // No Dia, sem recarregar a página.
  await page.getByRole('button', { name: 'Ver no dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  await page.getByRole('button', { name: 'Abrir Casa' }).click()
  for (const item of ['Lavar roupa', 'Fazer comida', 'Regar plantas']) {
    await expect(page.getByText(item, { exact: true })).toBeVisible()
  }
})

test('Backspace num item vazio apaga a linha e volta para o item anterior', async ({ page }) => {
  await page.goto('/inicio')
  await escolherModo(page, 'Grupo')
  await page.keyboard.type('Casa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Lavar roupa')
  await page.keyboard.press('Enter')
  await expect(itens(page)).toHaveCount(2)

  await page.keyboard.press('Backspace')
  await expect(itens(page)).toHaveCount(1)
  await expect(itens(page).first()).toBeFocused()
  await expect(itens(page).first()).toHaveValue('Lavar roupa')

  // ↑ sobe para o nome e ↓ desce de volta.
  await page.keyboard.press('ArrowUp')
  await expect(nomeDoGrupo(page)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(itens(page).first()).toBeFocused()
})

test('colar três linhas num item gera três itens', async ({ page }) => {
  await page.goto('/inicio')
  await escolherModo(page, 'Grupo')
  await page.keyboard.type('Mercado')
  await page.keyboard.press('Enter')
  await colar(page, 'Café\nPão\n\nLeite')

  await expect(itens(page)).toHaveCount(3)
  await expect(itens(page).nth(0)).toHaveValue('Café')
  await expect(itens(page).nth(1)).toHaveValue('Pão')
  await expect(itens(page).nth(2)).toHaveValue('Leite')
  await expect(itens(page).nth(2)).toBeFocused()

  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Grupo Mercado criado com 3 itens · 02/11')).toBeVisible()
  expect((await cardsNoBanco(page))[0].itens).toEqual(['Café', 'Pão', 'Leite'])
})

test('Tarefa → grupo Casa → dois itens entram no card que já existe, sem criar outro', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasa(page)
  const hoje = page.getByRole('region', { name: 'Hoje', exact: true })
  await expect(hoje.getByText('1 pendente', { exact: true })).toBeVisible()

  // O seletor fica ao lado da categoria; não há mais o modo "Em grupo…".
  await expect(seletorDeGrupo(page)).toHaveText('Sem grupo')
  await expect(captura(page).getByRole('button', { name: 'Em grupo…' })).toHaveCount(0)
  await seletorDeGrupo(page).click()
  const lista = page.getByRole('list', { name: 'Grupos' })
  await expect(lista.getByRole('button')).toHaveText(['Sem grupo', 'Casajá existe em 02/11'])
  await lista.getByRole('button', { name: /^Casa/ }).click()

  await expect(seletorDeGrupo(page)).toHaveAccessibleName('Grupo: Casa')
  await expect(nomeDoGrupo(page)).toHaveCount(0)
  await expect(itens(page).first()).toBeFocused()
  await page.keyboard.type('Lavar roupa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Fazer comida')
  await captura(page).getByRole('button', { name: 'Criar' }).click()

  await expect(page.getByText('2 itens adicionados a Casa · 02/11')).toBeVisible()
  expect(await cardsNoBanco(page)).toEqual([
    { grupo: 'Casa', data: HOJE, itens: ['Varrer a sala', 'Lavar roupa', 'Fazer comida'] },
  ])
  await expect(hoje.getByText('3 pendentes', { exact: true })).toBeVisible()
  // O grupo continua escolhido, com o campo limpo, para o próximo item.
  await expect(seletorDeGrupo(page)).toHaveAccessibleName('Grupo: Casa')
  await expect(itens(page)).toHaveCount(1)
  await expect(itens(page).first()).toHaveValue('')
})

test('grupo sem card no dia escolhido: cria o card e coloca o item', async ({ page }) => {
  await page.goto('/inicio')
  await semearCasa(page)
  await escolherGrupo(page, 'Casa')
  await captura(page).getByRole('button', { name: 'Escolher data' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /, 5 de novembro/ })
    .click()
  await seletorDeGrupo(page).click()
  // No dia 05/11 a Casa ainda não tem card.
  await expect(page.getByRole('list', { name: 'Grupos' }).getByText(/já existe/)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await itens(page).first().fill('Trocar a lâmpada')
  await itens(page).first().press('Control+Enter')

  await expect(page.getByText('1 item adicionado a Casa · 05/11')).toBeVisible()
  const cards = (await cardsNoBanco(page)).sort((a, b) => a.data.localeCompare(b.data))
  expect(cards).toEqual([
    { grupo: 'Casa', data: HOJE, itens: ['Varrer a sala'] },
    { grupo: 'Casa', data: '2026-11-05', itens: ['Trocar a lâmpada'] },
  ])
})

test('com grupo escolhido a categoria é a do grupo; "Sem grupo" devolve o texto', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearComCategoria(page, 'Lar', 'Casa')
  const tarefa = captura(page).getByRole('textbox', { name: 'Título da tarefa' })
  const categoria = captura(page)
    .getByRole('group', { name: 'Tipo' })
    .locator('xpath=following-sibling::*[1]')
  await tarefa.fill('Lavar roupa\nFazer comida')
  await expect(categoria).toHaveText('Sem categoria')
  await expect(categoria).toBeEnabled()

  await escolherGrupo(page, 'Casa')
  await expect(itens(page)).toHaveCount(2)
  await expect(itens(page).nth(0)).toHaveValue('Lavar roupa')
  await expect(itens(page).nth(1)).toHaveValue('Fazer comida')
  await expect(categoria).toHaveText('Lar')
  await expect(categoria.getByRole('button')).toBeDisabled()
  await categoria.hover()
  await expect(page.getByRole('tooltip')).toHaveText('Usa a categoria do grupo')

  await escolherGrupo(page, 'Sem grupo')
  await expect(seletorDeGrupo(page)).toHaveText('Sem grupo')
  await expect(tarefa).toHaveValue('Lavar roupa\nFazer comida')
  await expect(tarefa).toBeFocused()
  await expect(captura(page).getByRole('button', { name: 'Sem categoria' })).toBeEnabled()
})

test('modo Grupo esconde o seletor de grupo e continua criando grupo novo com itens', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasa(page)
  await escolherGrupo(page, 'Casa')
  await page.keyboard.type('Faxina')

  await escolherModo(page, 'Grupo')
  await expect(seletorDeGrupo(page)).toHaveCount(0)
  // O item digitado vira o nome do grupo novo.
  await expect(nomeDoGrupo(page)).toHaveValue('Faxina')
  await nomeDoGrupo(page).press('Enter')
  await page.keyboard.type('Varrer')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Grupo Faxina criado com 1 item · 02/11')).toBeVisible()
  expect(await cardsNoBanco(page)).toContainEqual({
    grupo: 'Faxina',
    data: HOJE,
    itens: ['Varrer'],
  })

  // Voltando para Tarefa, o seletor aparece sem grupo.
  await escolherModo(page, 'Tarefa')
  await expect(seletorDeGrupo(page)).toHaveText('Sem grupo')
})

const DICAS = {
  tarefa: 'Escreva a tarefa a ser feita',
  grupo: 'Crie o grupo e coloque a(s) tarefa(s) a ser(em) feita(s)',
  itens: 'Escreva a tarefa do grupo',
}

/**
 * O texto apagado aparece inteiro: o campo tem altura para as linhas que o texto ocupa na
 * largura dele (mede com a fonte do `::placeholder`).
 */
function isDicaInteira(campo: Locator) {
  return campo.evaluate((elemento) => {
    const textarea = elemento as HTMLTextAreaElement
    const estilo = getComputedStyle(textarea, '::placeholder')
    const contexto = document.createElement('canvas').getContext('2d')
    if (!contexto) return false
    contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`
    contexto.letterSpacing = estilo.letterSpacing
    const largura = contexto.measureText(textarea.placeholder).width
    const linhas = Math.round(textarea.clientHeight / parseFloat(estilo.lineHeight))
    return largura <= textarea.clientWidth * linhas
  })
}

/** O texto apagado aparece só com o campo vazio (`:placeholder-shown`). */
function isDicaVisivel(campo: Locator) {
  return campo.evaluate((elemento) => elemento.matches(':placeholder-shown'))
}

test('cada modo mostra o seu texto no campo, que some ao digitar e troca com o modo', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasa(page)
  const tarefa = captura(page).getByRole('textbox', { name: 'Título da tarefa' })

  // Tarefa: o texto no campo do título.
  await expect(tarefa).toHaveAttribute('placeholder', DICAS.tarefa)
  expect(await isDicaVisivel(tarefa)).toBe(true)
  await page.keyboard.type('Pagar')
  expect(await isDicaVisivel(tarefa)).toBe(false)
  await tarefa.fill('')

  // Grupo: só na linha do nome; as linhas de item ficam sem texto.
  await escolherModo(page, 'Grupo')
  await expect(nomeDoGrupo(page)).toHaveAttribute('placeholder', DICAS.grupo)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Lavar roupa')
  await page.keyboard.press('Enter')
  await expect(itens(page)).toHaveCount(2)
  for (const item of await itens(page).all()) {
    await expect(item).not.toHaveAttribute('placeholder')
  }
  await nomeDoGrupo(page).fill('Casa nova')
  expect(await isDicaVisivel(nomeDoGrupo(page))).toBe(false)

  // Tarefa com grupo escolhido: só na 1ª linha de item.
  await escolherModo(page, 'Tarefa')
  await escolherGrupo(page, 'Casa')
  await expect(itens(page).first()).toHaveAttribute('placeholder', DICAS.itens)
  // O nome do grupo virou o 1º item: a 1ª linha tem texto, então o texto apagado não aparece.
  expect(await isDicaVisivel(itens(page).first())).toBe(false)
  await itens(page).first().fill('')
  expect(await isDicaVisivel(itens(page).first())).toBe(true)

  // Um texto só por vez, e nenhum dos antigos.
  const dicas = await captura(page)
    .locator('[placeholder]')
    .evaluateAll((campos) => campos.map((campo) => campo.getAttribute('placeholder')))
  expect(dicas).toEqual([DICAS.itens])
  await escolherGrupo(page, 'Sem grupo')
  await expect(tarefa).toHaveAttribute('placeholder', DICAS.tarefa)
  for (const antigo of ['O que precisa ser feito?', 'Nome do grupo', 'Um item por linha']) {
    await expect(captura(page).locator(`[placeholder*="${antigo}"]`)).toHaveCount(0)
    await expect(captura(page).getByText(antigo)).toHaveCount(0)
  }
})

for (const tema of ['claro', 'escuro'] as const) {
  test(`capturas dos modos da captura, tema ${tema}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await page.addInitScript((escolha) => {
      localStorage.setItem('memoria:tema', escolha)
    }, tema)
    await page.goto('/inicio')
    await semearCasa(page)
    await expect(
      page
        .getByRole('region', { name: 'Hoje', exact: true })
        .getByText('1 pendente', { exact: true }),
    ).toBeVisible()
    const fase = process.env.FASE ?? 'depois'
    const fotografar = (modo: string) =>
      captura(page).screenshot({ path: `e2e/capturas/captura-itens-${fase}-${modo}-${tema}.png` })

    await fotografar('tarefa')
    await escolherModo(page, 'Grupo')
    await fotografar('grupo')
    // O texto do nome cabe inteiro também com a tela estreita (a letra dele diminui).
    for (const [largura, altura] of [
      [1366, 900],
      [1024, 900],
      [820, 1100],
    ] as const) {
      await page.setViewportSize({ width: largura, height: altura })
      expect(await isDicaInteira(nomeDoGrupo(page)), `largura ${largura}`).toBe(true)
    }
    await fotografar('grupo-estreita')
    await page.setViewportSize({ width: 1366, height: 900 })
    await escolherModo(page, 'Tarefa')
    await escolherGrupo(page, 'Casa')
    await fotografar('tarefa-com-grupo')

    // Preenchidos: dois itens no grupo escolhido e o grupo novo com itens.
    await page.keyboard.type('Lavar roupa')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Fazer comida')
    await fotografar('tarefa-com-grupo-preenchido')
    await escolherModo(page, 'Grupo')
    await nomeDoGrupo(page).fill('Casa nova')
    await itens(page).last().press('Enter')
    await page.keyboard.type('Regar plantas')
    await fotografar('grupo-preenchido')
    // Tarefa com data escolhida: o botão mostra a data.
    await escolherModo(page, 'Tarefa')
    await escolherGrupo(page, 'Sem grupo')
    await captura(page).getByRole('button', { name: 'Escolher data' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /, 5 de novembro/ })
      .click()
    await fotografar('tarefa-data')
  })
}

test('a linha de controles cabe numa linha só a 1280px, com nomes longos e data escolhida', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearComCategoria(page, 'Administração da casa', 'Manutenção do apartamento')
  await escolherGrupo(page, 'Manutenção')
  await captura(page).getByRole('button', { name: 'Escolher data' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /, 5 de novembro/ })
    .click()

  const linhasDosControles = () =>
    captura(page).evaluate((secao) => {
      const linha = secao.querySelector('form > div:last-child')
      const topos = [...(linha?.children ?? [])].map((filho) => (filho as HTMLElement).offsetTop)
      return new Set(topos).size
    })
  for (const largura of [1680, 1366, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    expect(await linhasDosControles(), `largura ${largura}`).toBe(1)
  }
  // Sem grupo (o clipe aparece) também cabe.
  await escolherGrupo(page, 'Sem grupo')
  expect(await linhasDosControles()).toBe(1)
})
