import { expect, test, type Page } from '@playwright/test'

/**
 * Início: abre focado na captura, cria tarefa e grupo ali mesmo (com categoria nova), marca
 * pelo bloco "Hoje", traz atrasada para hoje, o mapa muda ao concluir e Ctrl+K de outra tela.
 * Capturas em e2e/capturas/inicio-*.png (antes e depois de cada cenário).
 */

const HOJE = '2026-11-02'
const AMANHA = '2026-11-03'

interface TarefaSemeada {
  titulo: string
  data: string
  status: 'pendente' | 'concluida'
  concluidaEm?: string
}

interface ModuloBanco {
  db: {
    tasks: {
      bulkAdd: (tarefas: object[]) => Promise<unknown>
      toArray: () => Promise<
        { titulo: string; data: string; status: string; categoryId?: string }[]
      >
    }
    categories: { toArray: () => Promise<{ id: string; nome: string }[]> }
    groupCards: { toArray: () => Promise<{ id: string; data: string }[]> }
    groupItems: { toArray: () => Promise<{ cardId: string; titulo: string; status: string }[]> }
  }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/inicio-${nome}.png`, fullPage: true })
}

/** Grava tarefas direto no banco do app (dia, status e momento da conclusão escolhidos). */
async function semearTarefas(page: Page, tarefas: TarefaSemeada[]) {
  await page.evaluate(async (lista) => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const momento = new Date().toISOString()
    await db.tasks.bulkAdd(
      lista.map((tarefa, indice) => ({
        id: crypto.randomUUID(),
        ordem: indice + 1,
        dataOriginal: tarefa.data,
        criadoEm: momento,
        atualizadoEm: momento,
        ...tarefa,
      })),
    )
  }, tarefas)
}

async function lerBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [tarefas, categorias, cards, itens] = await Promise.all([
      db.tasks.toArray(),
      db.categories.toArray(),
      db.groupCards.toArray(),
      db.groupItems.toArray(),
    ])
    return { tarefas, categorias, cards, itens }
  })
}

function campoDeCaptura(page: Page) {
  return page.getByRole('textbox', { name: 'Título da tarefa' })
}

function blocoHoje(page: Page) {
  return page.getByRole('region', { name: 'Hoje', exact: true })
}

/** Conclui a tarefa de título `titulo` direto no banco (o bloco Hoje é só um resumo). */
async function concluirTarefa(page: Page, titulo: string) {
  await page.evaluate(async (procurado) => {
    const caminhoBanco = '/src/db/database.ts'
    const caminhoTarefas = '/src/db/repositories/task-repository.ts'
    const { db } = (await import(/* @vite-ignore */ caminhoBanco)) as ModuloBanco
    const repositorio = (await import(/* @vite-ignore */ caminhoTarefas)) as {
      definirConclusao: (id: string, concluida: boolean) => Promise<unknown>
    }
    const tarefas = (await db.tasks.toArray()) as unknown as { id: string; titulo: string }[]
    const tarefa = tarefas.find((atual) => atual.titulo === procurado)
    if (!tarefa) throw new Error(`Sem a tarefa ${procurado}`)
    await repositorio.definirConclusao(tarefa.id, true)
  }, titulo)
}

function quadradoDeHoje(page: Page) {
  return page
    .getByRole('group', { name: 'Conclusões por dia no último ano' })
    .locator('[aria-current="date"]')
}

test.beforeEach(async ({ page }) => {
  // Segunda, 2/11/2026, 10h em São Paulo.
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

/** "Escolher data" abre o calendário; o atalho Amanhã fica no diálogo. */
async function escolherAmanha(page: Page) {
  await page
    .getByRole('region', { name: 'Captura rápida' })
    .getByRole('button', { name: 'Escolher data', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Escolher o dia' })
    .getByRole('button', { name: 'Amanhã' })
    .click()
}

test('abre no Início com o campo de captura focado', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(campoDeCaptura(page)).toBeFocused()
  await expect(
    page.getByRole('navigation', { name: 'Telas' }).getByRole('link', { name: 'Início' }),
  ).toHaveAttribute('aria-current', 'page')
  await capturar(page, '1-abre-focado')
})

test('cria tarefa para amanhã com categoria nova e ela aparece no Dia sem recarregar', async ({
  page,
}) => {
  await page.goto('/inicio')
  await capturar(page, '2-antes')

  await campoDeCaptura(page).fill('Comprar presente da Ana')
  await escolherAmanha(page)
  await page.getByRole('button', { name: 'Sem categoria' }).click()
  await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Família')
  await page.getByRole('textbox', { name: 'Nova categoria' }).press('Enter')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Captura rápida' }).getByRole('button', { name: 'Família' }),
  ).toBeVisible()
  await capturar(page, '2-preenchida')

  await campoDeCaptura(page).press('Enter')
  const aviso = page.getByRole('region', { name: /Notifications/ })
  await expect(aviso.getByText('Tarefa criada para 03/11')).toBeVisible()
  await expect(campoDeCaptura(page)).toHaveValue('')
  await expect(campoDeCaptura(page)).toBeFocused()
  const banco = await lerBanco(page)
  expect(banco.tarefas).toEqual([
    expect.objectContaining({
      titulo: 'Comprar presente da Ana',
      data: AMANHA,
      categoryId: banco.categorias[0].id,
    }),
  ])
  expect(banco.categorias.map((categoria) => categoria.nome)).toEqual(['Família'])
  await capturar(page, '2-criada')

  await aviso.getByRole('button', { name: 'Ver no dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${AMANHA}$`))
  await expect(page.getByText('Comprar presente da Ana')).toBeVisible()
  await capturar(page, '2-no-dia')
})

test('cria grupo com 3 itens para hoje, marca no Dia e o Hoje do Início acompanha', async ({
  page,
}) => {
  await page.goto('/inicio')
  await page.getByRole('button', { name: 'Grupo', exact: true }).click()
  // Nome do grupo e, abaixo, uma linha por item (Enter abre a próxima).
  await page.getByRole('textbox', { name: 'Nome do grupo' }).fill('Mercado')
  await page.keyboard.press('Enter')
  for (const [indice, item] of ['Café', 'Pão', 'Leite'].entries()) {
    if (indice > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(item)
  }
  await capturar(page, '3-antes')
  await page.getByRole('button', { name: 'Criar' }).click()

  await expect(blocoHoje(page).getByText('3 pendentes', { exact: true })).toBeVisible()
  // Marca no Dia (o bloco Hoje é só um resumo) e volta ao Início sem recarregar.
  await blocoHoje(page).getByRole('link', { name: 'Ver o dia' }).click()
  await page.getByRole('button', { name: 'Abrir Mercado' }).click()
  for (const item of ['Café', 'Pão', 'Leite']) {
    await page.getByRole('checkbox', { name: `Concluir ${item}` }).click()
  }
  await expect(page.getByRole('checkbox', { name: /^Concluir / })).toHaveCount(0)
  await page.getByRole('link', { name: 'Início' }).first().click()
  await expect(blocoHoje(page).getByRole('link', { name: 'Ver o dia' })).toBeVisible()
  await expect(blocoHoje(page).getByText(/pendente/)).toHaveCount(0)
  const banco = await lerBanco(page)
  expect(banco.cards).toEqual([expect.objectContaining({ data: HOJE })])
  expect(banco.itens.map((item) => `${item.titulo}:${item.status}`).sort()).toEqual([
    'Café:concluido',
    'Leite:concluido',
    'Pão:concluido',
  ])
  await capturar(page, '3-depois')
})

test('"Trazer todas para hoje" nas atrasadas', async ({ page }) => {
  await page.goto('/inicio')
  await semearTarefas(page, [{ titulo: 'Renovar CNH', data: '2026-10-28', status: 'pendente' }])
  const atrasadas = page.getByRole('region', { name: 'Atrasadas' })
  await expect(atrasadas.getByRole('link', { name: 'Ver atrasadas' })).toHaveAttribute(
    'href',
    '/dia/2026-10-28',
  )
  await capturar(page, '4-antes')

  await atrasadas.getByRole('button', { name: 'Trazer todas para hoje' }).click()
  await expect(atrasadas.getByText('Tudo em dia')).toBeVisible()
  await expect(blocoHoje(page).getByText('1 pendente', { exact: true })).toBeVisible()
  const banco = await lerBanco(page)
  expect(banco.tarefas[0]).toMatchObject({ data: HOJE, status: 'pendente' })
  await capturar(page, '4-depois')
})

test('concluir muda a intensidade do quadrado de hoje; clicar nele abre o Dia', async ({
  page,
}) => {
  await page.goto('/inicio')
  // Histórico: 1 a 6 conclusões espalhadas nos últimos meses, para as faixas existirem.
  const historico: TarefaSemeada[] = []
  for (let dias = 1; dias <= 120; dias += 3) {
    const quando = new Date(Date.UTC(2026, 10, 2 - dias, 15))
    const data = quando.toISOString().slice(0, 10)
    for (let vez = 0; vez < (dias % 6) + 1; vez++) {
      historico.push({
        titulo: `Feito ${dias}-${vez}`,
        data,
        status: 'concluida',
        concluidaEm: quando.toISOString(),
      })
    }
  }
  await semearTarefas(page, [
    ...historico,
    { titulo: 'Pagar luz', data: HOJE, status: 'pendente' },
    { titulo: 'Ligar para a mãe', data: HOJE, status: 'pendente' },
  ])
  await expect(page.getByRole('heading', { name: /itens concluídos no último ano/ })).toContainText(
    String(historico.length),
  )
  await expect(quadradoDeHoje(page)).toHaveAttribute('data-nivel', '0')
  await capturar(page, '5-antes')

  await concluirTarefa(page, 'Pagar luz')
  await expect(quadradoDeHoje(page)).not.toHaveAttribute('data-nivel', '0')
  const nivelComUm = Number(await quadradoDeHoje(page).getAttribute('data-nivel'))
  await concluirTarefa(page, 'Ligar para a mãe')
  await expect
    .poll(async () => Number(await quadradoDeHoje(page).getAttribute('data-nivel')))
    .toBeGreaterThanOrEqual(nivelComUm)
  await expect(quadradoDeHoje(page)).toHaveAccessibleName('2 concluídos em 02/11/2026')
  await quadradoDeHoje(page).hover()
  await expect(page.getByRole('tooltip')).toHaveText('2 concluídos em 02/11/2026')
  await capturar(page, '5-depois')

  await quadradoDeHoje(page).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await capturar(page, '5-no-dia')
})

test('barra recolhida: o Início vira ícone com dica e o Ctrl+B continua valendo', async ({
  page,
}) => {
  await page.goto(`/dia/${HOJE}`)
  await page.keyboard.press('Control+b')
  const inicio = page.getByRole('navigation', { name: 'Telas' }).getByRole('link', {
    name: 'Início',
  })
  await expect
    .poll(() => page.locator('aside').evaluate((barra) => barra.getBoundingClientRect().width))
    .toBe(64)
  await inicio.hover()
  await expect(page.getByRole('tooltip', { name: 'Início' })).toBeVisible()
  await capturar(page, '7-recolhida-dica')

  await inicio.click()
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(inicio).toHaveAttribute('aria-current', 'page')
  await capturar(page, '7-recolhida-inicio')
})

test('Ctrl+K foca a captura a partir da visão Semana', async ({ page }) => {
  await page.goto(`/semana/${HOJE}`)
  await expect(page.getByRole('region', { name: 'segunda-feira, 2 de novembro' })).toBeVisible()
  await capturar(page, '6-antes')

  await page.keyboard.press('Control+k')
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(campoDeCaptura(page)).toBeFocused()
  await capturar(page, '6-depois')
})
