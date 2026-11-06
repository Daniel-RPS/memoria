import { expect, test, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Aba Grupos em cartões: fechado (resumo e barra), aberto (Pendentes, Dias, Feitos), só
 * leitura, teclado, vários abertos, atualização entre abas e a cor da faixa.
 * Capturas em e2e/capturas/grupos-cartoes-*.png.
 */

const ONTEM = '2026-11-05'
const HOJE = '2026-11-06'
const AMANHA = '2026-11-07'
const VERDE = '#2f8a57'

interface Modulos {
  categorias: {
    criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
  }
  grupos: {
    criarGrupo: (dados: {
      titulo: string
      data: string
      categoryId?: string
    }) => Promise<{ id: string }>
    criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
    definirConclusaoItem: (id: string, concluido: boolean) => Promise<void>
  }
  andamento: {
    definirAndamento: (alvos: { itens: string[] }, isMarcar: boolean) => Promise<unknown>
  }
  prioridade: {
    definirPrioridade: (alvos: { itens: string[] }, isMarcar: boolean) => Promise<unknown>
  }
}

/**
 * "Casa" (Lar): ontem Varrer (pendente) e Lavar a louça (feito); hoje Regar plantas (em
 * andamento), Tirar o lixo (prioridade) e Passar pano (feito). "Estudos" (sem categoria): amanhã.
 */
async function semear(page: Page) {
  await page.evaluate(
    async ({ ontem, hoje, amanha, verde }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const m = {
        categorias: await importar('/src/db/repositories/category-repository.ts'),
        grupos: await importar('/src/db/repositories/group-repository.ts'),
        andamento: await importar('/src/db/repositories/andamento-repository.ts'),
        prioridade: await importar('/src/db/repositories/prioridade-repository.ts'),
      } as Modulos
      const lar = await m.categorias.criarCategoria({ nome: 'Lar', cor: verde })
      const deOntem = await m.grupos.criarGrupo({ titulo: 'Casa', data: ontem, categoryId: lar.id })
      await m.grupos.criarItem(deOntem.id, 'Varrer')
      const louca = await m.grupos.criarItem(deOntem.id, 'Lavar a louça')
      await m.grupos.definirConclusaoItem(louca.id, true)
      const deHoje = await m.grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: lar.id })
      const regar = await m.grupos.criarItem(deHoje.id, 'Regar plantas')
      const lixo = await m.grupos.criarItem(deHoje.id, 'Tirar o lixo')
      const pano = await m.grupos.criarItem(deHoje.id, 'Passar pano')
      await m.grupos.definirConclusaoItem(pano.id, true)
      await m.andamento.definirAndamento({ itens: [regar.id] }, true)
      await m.prioridade.definirPrioridade({ itens: [lixo.id] }, true)
      const estudos = await m.grupos.criarGrupo({ titulo: 'Estudos', data: amanha })
      await m.grupos.criarItem(estudos.id, 'Ler capítulo 3')
    },
    { ontem: ONTEM, hoje: HOJE, amanha: AMANHA, verde: VERDE },
  )
}

function cartao(page: Page, nome: string) {
  return page.getByRole('article', { name: nome, exact: true })
}

function cabecalho(page: Page, nome: string) {
  return cartao(page, nome).getByRole('button', { name: new RegExp(`^${nome}`) })
}

function parte(page: Page, grupo: string, nome: 'Pendentes' | 'Dias' | 'Feitos') {
  return cartao(page, grupo).getByRole('region', { name: nome, exact: true })
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(450)
  await page.screenshot({ path: `e2e/capturas/grupos-cartoes-${nome}.png`, fullPage: true })
}

async function abrirGrupos(page: Page, tema: 'claro' | 'escuro' = 'claro') {
  await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
  await semear(page)
  await page.goto('/grupos')
  await expect(cartao(page, 'Casa')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
})

test('fechado mostra resumo e barra; aberto mostra Pendentes, Dias e Feitos', async ({ page }) => {
  await abrirGrupos(page)
  await expect(cabecalho(page, 'Casa')).toHaveText(/3 pendentes · 2 feitos · 2 dias/)
  await expect(cartao(page, 'Casa').locator('[data-progresso]')).toHaveAttribute(
    'data-progresso',
    '40',
  )
  await expect(cabecalho(page, 'Casa')).toHaveAttribute('aria-expanded', 'false')
  await expect(parte(page, 'Casa', 'Pendentes')).toBeHidden()
  await capturar(page, 'fechado-claro')

  await cabecalho(page, 'Casa').click()
  await expect(page).toHaveURL(/\/grupos$/)
  await expect(cabecalho(page, 'Casa')).toHaveAttribute('aria-expanded', 'true')
  const pendentes = parte(page, 'Casa', 'Pendentes').getByRole('listitem')
  // Por dia (ontem primeiro); no dia, em andamento e depois prioridade.
  await expect(pendentes).toHaveText([
    /Varrer.*05\/11/,
    /Regar plantas.*hoje/,
    /Tirar o lixo.*hoje/,
  ])
  await expect(pendentes.nth(1).locator('[data-indicador-andamento]')).toBeVisible()
  await expect(pendentes.nth(2).getByRole('img', { name: 'Prioridade' })).toBeVisible()
  // Só leitura: nada de caixa de marcar.
  await expect(cartao(page, 'Casa').getByRole('checkbox')).toHaveCount(0)
  await expect(parte(page, 'Casa', 'Dias').getByRole('link')).toHaveText([
    /06\/11.*1\/3/,
    /05\/11.*1\/2/,
  ])
  const botaoFeitos = cartao(page, 'Casa').getByRole('button', { name: 'Feitos (2)' })
  await expect(botaoFeitos).toHaveAttribute('aria-expanded', 'false')
  await capturar(page, 'aberto-claro')

  await botaoFeitos.click()
  await expect(botaoFeitos).toHaveAttribute('aria-expanded', 'true')
  const feitos = parte(page, 'Casa', 'Feitos').getByRole('listitem')
  // O relógio está parado: os dois foram concluídos no mesmo instante (a ordem fica no unitário).
  await expect(feitos).toHaveCount(2)
  await expect(parte(page, 'Casa', 'Feitos')).toContainText('Passar panohoje')
  await expect(parte(page, 'Casa', 'Feitos')).toContainText('Lavar a louçahoje')
  await expect(feitos.first().locator('.line-through')).toHaveCSS(
    'text-decoration-line',
    'line-through',
  )
  await capturar(page, 'feitos-claro')

  await page.evaluate(() => localStorage.setItem('memoria:tema', 'escuro'))
  await page.reload()
  await cabecalho(page, 'Casa').click()
  await cartao(page, 'Casa').getByRole('button', { name: 'Feitos (2)' }).click()
  await capturar(page, 'feitos-escuro')
})

test('chip de dia e Abrir no dia levam ao dia certo', async ({ page }) => {
  await abrirGrupos(page)
  await cabecalho(page, 'Casa').click()
  await parte(page, 'Casa', 'Dias')
    .getByRole('link', { name: /05\/11/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`/dia/${ONTEM}$`))
  await expect(page.getByRole('region', { name: 'Grupo Casa' })).toBeVisible()

  await page.goBack()
  await cabecalho(page, 'Estudos').click()
  await cartao(page, 'Estudos')
    .getByRole('link', { name: /Abrir no dia/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`/dia/${AMANHA}$`))
})

test('dois abertos ao mesmo tempo; Recolher tudo mexe só nos blocos', async ({ page }) => {
  await abrirGrupos(page)
  await cabecalho(page, 'Casa').click()
  await cabecalho(page, 'Estudos').click()
  await expect(cabecalho(page, 'Casa')).toHaveAttribute('aria-expanded', 'true')
  await expect(cabecalho(page, 'Estudos')).toHaveAttribute('aria-expanded', 'true')
  await expect(cartao(page, 'Estudos').getByText('Nada pendente')).toBeHidden()
  await expect(parte(page, 'Estudos', 'Pendentes')).toHaveText(/Ler capítulo 3.*amanhã/)
  // Sem feitos, a parte Feitos não aparece.
  await expect(cartao(page, 'Estudos').getByRole('button', { name: /^Feitos/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Recolher tudo' }).click()
  await expect(cabecalho(page, 'Casa')).toBeHidden()
  await page.getByRole('button', { name: 'Expandir tudo' }).click()
  await expect(cabecalho(page, 'Casa')).toHaveAttribute('aria-expanded', 'true')
  await expect(cabecalho(page, 'Estudos')).toHaveAttribute('aria-expanded', 'true')
})

test('teclado: Tab chega no cartão, Enter e Espaço abrem e fecham', async ({ page }) => {
  await abrirGrupos(page)
  await page.getByRole('searchbox', { name: 'Buscar grupos' }).focus()
  const casa = cabecalho(page, 'Casa')
  for (let vez = 0; vez < 10; vez++) {
    await page.keyboard.press('Tab')
    if (await casa.evaluate((elemento) => elemento === document.activeElement)) break
  }
  await expect(casa).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(casa).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Space')
  await expect(casa).toHaveAttribute('aria-expanded', 'false')
})

test('marcar no Dia em outra janela atualiza o cartão sem recarregar', async ({
  page,
  context,
}) => {
  await abrirGrupos(page)
  await cabecalho(page, 'Casa').click()
  await expect(parte(page, 'Casa', 'Pendentes').getByText('Tirar o lixo')).toBeVisible()

  const outra = await context.newPage()
  await outra.goto(`/dia/${HOJE}`)
  await expandirGrupos(outra)
  await outra.getByRole('checkbox', { name: 'Concluir Tirar o lixo' }).click()

  await expect(parte(page, 'Casa', 'Pendentes').getByText('Tirar o lixo')).toBeHidden()
  await expect(cabecalho(page, 'Casa')).toHaveText(/2 pendentes · 3 feitos · 2 dias/)
  await expect(cartao(page, 'Casa').getByRole('button', { name: 'Feitos (3)' })).toBeVisible()
})

test('faixa na cor da categoria; sem categoria, neutra; barra recolhida', async ({ page }) => {
  await abrirGrupos(page)
  const corDaFaixa = (nome: string) =>
    cartao(page, nome)
      .locator('[data-faixa]')
      .evaluate((elemento) => getComputedStyle(elemento).backgroundColor)
  expect(await corDaFaixa('Casa')).toBe('rgb(47, 138, 87)')
  const neutra = await page.evaluate(() => {
    const amostra = document.createElement('span')
    amostra.style.backgroundColor = 'var(--grafite)'
    document.body.append(amostra)
    const cor = getComputedStyle(amostra).backgroundColor
    amostra.remove()
    return cor
  })
  expect(await corDaFaixa('Estudos')).toBe(neutra)

  await cabecalho(page, 'Casa').click()
  await page.keyboard.press('Control+b')
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  await capturar(page, 'barra-recolhida-claro')
  await page.keyboard.press('Control+b')
})
