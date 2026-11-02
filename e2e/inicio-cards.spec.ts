import { expect, test, type Page } from '@playwright/test'

/**
 * Hoje e Atrasadas do Início em cards por tipo: um card por grupo (faixa e barra de progresso
 * na cor da categoria) e um card "Tarefas soltas". Capturas em
 * e2e/capturas/inicio-cards-<fase>-*.png (FASE=antes|depois; o padrão é depois), nas larguras
 * normal e estreita, nos temas claro e escuro, com e sem atrasadas.
 */

const HOJE = '2026-11-02'
const FASE = process.env.FASE ?? 'depois'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string; seriesId: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  definirConclusaoItem: (id: string, concluido: boolean) => Promise<unknown>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
}

interface Semente {
  hoje: string
  /** Grupo "Casa" com 3 itens (1 feito) hoje. */
  isCasa: boolean
  /** Tarefa solta "Mandar tal coisa às 09:00" hoje. */
  isSolta: boolean
  /** Grupo "Mercado" (2 itens) em 30/10 e a tarefa "Renovar CNH" em 29/10. */
  isAtrasadas: boolean
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/inicio-cards-${FASE}-${nome}.png`, fullPage: true })
}

async function semear(page: Page, semente: Omit<Semente, 'hoje'>) {
  await page.evaluate(
    async ({ hoje, isCasa, isSolta, isAtrasadas }: Semente) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const categorias = (await importar(
        '/src/db/repositories/category-repository.ts',
      )) as ModuloCategorias
      if (isCasa) {
        // Amarelo claro de propósito: a faixa e a barra têm de aparecer no tema claro.
        const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#f2c94c' })
        const card = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: casa.id })
        const varrer = await grupos.criarItem(card.id, 'Varrer')
        await grupos.criarItem(card.id, 'Lavar a louça')
        await grupos.criarItem(card.id, 'Regar as plantas')
        await grupos.definirConclusaoItem(varrer.id, true)
      }
      if (isSolta) await tarefas.criarTarefa({ titulo: 'Mandar tal coisa às 09:00', data: hoje })
      if (isAtrasadas) {
        const card = await grupos.criarGrupo({ titulo: 'Mercado', data: '2026-10-30' })
        await grupos.criarItem(card.id, 'Comprar arroz')
        await grupos.criarItem(card.id, 'Comprar café')
        await tarefas.criarTarefa({ titulo: 'Renovar CNH', data: '2026-10-29' })
      }
    },
    { hoje: HOJE, ...semente },
  )
}

function bloco(page: Page, nome: 'Hoje' | 'Atrasadas') {
  return page.getByRole('region', { name: nome, exact: true })
}

function cardDoGrupo(page: Page, nome: 'Hoje' | 'Atrasadas', titulo: string) {
  return bloco(page, nome).getByRole('listitem', { name: `Grupo ${titulo}` })
}

function cardSoltas(page: Page, nome: 'Hoje' | 'Atrasadas') {
  return bloco(page, nome).getByRole('group', { name: 'Tarefas soltas' })
}

function quadradoDeHoje(page: Page) {
  return page
    .getByRole('group', { name: 'Conclusões por dia no último ano' })
    .locator('[aria-current="date"]')
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('capturas: larguras, temas, com e sem atrasadas', async ({ page }) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: true, isSolta: true, isAtrasadas: false })
  await expect(page.getByText('Mandar tal coisa às 09:00')).toBeVisible()
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.setViewportSize({ width: 1680, height: 1000 })
    await capturar(page, `sem-atrasadas-normal-${tema}`)
    await page.setViewportSize({ width: 900, height: 1000 })
    await capturar(page, `sem-atrasadas-estreita-${tema}`)
  }

  await semear(page, { isCasa: false, isSolta: false, isAtrasadas: true })
  await expect(page.getByText('Renovar CNH')).toBeVisible()
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.setViewportSize({ width: 1680, height: 1000 })
    await capturar(page, `com-atrasadas-normal-${tema}`)
    await page.setViewportSize({ width: 900, height: 1000 })
    await capturar(page, `com-atrasadas-estreita-${tema}`)
  }
})

test('Hoje: card "Casa" com 1/3 e barra, card "Tarefas soltas" separado com o texto inteiro', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: true, isSolta: true, isAtrasadas: false })

  const casa = cardDoGrupo(page, 'Hoje', 'Casa')
  await expect(casa.getByText('1/3', { exact: true })).toBeVisible()
  await expect(casa.getByRole('progressbar', { name: 'Progresso de Casa' })).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
  await expect(casa.getByText('Mandar tal coisa')).toHaveCount(0)
  // Feito vai para o fim do card.
  expect(
    await casa
      .getByRole('checkbox')
      .evaluateAll((caixas) => caixas.map((caixa) => caixa.getAttribute('aria-label'))),
  ).toEqual(['Lavar a louça', 'Regar as plantas', 'Varrer'])

  const soltas = cardSoltas(page, 'Hoje')
  const tarefa = soltas.getByText('Mandar tal coisa às 09:00', { exact: true })
  await expect(tarefa).toBeVisible()
  // Inteiro: a caixa do texto não é mais estreita que o texto (nada cortado).
  const corte = await tarefa.evaluate((elemento) => elemento.scrollWidth - elemento.clientWidth)
  expect(corte).toBeLessThanOrEqual(0)
  await expect(bloco(page, 'Hoje').getByText('3 pendentes')).toBeVisible()
  await capturar(page, '1-hoje')
})

test('marcar item no card "Casa" atualiza contador, barra e mapa sem recarregar', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: true, isSolta: false, isAtrasadas: false })
  const casa = cardDoGrupo(page, 'Hoje', 'Casa')
  await expect(casa.getByText('1/3', { exact: true })).toBeVisible()
  const nivelAntes = await quadradoDeHoje(page).getAttribute('aria-label')

  // Feito vai para o fim do card: clica e confere o estado (check() estranha a troca de lugar).
  await casa.getByRole('checkbox', { name: 'Lavar a louça' }).click()
  await expect(casa.getByRole('checkbox', { name: 'Lavar a louça' })).toBeChecked()

  await expect(casa.getByText('2/3', { exact: true })).toBeVisible()
  await expect(casa.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await expect(quadradoDeHoje(page)).not.toHaveAttribute('aria-label', nivelAntes ?? '')
  await capturar(page, '2-marcado')
})

test('sem tarefas soltas o card "Tarefas soltas" não aparece; Atrasadas vazio = "Tudo em dia"', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: true, isSolta: false, isAtrasadas: false })
  await expect(cardDoGrupo(page, 'Hoje', 'Casa')).toBeVisible()
  await expect(cardSoltas(page, 'Hoje')).toHaveCount(0)
  await expect(bloco(page, 'Atrasadas').getByText('Tudo em dia')).toBeVisible()
  await capturar(page, '3-sem-soltas')
})

test('atrasados em cards separados com "há X dias"; trazer o grupo e a tarefa para hoje', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: false, isSolta: false, isAtrasadas: true })

  const mercado = cardDoGrupo(page, 'Atrasadas', 'Mercado')
  const soltas = cardSoltas(page, 'Atrasadas')
  await expect(mercado.getByText('há 3 dias')).toHaveCount(2)
  await expect(mercado.getByText('Renovar CNH')).toHaveCount(0)
  await expect(soltas.getByText('Renovar CNH')).toBeVisible()
  await expect(soltas.getByText('há 4 dias')).toBeVisible()
  await capturar(page, '4-atrasadas-antes')

  await mercado.hover()
  await mercado.getByRole('button', { name: 'Trazer pendentes de Mercado para hoje' }).click()
  await expect(cardDoGrupo(page, 'Hoje', 'Mercado')).toBeVisible()
  await expect(cardDoGrupo(page, 'Hoje', 'Mercado').getByText('0/2', { exact: true })).toBeVisible()
  await expect(mercado).toHaveCount(0)

  await soltas.getByRole('listitem').hover()
  await soltas.getByRole('button', { name: 'Trazer Renovar CNH para hoje' }).click()
  await expect(cardSoltas(page, 'Hoje').getByText('Renovar CNH')).toBeVisible()
  await expect(bloco(page, 'Atrasadas').getByText('Tudo em dia')).toBeVisible()
  await capturar(page, '4-atrasadas-depois')
})

test('"+ Adicionar item" no card de grupo continua funcionando', async ({ page }) => {
  await page.goto('/inicio')
  await semear(page, { isCasa: true, isSolta: false, isAtrasadas: false })
  const casa = cardDoGrupo(page, 'Hoje', 'Casa')
  await casa.hover()
  await casa.getByRole('button', { name: 'Adicionar item em Casa' }).click()
  const campo = page.getByRole('textbox', { name: 'Novo item em Casa' })
  await campo.fill('Tirar o lixo')
  await campo.press('Enter')
  await expect(casa.getByRole('checkbox', { name: 'Tirar o lixo' })).toBeVisible()
  await expect(casa.getByText('1/4', { exact: true })).toBeVisible()
  await capturar(page, '5-adicionar')
})
