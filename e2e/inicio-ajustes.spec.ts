import { expect, test, type Page } from '@playwright/test'

/**
 * Ajustes do Início: "Em grupo…" põe itens num grupo que já existe (no card do dia ou num card
 * novo), "+ Adicionar item" no bloco Hoje, Desfazer, e o mapa enxuto com filtro em menu
 * lembrado. Capturas em e2e/capturas/inicio-ajustes-*.png (antes e depois de cada cenário).
 */

const HOJE = '2026-11-02'
const AMANHA = '2026-11-03'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string; seriesId: string }>
  criarItem: (cardId: string, titulo: string) => Promise<unknown>
}

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    tasks: { bulkAdd: (tarefas: object[]) => Promise<unknown> }
    groupCards: { toArray: () => Promise<{ id: string; data: string; arquivado: boolean }[]> }
    groupItems: { toArray: () => Promise<{ cardId: string; titulo: string; ordem: number }[]> }
  }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/inicio-ajustes-${nome}.png`, fullPage: true })
}

/** Card "Casa" (categoria Casa) em hoje, com o item "Varrer". */
async function semearCasaHoje(page: Page) {
  await page.evaluate(async (data) => {
    const caminhoGrupos = '/src/db/repositories/group-repository.ts'
    const grupos = (await import(/* @vite-ignore */ caminhoGrupos)) as ModuloGrupos
    const caminhoCategorias = '/src/db/repositories/category-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#d9822b' })
    const card = await grupos.criarGrupo({ titulo: 'Casa', data, categoryId: casa.id })
    await grupos.criarItem(card.id, 'Varrer')
    await grupos.criarGrupo({ titulo: 'Mercado', data })
  }, HOJE)
}

/** Cards visíveis com os itens em ordem, ordenados pelo texto: `['2026-11-02: Varrer, fazer lasanha']`. */
async function lerCards(page: Page) {
  return page.evaluate(async () => {
    const caminhoBanco = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminhoBanco)) as ModuloBanco
    const [cards, itens] = await Promise.all([db.groupCards.toArray(), db.groupItems.toArray()])
    return cards
      .filter((card) => !card.arquivado)
      .map((card) => {
        const titulos = itens
          .filter((item) => item.cardId === card.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => item.titulo)
        return `${card.data}: ${titulos.join(', ')}`
      })
      .sort()
  })
}

function campoDeCaptura(page: Page) {
  return page.getByRole('textbox', { name: 'O que precisa ser feito?' })
}

function grupoNoHoje(page: Page, titulo: string) {
  return page
    .getByRole('region', { name: 'Hoje', exact: true })
    .getByRole('listitem', { name: `Grupo ${titulo}` })
}

function aviso(page: Page) {
  return page.getByRole('region', { name: /Notifications/ })
}

/** Escolhe "Em grupo…" e, na lista que abre, o grupo pela busca. */
async function escolherEmGrupo(page: Page, grupo: string) {
  await page.getByRole('button', { name: 'Em grupo…' }).click()
  await page.getByRole('textbox', { name: 'Buscar grupo' }).fill(grupo.slice(0, 3).toLowerCase())
  await page
    .getByRole('list', { name: 'Grupos' })
    .getByRole('button', { name: new RegExp(`^${grupo}`) })
    .click()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('Em grupo… → Casa → Hoje: o item entra no card de hoje, sem segundo card', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasaHoje(page)
  await expect(grupoNoHoje(page, 'Casa')).toBeVisible()
  await capturar(page, '1-antes')

  await page.getByRole('button', { name: 'Em grupo…' }).click()
  const lista = page.getByRole('list', { name: 'Grupos' })
  await expect(lista.getByRole('button', { name: 'Casa já existe em 02/11' })).toBeVisible()
  await capturar(page, '1-seletor')
  await lista.getByRole('button', { name: /^Casa/ }).click()
  await expect(campoDeCaptura(page)).toBeFocused()
  await expect(page.getByText('usa a categoria do grupo')).toBeVisible()
  await campoDeCaptura(page).fill('fazer lasanha')
  await campoDeCaptura(page).press('Enter')

  await expect(aviso(page).getByText('1 item adicionado a Casa · 02/11')).toBeVisible()
  await expect(
    grupoNoHoje(page, 'Casa').getByRole('checkbox', { name: 'fazer lasanha' }),
  ).toBeVisible()
  expect(await lerCards(page)).toEqual(['2026-11-02: ', '2026-11-02: Varrer, fazer lasanha'])
  await capturar(page, '1-depois')

  await aviso(page).getByRole('button', { name: 'Ver no dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  await expect(page.getByRole('region', { name: 'Grupo Casa' })).toHaveCount(1)
  await expect(
    page.getByRole('region', { name: 'Grupo Casa' }).getByText('fazer lasanha'),
  ).toBeVisible()
  await capturar(page, '1-no-dia')
})

test('Em grupo… → Casa → Amanhã, com duas linhas: cria o card de amanhã com os itens', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCasaHoje(page)
  await escolherEmGrupo(page, 'Casa')
  await page.getByRole('button', { name: 'Amanhã' }).click()
  await campoDeCaptura(page).fill('fazer lasanha\ncomprar queijo')
  await capturar(page, '2-antes')
  await page.getByRole('button', { name: 'Criar' }).click()

  await expect(aviso(page).getByText('2 itens adicionados a Casa · 03/11')).toBeVisible()
  expect(await lerCards(page)).toEqual([
    '2026-11-02: ',
    '2026-11-02: Varrer',
    '2026-11-03: fazer lasanha, comprar queijo',
  ])
  await capturar(page, '2-depois')

  await aviso(page).getByRole('button', { name: 'Ver no dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${AMANHA}$`))
  const card = page.getByRole('region', { name: 'Grupo Casa' })
  await expect(card.getByText('fazer lasanha')).toBeVisible()
  await expect(card.getByText('comprar queijo')).toBeVisible()
  await capturar(page, '2-no-dia')
})

test('"+ Adicionar item" no bloco Hoje', async ({ page }) => {
  await page.goto('/inicio')
  await semearCasaHoje(page)
  const grupo = grupoNoHoje(page, 'Casa')
  await grupo.hover()
  await capturar(page, '3-antes')

  await grupo.getByRole('button', { name: 'Adicionar item em Casa' }).click()
  await page.getByRole('textbox', { name: 'Novo item em Casa' }).fill('regar as plantas')
  await page.getByRole('textbox', { name: 'Novo item em Casa' }).press('Enter')

  await expect(grupo.getByRole('checkbox', { name: 'regar as plantas' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Novo item em Casa' })).toHaveValue('')
  expect(await lerCards(page)).toEqual(['2026-11-02: ', '2026-11-02: Varrer, regar as plantas'])
  await capturar(page, '3-depois')
})

test('Desfazer tira os itens e o card que a captura criou', async ({ page }) => {
  await page.goto('/inicio')
  await semearCasaHoje(page)

  // No card de hoje: só o item sai.
  await escolherEmGrupo(page, 'Casa')
  await campoDeCaptura(page).fill('fazer lasanha')
  await campoDeCaptura(page).press('Enter')
  await expect(grupoNoHoje(page, 'Casa').getByText('fazer lasanha')).toBeVisible()
  await capturar(page, '4-antes')
  await aviso(page).getByRole('button', { name: 'Desfazer' }).click()
  await expect(grupoNoHoje(page, 'Casa').getByText('fazer lasanha')).toHaveCount(0)
  expect(await lerCards(page)).toEqual(['2026-11-02: ', '2026-11-02: Varrer'])

  // Card criado para amanhã: some junto (Ctrl+Z faz o mesmo que o botão).
  await escolherEmGrupo(page, 'Casa')
  await page.getByRole('button', { name: 'Amanhã' }).click()
  await campoDeCaptura(page).fill('fazer lasanha')
  await campoDeCaptura(page).press('Enter')
  await expect(aviso(page).getByText('1 item adicionado a Casa · 03/11')).toBeVisible()
  expect(await lerCards(page)).toHaveLength(3)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+z')
  await expect.poll(() => lerCards(page)).toEqual(['2026-11-02: ', '2026-11-02: Varrer'])
  await capturar(page, '4-depois')
})

test('mapa: filtro pelo menu muda a grade e o total, e continua depois de recarregar', async ({
  page,
}) => {
  await page.goto('/inicio')
  await page.evaluate(async () => {
    const caminhoCategorias = '/src/db/repositories/category-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
    const caminhoBanco = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminhoBanco)) as ModuloBanco
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho' })
    const casa = await categorias.criarCategoria({ nome: 'Casa' })
    const feita = (titulo: string, data: string, categoryId: string) => ({
      id: crypto.randomUUID(),
      titulo,
      data,
      dataOriginal: data,
      ordem: 1,
      status: 'concluida',
      concluidaEm: `${data}T15:00:00.000Z`,
      categoryId,
      criadoEm: '',
      atualizadoEm: '',
    })
    await db.tasks.bulkAdd([
      feita('Relatório', '2026-10-20', trabalho.id),
      feita('Reunião', '2026-10-21', trabalho.id),
      feita('Planilha', '2026-10-21', trabalho.id),
      feita('Varrer', '2026-10-25', casa.id),
      feita('Lavar', '2026-10-28', casa.id),
    ])
  })
  const titulo = page.getByRole('heading', { name: /concluídos? no último ano/ })
  const grade = page.getByRole('group', { name: 'Conclusões por dia no último ano' })
  const diasComConclusao = grade.locator('[data-nivel]:not([data-nivel="0"])')
  await expect(titulo).toHaveText('5 itens concluídos no último ano')
  await expect(diasComConclusao).toHaveCount(4)
  for (const indicador of ['Sequência atual', 'Maior sequência', 'Dia mais produtivo']) {
    await expect(page.getByText(indicador)).toHaveCount(0)
  }
  await capturar(page, '5-antes')

  await page.getByRole('button', { name: 'Filtrar por categoria: Todas as categorias' }).click()
  await page.getByRole('textbox', { name: 'Buscar categoria' }).fill('trab')
  await capturar(page, '5-menu')
  await page.getByRole('menuitemradio', { name: 'Trabalho' }).click()
  await expect(titulo).toHaveText('3 itens concluídos no último ano')
  await expect(diasComConclusao).toHaveCount(2)
  await capturar(page, '5-depois')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Filtrar por categoria: Trabalho' })).toBeVisible()
  await expect(titulo).toHaveText('3 itens concluídos no último ano')
  await capturar(page, '5-recarregado')

  await page.getByRole('button', { name: 'Filtrar por categoria: Trabalho' }).click()
  await page.getByRole('menuitemradio', { name: 'Todas as categorias' }).click()
  await expect(titulo).toHaveText('5 itens concluídos no último ano')
})
