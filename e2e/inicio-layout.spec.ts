import { expect, test, type Page } from '@playwright/test'

/**
 * Layout do Início: só Hoje/Escolher data na captura, "Próximos 7 dias" na coluna da
 * direita (abaixo de Atrasadas), campo de captura de várias linhas e as colunas alinhadas.
 * Capturas em e2e/capturas/inicio-layout-<largura>-<tema>.png.
 */

const HOJE = '2026-11-02'

interface ModuloBanco {
  db: {
    tasks: { toArray: () => Promise<{ id: string; titulo: string; data: string }[]> }
    notes: {
      toArray: () => Promise<{ conteudo: string; vinculo?: { tipo: string; id: string } }[]>
    }
    groupCards: { toArray: () => Promise<{ id: string; data: string }[]> }
    groupItems: { toArray: () => Promise<{ cardId: string; titulo: string; ordem: number }[]> }
    groupSeries: { toArray: () => Promise<{ titulo: string }[]> }
  }
}

function campoDeCaptura(page: Page) {
  return page.getByRole('textbox', { name: 'Título da tarefa' })
}

function captura(page: Page) {
  return page.getByRole('region', { name: 'Captura rápida' })
}

function proximosDias(page: Page) {
  return page.getByRole('region', { name: 'Próximos 7 dias' })
}

async function lerBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [tarefas, notas, cards, itens, series] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.groupCards.toArray(),
      db.groupItems.toArray(),
      db.groupSeries.toArray(),
    ])
    return { tarefas, notas, cards, itens, series }
  })
}

/** Hoje, atrasadas, os próximos dias com pendentes e algumas conclusões para o mapa. */
async function semear(page: Page) {
  await page.evaluate(async (data) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const categorias = await importar('/src/db/repositories/category-repository.ts')
    const tarefas = await importar('/src/db/repositories/task-repository.ts')
    const grupos = await importar('/src/db/repositories/group-repository.ts')
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#8a5a3c' })
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#3366c2' })
    await tarefas.criarTarefa({ titulo: 'Enviar relatório', data, categoryId: trabalho.id })
    const feita = await tarefas.criarTarefa({ titulo: 'Pagar luz', data, categoryId: casa.id })
    await tarefas.definirConclusao(feita.id, true)
    const card = await grupos.criarGrupo({ titulo: 'Mercado', data, categoryId: casa.id })
    await grupos.criarItem(card.id, 'Café')
    await grupos.criarItem(card.id, 'Pão')
    await tarefas.criarTarefa({ titulo: 'Renovar CNH', data: '2026-10-29' })
    await tarefas.criarTarefa({ titulo: 'Devolver livro', data: '2026-10-31' })
    for (const [dia, quantas] of [
      ['2026-11-03', 2],
      ['2026-11-04', 4],
      ['2026-11-06', 1],
    ] as const) {
      for (let numero = 1; numero <= quantas; numero++) {
        await tarefas.criarTarefa({ titulo: `Tarefa ${numero} de ${dia}`, data: dia })
      }
    }
  }, HOJE)
}

test.beforeEach(async ({ page }) => {
  // Segunda, 2/11/2026, 10h em São Paulo.
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('a captura mostra só Hoje e Escolher data; a data escolhida aparece no botão', async ({
  page,
}) => {
  await page.goto('/inicio')
  const dias = captura(page).getByRole('group', { name: 'Dia' }).getByRole('button')
  await expect(dias).toHaveText(['Hoje', 'Escolher data'])
  const hoje = captura(page).getByRole('button', { name: 'Hoje' })
  await expect(hoje).toHaveAttribute('aria-pressed', 'true')
  await expect(captura(page).getByText('Amanhã')).toHaveCount(0)
  await expect(captura(page).getByText('Em grupo…')).toHaveCount(0)

  // 05/11: o botão mostra a data, marcado no lugar do Hoje.
  await campoDeCaptura(page).fill('Consulta')
  await captura(page).getByRole('button', { name: 'Escolher data' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /, 5 de novembro/ })
    .click()
  const data = dias.nth(1)
  await expect(data).toHaveText('05/11')
  await expect(data).toHaveAttribute('aria-pressed', 'true')
  await expect(hoje).toHaveAttribute('aria-pressed', 'false')
  await campoDeCaptura(page).press('Enter')
  await expect(page.getByText('Tarefa criada para 05/11')).toBeVisible()

  // Depois de criar volta ao padrão; escolher e clicar em Hoje também volta.
  await expect(dias).toHaveText(['Hoje', 'Escolher data'])
  await captura(page).getByRole('button', { name: 'Escolher data' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /10 de novembro/ })
    .click()
  await expect(data).toHaveText('10/11')
  await hoje.click()
  await expect(dias).toHaveText(['Hoje', 'Escolher data'])
  await expect(hoje).toHaveAttribute('aria-pressed', 'true')

  const { tarefas } = await lerBanco(page)
  expect(tarefas.map(({ titulo, data }) => `${titulo} ${data}`)).toEqual([`Consulta 2026-11-05`])
})

test('"Próximos 7 dias" fica na coluna da direita, abaixo de Atrasadas, e abre o Dia', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semear(page)
  const lateral = page.getByRole('complementary', { name: 'Hoje, atrasadas e próximos dias' })
  await expect(lateral.getByRole('region', { name: 'Próximos 7 dias' })).toBeVisible()
  const titulos = lateral.getByRole('heading', { level: 2 })
  await expect(titulos).toHaveText(['Hoje', 'Atrasadas', 'Próximos 7 dias'])

  const dias = proximosDias(page).getByRole('link')
  await expect(dias).toHaveCount(7)
  await expect(dias.nth(0)).toHaveAttribute('title', '2 pendentes em 03/11')
  await expect(dias.nth(1)).toHaveAttribute('title', '4 pendentes em 04/11')
  await expect(dias.nth(2)).toHaveAttribute('title', 'Nada pendente em 05/11')
  await expect(dias.nth(3)).toHaveAttribute('title', '1 pendente em 06/11')

  await dias.nth(1).click()
  await expect(page).toHaveURL(/\/dia\/2026-11-04$/)
  await expect(page.getByText('Tarefa 4 de 2026-11-04')).toBeVisible()
})

test('o campo cresce com as linhas; Shift+Enter quebra linha e Enter cria com a nota da tarefa', async ({
  page,
}) => {
  await page.goto('/inicio')
  const campo = campoDeCaptura(page)
  const alturaInicial = await campo.evaluate((elemento) => elemento.clientHeight)

  await campo.pressSequentially('Comprar tinta')
  for (const linha of ['Cor: areia', 'Marca boa', 'Dois galões', 'Rolo e pincel']) {
    await campo.press('Shift+Enter')
    await campo.pressSequentially(linha)
  }
  await expect(campo).toHaveValue(
    'Comprar tinta\nCor: areia\nMarca boa\nDois galões\nRolo e pincel',
  )
  await expect
    .poll(() => campo.evaluate((elemento) => elemento.clientHeight))
    .toBeGreaterThan(alturaInicial)
  await page.screenshot({ path: 'e2e/capturas/inicio-layout-varias-linhas.png' })

  await campo.press('Enter')
  await expect(page.getByText('Tarefa criada para 02/11')).toBeVisible()
  await expect(campo).toHaveValue('')
  const { tarefas, notas } = await lerBanco(page)
  expect(tarefas.map((tarefa) => tarefa.titulo)).toEqual(['Comprar tinta'])
  expect(notas).toEqual([
    expect.objectContaining({
      conteudo: 'Cor: areia\nMarca boa\nDois galões\nRolo e pincel',
      vinculo: { tipo: 'tarefa', id: tarefas[0].id },
    }),
  ])
})

test('no modo Grupo, o nome vem primeiro e cada linha é um item (as vazias saem)', async ({
  page,
}) => {
  await page.goto('/inicio')
  await captura(page).getByRole('button', { name: 'Grupo', exact: true }).click()
  await page.keyboard.type('Feira')
  for (const linha of ['Banana', '', 'Alface', 'Tomate']) {
    await page.keyboard.press('Enter')
    if (linha) await page.keyboard.type(linha)
  }
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Grupo Feira criado com 3 itens · 02/11')).toBeVisible()

  const { series, itens } = await lerBanco(page)
  expect(series.map((serie) => serie.titulo)).toEqual(['Feira'])
  expect(itens.sort((a, b) => a.ordem - b.ordem).map((item) => item.titulo)).toEqual([
    'Banana',
    'Alface',
    'Tomate',
  ])
})

test('Ctrl+K a partir da Semana foca o campo de captura', async ({ page }) => {
  await page.goto(`/semana/${HOJE}`)
  await expect(page.getByRole('region', { name: 'segunda-feira, 2 de novembro' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(campoDeCaptura(page)).toBeFocused()
})

for (const tema of ['claro', 'escuro'] as const) {
  for (const [largura, tamanho] of [
    ['normal', { width: 1366, height: 900 }],
    ['estreita', { width: 820, height: 1100 }],
  ] as const) {
    test(`captura do Início: largura ${largura}, tema ${tema}`, async ({ page }) => {
      await page.setViewportSize(tamanho)
      await page.addInitScript((escolha) => {
        localStorage.setItem('memoria:tema', escolha)
      }, tema)
      await page.goto('/inicio')
      await semear(page)
      await expect(page.getByRole('link', { name: 'Ver atrasadas' })).toBeVisible()
      await page.screenshot({
        path: `e2e/capturas/inicio-layout-${process.env.FASE ?? 'depois'}-${largura}-${tema}.png`,
        fullPage: true,
      })
    })
  }
}
