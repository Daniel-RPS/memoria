import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Aviso quando a tarefa solta perde a categoria ao entrar num grupo (arrastar, menu ⋯, lote),
 * com "Desfazer" que a devolve solta e com a categoria.
 */

const HOJE = '2026-11-05'

interface Modulos {
  criarCategoria: (dados: { nome: string }) => Promise<{ id: string }>
  criarGrupo: (dados: { titulo: string; data: string; categoryId?: string }) => Promise<{
    id: string
  }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  criarTarefa: (dados: { titulo: string; data: string; categoryId?: string }) => Promise<{
    id: string
  }>
}

async function semear(page: Page) {
  await page.evaluate(async (hoje) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho) as Promise<Modulos>
    const categorias = await importar('/src/db/repositories/category-repository.ts')
    const grupos = await importar('/src/db/repositories/group-repository.ts')
    const tarefas = await importar('/src/db/repositories/task-repository.ts')
    const ids: Record<string, string> = {}
    for (const nome of ['Trabalho', 'Casa', 'Estudos', 'Saúde']) {
      ids[nome] = (await categorias.criarCategoria({ nome })).id
    }
    const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: ids.Casa })
    await grupos.criarItem(casa.id, 'Lavar louça')
    const escritorio = await grupos.criarGrupo({
      titulo: 'Escritório',
      data: hoje,
      categoryId: ids.Trabalho,
    })
    await grupos.criarItem(escritorio.id, 'Imprimir')
    const soltas: [string, string | undefined][] = [
      ['Ligar para Fulano', ids.Trabalho],
      ['Revisar contrato', ids.Trabalho],
      ['Varrer', undefined],
      ['Ler capítulo', ids.Estudos],
      ['Marcar consulta', ids['Saúde']],
    ]
    for (const [titulo, categoryId] of soltas) {
      await tarefas.criarTarefa({ titulo, data: hoje, categoryId })
    }
  }, HOJE)
}

/** Categoria (nome) da tarefa solta com esse título; `null` se ela não é mais tarefa solta. */
async function categoriaDaSolta(page: Page, titulo: string) {
  return page.evaluate(async (procurado) => {
    interface Tabela<T> {
      toArray: () => Promise<T[]>
      get: (id: string) => Promise<T | undefined>
    }
    interface ModuloBanco {
      db: {
        tasks: Tabela<{ titulo: string; categoryId?: string }>
        categories: Tabela<{ nome: string }>
      }
    }
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const tarefa = (await db.tasks.toArray()).find((registro) => registro.titulo === procurado)
    if (!tarefa) return null
    if (!tarefa.categoryId) return ''
    return (await db.categories.get(tarefa.categoryId))?.nome ?? ''
  }, titulo)
}

const card = (page: Page, nome: string) => page.getByRole('region', { name: `Grupo ${nome}` })
const itemDoCard = (page: Page, grupo: string, titulo: string) =>
  card(page, grupo)
    .getByRole('list', { name: `Itens de ${grupo}` })
    .getByRole('listitem')
    .filter({
      hasText: titulo,
    })
const tarefaSolta = (page: Page, titulo: string) =>
  page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem').filter({ hasText: titulo })
const avisos = (page: Page) => page.locator('[data-sonner-toast]')

async function arrastarAte(page: Page, origem: Locator, alvo: Locator) {
  await page.waitForTimeout(400)
  const de = (await origem.boundingBox())!
  const para = (await alvo.boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 4 })
  await page.mouse.move(para.x + 30, para.y + para.height / 2, { steps: 20 })
  await page.mouse.up()
}

const alcaDe = (page: Page, titulo: string) =>
  tarefaSolta(page, titulo).getByRole('button', { name: `Mover ${titulo}`, exact: true })

test.setTimeout(120_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await expandirGrupos(page)
})

test('arrastar para grupo de outra categoria avisa; Desfazer devolve solta com a categoria', async ({
  page,
}) => {
  await arrastarAte(
    page,
    alcaDe(page, 'Ligar para Fulano'),
    itemDoCard(page, 'Casa', 'Lavar louça'),
  )

  await expect(itemDoCard(page, 'Casa', 'Ligar para Fulano')).toBeVisible()
  await expect(
    page.getByText('"Ligar para Fulano" foi para o grupo Casa e deixou a categoria Trabalho.'),
  ).toBeVisible()
  await page.screenshot({ path: 'e2e/capturas/categoria-no-grupo-aviso.png' })

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(tarefaSolta(page, 'Ligar para Fulano')).toBeVisible()
  await expect.poll(() => categoriaDaSolta(page, 'Ligar para Fulano')).toBe('Trabalho')
})

test('mover para grupo da mesma categoria: nenhum aviso', async ({ page }) => {
  await arrastarAte(
    page,
    alcaDe(page, 'Revisar contrato'),
    itemDoCard(page, 'Escritório', 'Imprimir'),
  )
  await expect(itemDoCard(page, 'Escritório', 'Revisar contrato')).toBeVisible()
  await page.waitForTimeout(500)
  await expect(avisos(page)).toHaveCount(0)
})

test('menu ⋯ "Colocar no grupo" com tarefa sem categoria: nenhum aviso', async ({ page }) => {
  await page.getByRole('button', { name: 'Mais ações para Varrer' }).click()
  await page.getByRole('menuitem', { name: 'Colocar no grupo' }).press('ArrowRight')
  await page.getByRole('menuitem', { name: 'Casa', exact: true }).press('Enter')
  await expect(itemDoCard(page, 'Casa', 'Varrer')).toBeVisible()
  await page.waitForTimeout(500)
  await expect(avisos(page)).toHaveCount(0)
})

test('3 selecionadas com categorias diferentes para um grupo: um aviso só; Desfazer restaura as 3', async ({
  page,
}) => {
  const titulos = ['Ligar para Fulano', 'Ler capítulo', 'Marcar consulta']
  for (const titulo of titulos) {
    await tarefaSolta(page, titulo)
      .getByRole('button', { name: titulo, exact: true })
      .click({ modifiers: ['Control'] })
  }
  await expect(page.getByRole('toolbar')).toContainText('3 selecionadas')

  await arrastarAte(page, alcaDe(page, 'Ler capítulo'), itemDoCard(page, 'Casa', 'Lavar louça'))

  for (const titulo of titulos) await expect(itemDoCard(page, 'Casa', titulo)).toBeVisible()
  await expect(page.getByText('3 tarefas deixaram suas categorias.')).toBeVisible()
  await expect(avisos(page)).toHaveCount(1)

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(() => categoriaDaSolta(page, 'Ligar para Fulano')).toBe('Trabalho')
  await expect.poll(() => categoriaDaSolta(page, 'Ler capítulo')).toBe('Estudos')
  await expect.poll(() => categoriaDaSolta(page, 'Marcar consulta')).toBe('Saúde')
})
