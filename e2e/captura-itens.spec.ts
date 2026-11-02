import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Captura do Início com a lista de itens: nome do grupo em destaque e uma linha com caixinha por
 * item, no modo Grupo e em "Em grupo…", tudo pelo teclado. Capturas em
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

function escolherModo(page: Page, modo: 'Tarefa' | 'Grupo' | 'Em grupo…') {
  return captura(page)
    .getByRole('group', { name: 'Tipo' })
    .getByRole('button', { name: modo, exact: true })
    .click()
}

async function escolherGrupo(page: Page, nome: string) {
  await escolherModo(page, 'Em grupo…')
  await page.getByRole('list', { name: 'Grupos' }).getByRole('button', { name: nome }).click()
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
  const hoje = page.getByRole('region', { name: 'Hoje' })
  for (const item of ['Lavar roupa', 'Fazer comida', 'Regar plantas']) {
    await expect(hoje.getByText(item)).toBeVisible()
  }
  expect(await cardsNoBanco(page)).toEqual([
    { grupo: 'Casa', data: HOJE, itens: ['Lavar roupa', 'Fazer comida', 'Regar plantas'] },
  ])
  // A captura volta limpa para a próxima tarefa.
  await expect(captura(page).getByRole('textbox', { name: 'Título da tarefa' })).toBeFocused()

  // No Dia, sem recarregar a página.
  await page.getByRole('button', { name: 'Ver no dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
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

test('"Em grupo…" → Casa → dois itens entram no card que já existe, sem criar outro', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasa(page)
  await expect(page.getByText('Varrer a sala')).toBeVisible()

  await escolherGrupo(page, 'Casa')
  await expect(nomeDoGrupo(page)).toHaveCount(0)
  await expect(itens(page).first()).toBeFocused()
  await page.keyboard.type('Lavar roupa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Fazer comida')
  await page.keyboard.press('Control+Enter')

  await expect(page.getByText('2 itens adicionados a Casa · 02/11')).toBeVisible()
  expect(await cardsNoBanco(page)).toEqual([
    { grupo: 'Casa', data: HOJE, itens: ['Varrer a sala', 'Lavar roupa', 'Fazer comida'] },
  ])
  await expect(page.getByRole('region', { name: 'Hoje' }).getByText('Fazer comida')).toBeVisible()
})

test('trocar entre Tarefa, Grupo e "Em grupo…" não perde o texto nem os itens', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasa(page)
  const tarefa = captura(page).getByRole('textbox', { name: 'Título da tarefa' })
  await tarefa.fill('Arrumar a casa')

  await escolherModo(page, 'Grupo')
  await expect(nomeDoGrupo(page)).toHaveValue('Arrumar a casa')
  await nomeDoGrupo(page).fill('Faxina')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Varrer')

  await escolherModo(page, 'Tarefa')
  await expect(tarefa).toHaveValue('Faxina')

  await escolherGrupo(page, 'Casa')
  await expect(itens(page).first()).toHaveValue('Varrer')
  await escolherModo(page, 'Grupo')
  await expect(nomeDoGrupo(page)).toHaveValue('Faxina')
  await expect(itens(page).first()).toHaveValue('Varrer')
})

const DICAS = {
  tarefa: 'Escreva a tarefa a ser feita',
  grupo: 'Crie o grupo e coloque a(s) tarefa(s) a ser(em) feita(s)',
  emGrupo: 'Escolha o grupo e coloque a tarefa',
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

  // Em grupo…: só na 1ª linha de item.
  await escolherGrupo(page, 'Casa')
  await expect(itens(page).first()).toHaveAttribute('placeholder', DICAS.emGrupo)
  await expect(itens(page).nth(1)).not.toHaveAttribute('placeholder')
  // Os itens vieram do Grupo: a 1ª linha tem texto, então o seu texto apagado não aparece.
  expect(await isDicaVisivel(itens(page).first())).toBe(false)
  await itens(page).first().fill('')
  expect(await isDicaVisivel(itens(page).first())).toBe(true)

  // Um texto só por vez, e nenhum dos antigos.
  const dicas = await captura(page)
    .locator('[placeholder]')
    .evaluateAll((campos) => campos.map((campo) => campo.getAttribute('placeholder')))
  expect(dicas).toEqual([DICAS.emGrupo])
  await escolherModo(page, 'Tarefa')
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
    await expect(page.getByText('Varrer a sala')).toBeVisible()
    const fase = process.env.FASE ?? 'depois'
    const fotografar = (modo: string) =>
      captura(page).screenshot({ path: `e2e/capturas/captura-itens-${fase}-${modo}-${tema}.png` })

    await fotografar('tarefa')
    await escolherModo(page, 'Grupo')
    await fotografar('grupo')
    await page.setViewportSize({ width: 820, height: 1100 })
    await fotografar('grupo-estreita')
    await page.setViewportSize({ width: 1366, height: 900 })
    await escolherGrupo(page, 'Casa')
    await fotografar('em-grupo')
    if (fase === 'antes') return

    // Preenchidos: o grupo com três itens (o último focado) e dois itens em "Em grupo…".
    await page.keyboard.type('Lavar roupa')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Fazer comida')
    await fotografar('em-grupo-preenchido')
    await escolherModo(page, 'Grupo')
    await page.keyboard.type('Casa nova')
    await itens(page).last().press('Enter')
    await page.keyboard.type('Regar plantas')
    await fotografar('grupo-preenchido')
  })
}
