import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

const HOJE = '2026-11-13'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    groupItems: {
      toArray: () => Promise<{ id: string; cardId: string; titulo: string; ordem: number }[]>
    }
  }
}

async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const card = await grupos.criarGrupo({ titulo: 'Projeto Teste', data: hoje })
      await grupos.criarItem(card.id, 'Item A')
      await grupos.criarItem(card.id, 'Item B')
      await grupos.criarItem(card.id, 'Item C')
    },
    { hoje: HOJE },
  )
}

async function lerItensNoBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const itens = await db.groupItems.toArray()
    return itens.sort((a, b) => a.ordem - b.ordem).map((i) => i.titulo)
  })
}

async function arrastarAte(page: Page, origem: Locator, alvo: Locator) {
  await page.waitForTimeout(300)
  const de = (await origem.boundingBox())!
  const para = (await alvo.boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + para.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.describe('arrasto de itens dentro do grupo', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
    await page.goto(`/dia/${HOJE}`)
    await semear(page)
  })

  test('Lista: descer o 1º item fica em 2º e persiste após recarregar', async ({ page }) => {
    await page.goto(`/dia/${HOJE}`)
    await expandirGrupos(page)

    const itens = page.getByRole('list', { name: 'Itens de Projeto Teste' }).getByRole('listitem')
    await expect(itens).toHaveCount(3)

    const alcaPrimeiro = page.getByRole('button', { name: 'Mover Item A' })
    const alvoSegundo = itens.nth(1)

    await arrastarAte(page, alcaPrimeiro, alvoSegundo)

    await expect.poll(async () => lerItensNoBanco(page)).toEqual(['Item B', 'Item A', 'Item C'])

    await page.reload()
    await expandirGrupos(page)
    const titulos = await page
      .getByRole('list', { name: 'Itens de Projeto Teste' })
      .getByRole('listitem')
      .evaluateAll((linhas) =>
        linhas.map((l) => /Item [A-C]/.exec(l.textContent ?? '')?.[0] ?? ''),
      )
    expect(titulos).toEqual(['Item B', 'Item A', 'Item C'])
  })

  test('Colunas: subir o 3º item fica em 2º', async ({ page }) => {
    await page.goto(`/dia/${HOJE}`)
    await page.getByRole('button', { name: 'Colunas' }).click()
    await expandirGrupos(page)

    const itens = page.getByRole('list', { name: 'Itens de Projeto Teste' }).getByRole('listitem')
    await expect(itens).toHaveCount(3)

    const alcaTerceiro = page.getByRole('button', { name: 'Mover Item C' })
    const alvoSegundo = itens.nth(1)

    await arrastarAte(page, alcaTerceiro, alvoSegundo)

    await expect.poll(async () => lerItensNoBanco(page)).toEqual(['Item A', 'Item C', 'Item B'])
  })

  test('Cartões: trocar a posição de dois cartões de itens do mesmo grupo', async ({ page }) => {
    await page.goto(`/dia/${HOJE}`)
    await page.getByRole('button', { name: 'Cartões' }).click()

    const cartaoGrupo = page.getByRole('article', { name: 'Grupo Projeto Teste' })
    await expect(cartaoGrupo).toBeVisible()

    const itemA = cartaoGrupo.locator('.group\\/linha').filter({ hasText: 'Item A' })
    const itemB = cartaoGrupo.locator('.group\\/linha').filter({ hasText: 'Item B' })

    await arrastarAte(page, itemA, itemB)

    await expect.poll(async () => lerItensNoBanco(page)).toEqual(['Item B', 'Item A', 'Item C'])
  })

  test('Semana: reordenar dois itens de um grupo', async ({ page }) => {
    await page.goto(`/semana/${HOJE}`)
    await expandirGrupos(page)

    const lista = page.getByRole('list', { name: 'Itens de Projeto Teste' })
    await expect(lista.getByRole('listitem')).toHaveCount(3)

    const alcaB = page.getByRole('button', { name: /^Arrastar Item B/ })
    const alvoA = lista.getByRole('listitem').filter({ hasText: 'Item A' })

    await arrastarAte(page, alcaB, alvoA)

    await expect.poll(async () => lerItensNoBanco(page)).toEqual(['Item B', 'Item A', 'Item C'])
  })
})
