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
  return page.getByRole('textbox', { name: 'O que precisa ser feito?' })
}

function blocoHoje(page: Page) {
  return page.getByRole('region', { name: 'Hoje', exact: true })
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
  await page.getByRole('button', { name: 'Amanhã' }).click()
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

test('cria grupo com 3 itens para hoje e marca pelo bloco Hoje', async ({ page }) => {
  await page.goto('/inicio')
  await page.getByRole('button', { name: 'Grupo', exact: true }).click()
  // 1ª linha = nome do grupo; cada linha seguinte, um item.
  await campoDeCaptura(page).fill('Mercado\nCafé\nPão\nLeite')
  await capturar(page, '3-antes')
  await page.getByRole('button', { name: 'Criar' }).click()

  const grupo = blocoHoje(page).getByRole('listitem', { name: 'Grupo Mercado' })
  await expect(grupo.getByRole('checkbox')).toHaveCount(3)
  await expect(grupo.getByText('0/3')).toBeVisible()
  for (const item of ['Café', 'Pão', 'Leite']) {
    await grupo.getByRole('checkbox', { name: item }).click()
  }
  await expect(grupo.getByText('3/3')).toBeVisible()
  await expect(blocoHoje(page).getByText('nada pendente')).toBeVisible()
  const banco = await lerBanco(page)
  expect(banco.cards).toEqual([expect.objectContaining({ data: HOJE })])
  expect(banco.itens.map((item) => `${item.titulo}:${item.status}`).sort()).toEqual([
    'Café:concluido',
    'Leite:concluido',
    'Pão:concluido',
  ])
  await capturar(page, '3-depois')
})

test('"Trazer para hoje" numa atrasada', async ({ page }) => {
  await page.goto('/inicio')
  await semearTarefas(page, [{ titulo: 'Renovar CNH', data: '2026-10-28', status: 'pendente' }])
  const atrasadas = page.getByRole('region', { name: 'Atrasadas' })
  await expect(atrasadas.getByText('há 5 dias')).toBeVisible()
  await capturar(page, '4-antes')

  await atrasadas.getByRole('button', { name: 'Trazer Renovar CNH para hoje' }).click()
  await expect(atrasadas.getByText('Nada atrasado.')).toBeVisible()
  await expect(blocoHoje(page).getByRole('checkbox', { name: 'Renovar CNH' })).toBeVisible()
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

  await blocoHoje(page).getByRole('checkbox', { name: 'Pagar luz' }).click()
  await expect(quadradoDeHoje(page)).not.toHaveAttribute('data-nivel', '0')
  const nivelComUm = Number(await quadradoDeHoje(page).getAttribute('data-nivel'))
  await blocoHoje(page).getByRole('checkbox', { name: 'Ligar para a mãe' }).click()
  await expect
    .poll(async () => Number(await quadradoDeHoje(page).getAttribute('data-nivel')))
    .toBeGreaterThanOrEqual(nivelComUm)
  await expect(quadradoDeHoje(page)).toHaveAccessibleName('2 concluídos em 02/11/2026')
  await quadradoDeHoje(page).hover()
  await expect(page.getByRole('tooltip')).toHaveText('2 concluídos em 02/11/2026')
  await capturar(page, '5-depois')

  await quadradoDeHoje(page).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  await expect(page.getByText('Pagar luz')).toBeVisible()
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
