import { expect, test, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'
import { fixarTema } from './semear-ajustes.ts'

/**
 * Ajuste de 02/11/2026 (2): o traço sob o cabeçalho da Semana vai de ponta a ponta (fora da
 * rolagem das colunas) e toda categoria de Procedimento vira bloco na aba Procedimentos, mesmo
 * vazia, em sincronia com a aba Categorias. Capturas em e2e/capturas/linha-procedimentos-*.png.
 */

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/linha-procedimentos-depois-${nome}.png` })
}

function bloco(page: Page, nome: string) {
  return page
    .getByRole('region', { name: 'Lista de procedimentos' })
    .getByRole('region', { name: nome, exact: true })
}

/** Chama uma função do repositório de categorias pelo próprio app (como a aba Categorias faz). */
async function categorias(page: Page, acao: string, ...argumentos: unknown[]) {
  return page.evaluate(
    async ({ acao: nome, argumentos: lista }) => {
      const modulo = await import(
        /* @vite-ignore */ String('/src/db/repositories/category-repository.ts')
      )
      return modulo[nome](...lista)
    },
    { acao, argumentos },
  )
}

async function larguras(page: Page) {
  return page.evaluate(() => {
    const cabecalho = document.querySelector('main header')
    const folha = cabecalho?.parentElement
    if (!cabecalho || !folha) return null
    const estilo = getComputedStyle(folha)
    const interna =
      folha.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
    return {
      traco: cabecalho.getBoundingClientRect().width,
      painel: interna,
      borda: getComputedStyle(cabecalho).borderBottomWidth,
    }
  })
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000)
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00-03:00'))
})

for (const tema of ['claro', 'escuro'] as const) {
  test(`Semana (${tema}): o traço do cabeçalho tem a largura do painel, larga e estreita`, async ({
    page,
  }) => {
    await fixarTema(page, tema)
    await page.goto('/semana/2026-11-02')
    await page.evaluate(async () => {
      const grupos = await import(
        /* @vite-ignore */ String('/src/db/repositories/group-repository.ts')
      )
      const card = await grupos.criarGrupo({ titulo: 'Casa', data: '2026-11-06' })
      await grupos.criarItem(card.id, 'Lavar roupa')
    })
    await expandirGrupos(page)
    await expect(page.getByText('Lavar roupa')).toBeVisible()

    for (const [nome, largura] of [
      ['larga', 1680],
      ['estreita', 1000],
    ] as const) {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.reload()
      await expandirGrupos(page)
      await expect(page.getByText('Lavar roupa')).toBeVisible()
      const medidas = await larguras(page)
      expect(medidas?.borda).toBe('2px')
      expect(Math.abs((medidas?.traco ?? 0) - (medidas?.painel ?? -1))).toBeLessThanOrEqual(1)
      if (nome === 'estreita') {
        // Rolada até hoje, recolhida: o traço continua de ponta a ponta.
        await page.getByRole('button', { name: 'Recolher tudo' }).click()
        await page.waitForTimeout(400)
        const recolhida = await larguras(page)
        expect(Math.abs((recolhida?.traco ?? 0) - (recolhida?.painel ?? -1))).toBeLessThanOrEqual(1)
      }
      await capturar(page, `semana-${nome}-${tema}`)
    }
  })
}

test('Procedimentos: categoria vazia vira bloco e acompanha a aba Categorias (outra aba)', async ({
  page,
  context,
}) => {
  await page.goto('/procedimentos')
  await expect(page.getByText('Criar o primeiro procedimento')).toBeVisible()

  // Outra aba do navegador cria a categoria pela aba Categorias.
  const outra = await context.newPage()
  await outra.clock.setFixedTime(new Date('2026-11-06T10:00:00-03:00'))
  await outra.goto('/categorias')
  await outra.getByRole('button', { name: 'Nova categoria em Procedimentos' }).click()
  await outra.getByRole('textbox', { name: 'Nova categoria' }).fill('teste')
  await outra.keyboard.press('Enter')
  await outra.keyboard.press('Escape')

  // Aparece sem recarregar: bloco "teste" com 0 e a linha discreta.
  const teste = bloco(page, 'teste')
  await expect(teste).toBeVisible()
  await expect(teste.getByRole('heading')).toContainText('0')
  await expect(teste.getByText('Nenhum procedimento nesta categoria')).toBeVisible()
  await expect(page.getByText('Criar o primeiro procedimento')).toHaveCount(0)

  // Renomear e mudar a cor (pelo repositório, como a aba Categorias) → atualiza na hora.
  const [{ id }] = (await categorias(outra, 'listarCategorias')) as { id: string }[]
  await categorias(outra, 'atualizarCategoria', id, { nome: 'teste 2', cor: '#c2410c' })
  const renomeado = bloco(page, 'teste 2')
  await expect(renomeado).toBeVisible()
  await expect(renomeado.getByRole('heading').locator('span[aria-hidden]').first()).toHaveCSS(
    'background-color',
    'rgb(194, 65, 12)',
  )

  // "Mover para Grupos" tira o bloco; voltar traz de novo; excluir some.
  await categorias(outra, 'moverCategoriaDeTipo', id)
  await expect(renomeado).toHaveCount(0)
  await categorias(outra, 'moverCategoriaDeTipo', id)
  await expect(renomeado).toBeVisible()
  await categorias(outra, 'excluirCategoria', id)
  await expect(renomeado).toHaveCount(0)
  await expect(page.getByText('Criar o primeiro procedimento')).toBeVisible()
  await outra.close()
})

test('"+ Novo procedimento aqui" abre o editor na categoria; ao salvar a contagem vai a 1', async ({
  page,
}) => {
  await page.goto('/procedimentos')
  await categorias(page, 'criarCategoria', { nome: 'teste', tipo: 'procedimento', cor: '#2563eb' })
  await categorias(page, 'criarCategoria', { nome: 'Deploy', tipo: 'procedimento' })
  await expect(bloco(page, 'teste')).toBeVisible()
  await capturar(page, 'procedimentos-vazios-claro')

  await bloco(page, 'teste').getByRole('link', { name: 'Novo procedimento em teste' }).click()
  await expect(page.locator('#categoria')).toContainText('teste')
  await page.getByLabel('Título').fill('Publicar o site')
  await page.getByRole('button', { name: 'Criar procedimento' }).click()
  await expect(page.getByText('Salvo')).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Telas' })
    .getByRole('link', { name: 'Procedimentos' })
    .click()
  await expect(bloco(page, 'teste').getByRole('heading')).toContainText('1')
  await expect(bloco(page, 'teste').getByRole('link', { name: /^Publicar o site/ })).toBeVisible()
  // O outro bloco continua vazio; com busca, os sem resultado somem.
  await expect(bloco(page, 'Deploy').getByText('Nenhum procedimento nesta categoria')).toBeVisible()
  await page.getByRole('searchbox').fill('publicar')
  await expect(bloco(page, 'Deploy')).toHaveCount(0)
  await expect(bloco(page, 'teste')).toBeVisible()
})

test('Procedimentos com categorias vazias no tema escuro', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.goto('/procedimentos')
  await categorias(page, 'criarCategoria', { nome: 'teste', tipo: 'procedimento' })
  await categorias(page, 'criarCategoria', { nome: 'teste 2', tipo: 'procedimento' })
  await expect(bloco(page, 'teste 2')).toBeVisible()
  await capturar(page, 'procedimentos-vazios-escuro')
})
