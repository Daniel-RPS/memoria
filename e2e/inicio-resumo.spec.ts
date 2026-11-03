import { expect, test, type Page } from '@playwright/test'

/**
 * Hoje e Atrasadas do Início em números (frase, contagem, barra) + link, e grupos do Dia e da Semana sempre
 * recolhidos ao abrir a visão. Capturas em e2e/capturas/resumo-<fase>-<tela>-<tema>.png
 * (FASE=antes|depois; o padrão é depois).
 */

const HOJE = '2026-11-03'
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

/** Hoje: Simulador POOSE (11 itens, 1 feito), Site Poose (3), MemorIA (2) e 1 tarefa solta. */
async function semearHoje(page: Page) {
  await page.evaluate(async (hoje: string) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
    const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
    const categorias = (await importar(
      '/src/db/repositories/category-repository.ts',
    )) as ModuloCategorias
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#2f80ed' })
    const projetos = await categorias.criarCategoria({ nome: 'Projetos', cor: '#f2c94c' })
    const simulador = await grupos.criarGrupo({
      titulo: 'Simulador POOSE',
      data: hoje,
      categoryId: trabalho.id,
    })
    for (let indice = 1; indice <= 11; indice++) {
      const item = await grupos.criarItem(
        simulador.id,
        `Tela ${indice} do simulador com um texto comprido`,
      )
      if (indice === 1) await grupos.definirConclusaoItem(item.id, true)
    }
    const site = await grupos.criarGrupo({
      titulo: 'Site Poose',
      data: hoje,
      categoryId: trabalho.id,
    })
    for (const titulo of ['Rodapé', 'Contato', 'Blog']) await grupos.criarItem(site.id, titulo)
    const memoria = await grupos.criarGrupo({
      titulo: 'MemorIA',
      data: hoje,
      categoryId: projetos.id,
    })
    for (const titulo of ['Resumo do Início', 'Grupos recolhidos'])
      await grupos.criarItem(memoria.id, titulo)
    await tarefas.criarTarefa({ titulo: 'Pagar a conta de luz', data: hoje })
  }, HOJE)
}

/** Atrasadas: Mercado (2 itens) em 31/10 e "Renovar CNH" em 28/10. */
async function semearAtrasadas(page: Page) {
  await page.evaluate(async () => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
    const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
    const card = await grupos.criarGrupo({ titulo: 'Mercado', data: '2026-10-31' })
    await grupos.criarItem(card.id, 'Comprar arroz')
    await grupos.criarItem(card.id, 'Comprar café')
    await tarefas.criarTarefa({ titulo: 'Renovar CNH', data: '2026-10-28' })
  })
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/resumo-${FASE}-${nome}.png`, fullPage: true })
}

function bloco(page: Page, nome: 'Hoje' | 'Atrasadas') {
  return page.getByRole('region', { name: nome, exact: true })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-03:00'))
})

test('capturas: Início, Dia e Semana nos dois temas', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/inicio')
  await semearHoje(page)
  await semearAtrasadas(page)
  await expect(bloco(page, 'Hoje').getByText('16 pendentes', { exact: true })).toBeVisible()
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.setViewportSize({ width: 1680, height: 1000 })
    await page.goto('/inicio')
    await expect(bloco(page, 'Hoje').getByText('16 pendentes', { exact: true })).toBeVisible()
    await capturar(page, `inicio-${tema}`)
    await page.setViewportSize({ width: 900, height: 1000 })
    await capturar(page, `inicio-estreita-${tema}`)
    await page.setViewportSize({ width: 1680, height: 1000 })
    await page.goto(`/dia/${HOJE}`)
    await expect(page.getByText('Simulador POOSE').first()).toBeVisible()
    await capturar(page, `dia-${tema}`)
    await page.goto(`/semana/${HOJE}`)
    await expect(page.getByText('Simulador POOSE').first()).toBeVisible()
    await capturar(page, `semana-${tema}`)
  }
})

/** Elementos de texto da coluna lateral cortados com reticências (ou rolagem lateral). */
function textosCortados(page: Page) {
  return page
    .getByRole('complementary', { name: 'Hoje, atrasadas e próximos dias' })
    .evaluate((coluna) =>
      [...coluna.querySelectorAll<HTMLElement>('*')]
        .filter(
          (elemento) =>
            getComputedStyle(elemento).textOverflow === 'ellipsis' ||
            elemento.scrollWidth > elemento.clientWidth + 1,
        )
        .map((elemento) => elemento.textContent),
    )
}

test('1 grupo (1 item) + 1 tarefa solta: frase, contagem e barra; marcar tudo → "Tudo feito"', async ({
  page,
}) => {
  await page.goto('/inicio')
  await page.evaluate(async (hoje: string) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
    const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
    const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje })
    await grupos.criarItem(casa.id, 'Lavar o quintal')
    await tarefas.criarTarefa({ titulo: 'Fazer curso', data: hoje })
  }, HOJE)

  const hoje = bloco(page, 'Hoje')
  await expect(hoje.getByText('2 pendentes para hoje.')).toBeVisible()
  await expect(
    hoje.getByRole('list', { name: 'Grupos e tarefas soltas' }).getByRole('listitem'),
  ).toHaveText(['1 grupo · 1 item', '1 tarefa solta'])
  const barra = hoje.getByRole('progressbar', { name: 'Progresso de hoje' })
  await expect(barra).toHaveAttribute('aria-valuenow', '0')
  await expect(barra).toHaveAttribute('aria-valuemax', '2')
  // Nada de nomes de grupos nem de tarefas no resumo.
  await expect(hoje.getByText('Casa')).toHaveCount(0)
  await expect(hoje.getByText('Fazer curso')).toHaveCount(0)
  for (const largura of [1680, 900]) {
    await page.setViewportSize({ width: largura, height: 1000 })
    expect(await textosCortados(page)).toEqual([])
  }
  await page.setViewportSize({ width: 1680, height: 1000 })

  // Marca tudo no Dia e volta sem recarregar.
  await hoje.getByRole('link', { name: 'Ver o dia' }).click()
  await page.getByRole('button', { name: 'Abrir Casa' }).click()
  await page.getByRole('checkbox', { name: 'Concluir Lavar o quintal' }).click()
  await page.getByRole('link', { name: 'Início' }).first().click()
  await expect(hoje.getByText('Falta 1 de 2.')).toBeVisible()
  await expect(barra).toHaveAttribute('aria-valuenow', '1')
  await expect(
    hoje.getByRole('list', { name: 'Grupos e tarefas soltas' }).getByRole('listitem'),
  ).toHaveText(['1 grupo', '1 tarefa solta'])
  await hoje.getByRole('link', { name: 'Ver o dia' }).click()
  await page.getByRole('checkbox', { name: 'Concluir Fazer curso' }).click()
  await page.getByRole('link', { name: 'Início' }).first().click()
  await expect(hoje.getByText('Tudo feito por hoje.')).toBeVisible()
  await expect(barra).toHaveAttribute('aria-valuenow', '2')
  await expect(hoje.getByText(/pendente/)).toHaveCount(0)
})

test('Hoje: "Ver o dia" abre o Dia de hoje; marcar no Dia atualiza sem recarregar', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearHoje(page)
  const hoje = bloco(page, 'Hoje')
  await expect(hoje.getByText('16 pendentes', { exact: true })).toBeVisible()
  await expect(hoje.getByText('Faltam 16 de 17.')).toBeVisible()
  await expect(
    hoje.getByRole('list', { name: 'Grupos e tarefas soltas' }).getByRole('listitem'),
  ).toHaveText(['3 grupos · 15 itens', '1 tarefa solta'])

  await hoje.getByRole('link', { name: 'Ver o dia' }).click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  const site = page.getByRole('region', { name: 'Grupo Site Poose' })
  await site.getByRole('button', { name: 'Abrir Site Poose' }).click()
  await site.getByRole('checkbox', { name: 'Concluir Rodapé' }).click()
  await page.getByRole('link', { name: 'Início' }).first().click()

  await expect(hoje.getByText('15 pendentes', { exact: true })).toBeVisible()
  await expect(hoje.getByText('Faltam 15 de 17.')).toBeVisible()
})

test('Atrasadas: frase com o mais antigo, contagem e "Ver atrasadas" abre o dia mais antigo', async ({
  page,
}) => {
  await page.goto('/inicio')
  await expect(bloco(page, 'Atrasadas').getByText('Tudo em dia')).toBeVisible()
  await semearAtrasadas(page)
  const atrasadas = bloco(page, 'Atrasadas')
  await expect(atrasadas.getByText('3 pendentes', { exact: true })).toBeVisible()
  await expect(atrasadas.getByText('3 itens atrasados, o mais antigo de 28/out')).toBeVisible()
  await expect(
    atrasadas.getByRole('list', { name: 'Grupos e tarefas soltas' }).getByRole('listitem'),
  ).toHaveText(['1 grupo', '1 tarefa solta'])
  await expect(atrasadas.getByRole('progressbar')).toHaveCount(0)

  await atrasadas.getByRole('link', { name: 'Ver atrasadas' }).click()
  await expect(page).toHaveURL(/\/dia\/2026-10-28$/)
  await expect(page.getByText('Renovar CNH')).toBeVisible()
})

test('Dia e Semana abrem com todos os grupos recolhidos, inclusive ao voltar', async ({ page }) => {
  await page.goto('/inicio')
  await semearHoje(page)

  await page.goto(`/dia/${HOJE}`)
  for (const titulo of ['Simulador POOSE', 'Site Poose', 'MemorIA']) {
    await expect(page.getByRole('button', { name: `Abrir ${titulo}` })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  }
  await page.getByRole('button', { name: 'Abrir MemorIA' }).click()
  await expect(page.getByRole('checkbox', { name: 'Concluir Resumo do Início' })).toBeVisible()
  await page.getByRole('link', { name: 'Próximo dia' }).click()
  await page.getByRole('link', { name: 'Dia anterior' }).click()
  await expect(page.getByRole('button', { name: 'Abrir MemorIA' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.getByRole('checkbox', { name: 'Concluir Resumo do Início' })).toBeHidden()

  await page.goto(`/semana/${HOJE}`)
  for (const titulo of ['Simulador POOSE', 'Site Poose', 'MemorIA']) {
    await expect(page.getByRole('button', { name: `Expandir ${titulo}` })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Expandir MemorIA' }).click()
  await expect(page.getByRole('button', { name: 'Recolher MemorIA' })).toBeVisible()
  await page.getByRole('link', { name: 'Próxima semana' }).click()
  await page.getByRole('link', { name: 'Semana anterior' }).click()
  await expect(page.getByRole('button', { name: 'Expandir MemorIA' })).toBeVisible()
  // Sair e voltar também recolhe.
  await page.getByRole('button', { name: 'Expandir MemorIA' }).click()
  await page.getByRole('link', { name: 'Início' }).first().click()
  await bloco(page, 'Hoje').waitFor()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Expandir MemorIA' })).toBeVisible()
})
