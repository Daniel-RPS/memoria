import { test, type Page } from '@playwright/test'

/**
 * Só capturas (sem asserções) da aba Categorias e dos seletores, nos dois temas e em duas
 * larguras, para comparar antes e depois de uma mudança. Rode com CAPTURA=antes ou depois;
 * as imagens ficam em e2e/capturas/categorias-<CAPTURA>-*.png.
 */

const ROTULO = process.env.CAPTURA ?? 'atual'
const HOJE = '2026-11-02'

test.skip(!process.env.CAPTURA, 'Só roda pedindo capturas (CAPTURA=antes|depois).')

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string; tipo?: string }) => Promise<{ id: string }>
  criarSubcategoria: (dados: { categoryId: string; nome: string }) => Promise<unknown>
}

async function semear(page: Page) {
  return page.evaluate(async (data) => {
    const caminhoCategorias = '/src/db/repositories/category-repository.ts'
    const caminhoGrupos = '/src/db/repositories/group-repository.ts'
    const caminhoProcedimentos = '/src/db/repositories/procedure-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
    const grupos = (await import(/* @vite-ignore */ caminhoGrupos)) as {
      criarGrupo: (dados: { titulo: string; data: string; categoryId?: string }) => Promise<{
        id: string
      }>
      criarItem: (cardId: string, titulo: string) => Promise<unknown>
    }
    const procedimentos = (await import(/* @vite-ignore */ caminhoProcedimentos)) as {
      criarProcedimento: (dados: {
        titulo: string
        categoryId: string
        etapas: { texto: string }[]
      }) => Promise<{ id: string }>
    }
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#2f8a57', tipo: 'grupo' })
    await categorias.criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    await categorias.criarSubcategoria({ categoryId: casa.id, nome: 'Cozinha' })
    const trabalho = await categorias.criarCategoria({
      nome: 'Trabalho',
      cor: '#3366c2',
      tipo: 'grupo',
    })
    const github = await categorias.criarCategoria({
      nome: 'Github',
      cor: '#5b4fbf',
      tipo: 'procedimento',
    })
    await categorias.criarCategoria({ nome: 'Receitas', cor: '#d0702a', tipo: 'procedimento' })
    const card = await grupos.criarGrupo({ titulo: 'Mercado', data, categoryId: casa.id })
    await grupos.criarItem(card.id, 'Pão')
    await grupos.criarGrupo({ titulo: 'Relatório', data, categoryId: trabalho.id })
    return (
      await procedimentos.criarProcedimento({
        titulo: 'Publicar versão',
        categoryId: github.id,
        etapas: [{ texto: 'Rodar os testes' }],
      })
    ).id
  }, HOJE)
}

async function capturar(page: Page, nome: string) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `e2e/capturas/categorias-${ROTULO}-${nome}.png`, fullPage: true })
}

for (const tema of ['claro', 'escuro'] as const) {
  test(`capturas no tema ${tema}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
    await page.addInitScript((escolha) => {
      localStorage.setItem('memoria:tema', escolha)
      localStorage.setItem('memoria:fundo', 'liso')
    }, tema)
    await page.goto('/categorias')
    const idProcedimento = await semear(page)

    // Estreita como no uso real: barra lateral recolhida (só ícones).
    for (const [largura, sufixo, isRecolhida] of [
      [1440, 'larga', false],
      [420, 'estreita', true],
    ] as const) {
      await page.evaluate((recolhida) => {
        localStorage.setItem('memoria:barra-recolhida', String(recolhida))
      }, isRecolhida)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/categorias')
      await page.getByRole('button', { name: 'Casa', exact: true }).waitFor()
      await capturar(page, `aba-${tema}-${sufixo}`)
      if (ROTULO === 'antes') continue
      await page.getByRole('button', { name: /^Cor de Casa/ }).click()
      await page.getByRole('radio', { name: 'Cor personalizada' }).click()
      await capturar(page, `misturador-${tema}-${sufixo}`)
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
    }
    await page.evaluate(() => localStorage.setItem('memoria:barra-recolhida', 'false'))

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/inicio')
    await page.getByRole('button', { name: 'Sem categoria' }).click()
    await capturar(page, `seletor-inicio-${tema}`)

    await page.goto(`/procedimentos/${idProcedimento}`)
    await page.getByRole('button', { name: 'Categoria', exact: true }).click()
    await capturar(page, `seletor-procedimento-${tema}`)
    await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
    await capturar(page, `seletor-nova-categoria-${tema}`)
    if (ROTULO === 'antes') return
    await page.getByRole('radio', { name: 'Cor personalizada' }).click()
    await capturar(page, `seletor-misturador-${tema}`)
  })
}
