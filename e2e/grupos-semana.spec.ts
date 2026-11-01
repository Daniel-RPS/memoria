import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Arrastar de verdade na visão Semana: o card leva todos os pendentes; a alça ⋮⋮ leva só o
 * item; levar de volta desfaz a transferência (sem duplicata nem card fantasma).
 * Capturas em e2e/capturas/ (antes e depois de cada cenário).
 */

const SEGUNDA = '2026-11-02'
const COLUNA_2 = 'segunda-feira, 2 de novembro'
const COLUNA_3 = 'terça-feira, 3 de novembro'
const JANTA = 'Fazer janta das crianças'
const BANHO = 'Dar banho'

interface RegistroDoBanco {
  data: string
  itens: string[]
}

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<unknown>
}

interface ModuloBanco {
  db: {
    groupCards: { toArray: () => Promise<{ id: string; data: string }[]> }
    groupItems: {
      toArray: () => Promise<{ cardId: string; titulo: string; status: string; ordem: number }[]>
    }
  }
}

/** Cria o card "Casa" de segunda com dois pendentes, pelos módulos do próprio app. */
async function semearCasa(page: Page) {
  await page.evaluate(
    async ({ data, itens }) => {
      const caminho = '/src/db/repositories/group-repository.ts'
      const grupos = (await import(/* @vite-ignore */ caminho)) as ModuloGrupos
      const card = await grupos.criarGrupo({ titulo: 'Casa', data })
      for (const titulo of itens) await grupos.criarItem(card.id, titulo)
    },
    { data: SEGUNDA, itens: [JANTA, BANHO] },
  )
}

/** Cards no banco, por dia, com os itens: `{ data, itens: ['[ ] Dar banho'] }`. */
async function lerBanco(page: Page): Promise<RegistroDoBanco[]> {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const marca: Record<string, string> = {
      pendente: '[ ]',
      concluido: '[x]',
      transferido: '[→]',
      arquivado: '[a]',
    }
    const [cards, itens] = await Promise.all([db.groupCards.toArray(), db.groupItems.toArray()])
    return cards
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((card) => ({
        data: card.data,
        itens: itens
          .filter((item) => item.cardId === card.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => `${marca[item.status]} ${item.titulo}`),
      }))
  })
}

function coluna(page: Page, nome: string) {
  return page.getByRole('region', { name: nome })
}

function cabecalhoDoCard(colunaDoDia: Locator) {
  return colunaDoDia.getByRole('button', { name: /^Grupo Casa, / })
}

/** Aperta em `origem`, anda em passos até o meio da lista de `destino` e (antes de soltar) chama `noMeio`. */
async function arrastar(
  page: Page,
  origem: Locator,
  destino: Locator,
  noMeio?: () => Promise<void>,
) {
  const de = (await origem.boundingBox())!
  const para = (await destino.getByRole('list', { name: /^Pendentes de / }).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  // Passa da distância mínima (4 px) antes de seguir para o destino.
  await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 60), {
    steps: 20,
  })
  if (noMeio) await noMeio()
  await page.mouse.up()
}

function itensDoCard(colunaDoDia: Locator) {
  return colunaDoDia.getByRole('list', { name: 'Itens de Casa' }).getByRole('listitem')
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/${nome}.png` })
}

test.beforeEach(async ({ page }) => {
  // Segunda, 2/11/2026: a semana aberta vai de 2 a 8 de novembro.
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCasa(page)
  await expect(cabecalhoDoCard(coluna(page, COLUNA_2))).toBeVisible()
})

test('arrastar o card pelo cabeçalho leva os 2 pendentes; arrastar de volta não deixa fantasma', async ({
  page,
}) => {
  await capturar(page, '1-grupo-antes')

  await arrastar(
    page,
    cabecalhoDoCard(coluna(page, COLUNA_2)),
    coluna(page, COLUNA_3),
    async () => {
      await expect(page.getByText('Casa · 2 pendentes → 03/11', { exact: true })).toBeVisible()
      await capturar(page, '1-grupo-durante')
    },
  )

  await expect(page.getByText('2 itens levados para amanhã')).toBeVisible()
  const itens3 = coluna(page, COLUNA_3).getByRole('list', { name: 'Itens de Casa' })
  // As cópias mostram de quando são: "desde 02/11".
  await expect(itens3.getByRole('listitem')).toHaveText([
    `${JANTA}desde 02/11`,
    `${BANHO}desde 02/11`,
  ])
  await capturar(page, '1-grupo-depois-ida')
  expect(await lerBanco(page)).toEqual([
    { data: SEGUNDA, itens: [`[→] ${JANTA}`, `[→] ${BANHO}`] },
    { data: '2026-11-03', itens: [`[ ] ${JANTA}`, `[ ] ${BANHO}`] },
  ])

  await arrastar(page, cabecalhoDoCard(coluna(page, COLUNA_3)), coluna(page, COLUNA_2))

  await expect(cabecalhoDoCard(coluna(page, COLUNA_3))).toHaveCount(0)
  await expect(
    coluna(page, COLUNA_2).getByRole('list', { name: 'Itens de Casa' }).getByRole('listitem'),
  ).toHaveText([JANTA, BANHO])
  await capturar(page, '1-grupo-depois-volta')
  expect(await lerBanco(page)).toEqual([{ data: SEGUNDA, itens: [`[ ] ${JANTA}`, `[ ] ${BANHO}`] }])
})

test('arrastar pela alça do item leva só ele; trazer de volta não duplica', async ({ page }) => {
  const linhaJanta = itensDoCard(coluna(page, COLUNA_2)).filter({ hasText: JANTA })
  await linhaJanta.hover()
  await capturar(page, '2-item-antes')

  const alca = coluna(page, COLUNA_2).getByRole('button', {
    name: `Arrastar ${JANTA}. Espaço para mudar a posição ou levar só este item a outro dia.`,
  })
  await arrastar(page, alca, coluna(page, COLUNA_3), async () => {
    await expect(page.getByText(`${JANTA} → 03/11`, { exact: true })).toBeVisible()
  })

  await expect(page.getByText('1 item levado para amanhã')).toBeVisible()
  await capturar(page, '2-item-depois-ida')
  expect(await lerBanco(page)).toEqual([
    { data: SEGUNDA, itens: [`[→] ${JANTA}`, `[ ] ${BANHO}`] },
    { data: '2026-11-03', itens: [`[ ] ${JANTA}`] },
  ])

  const linhaNoDia3 = itensDoCard(coluna(page, COLUNA_3)).filter({ hasText: JANTA })
  await linhaNoDia3.hover()
  await arrastar(
    page,
    coluna(page, COLUNA_3).getByRole('button', { name: new RegExp(`^Arrastar ${JANTA}`) }),
    coluna(page, COLUNA_2),
  )

  await expect(cabecalhoDoCard(coluna(page, COLUNA_3))).toHaveCount(0)
  await capturar(page, '2-item-depois-volta')
  expect(await lerBanco(page)).toEqual([{ data: SEGUNDA, itens: [`[ ] ${JANTA}`, `[ ] ${BANHO}`] }])
})

test('apertar num item (fora da alça) não arrasta o card', async ({ page }) => {
  const texto = coluna(page, COLUNA_2).getByText(BANHO)
  await arrastar(page, texto, coluna(page, COLUNA_3))

  await expect(cabecalhoDoCard(coluna(page, COLUNA_3))).toHaveCount(0)
  expect(await lerBanco(page)).toEqual([{ data: SEGUNDA, itens: [`[ ] ${JANTA}`, `[ ] ${BANHO}`] }])
})

test('Ctrl+Z desfaz o arrasto do card', async ({ page }) => {
  await arrastar(page, cabecalhoDoCard(coluna(page, COLUNA_2)), coluna(page, COLUNA_3))
  await expect(page.getByText('2 itens levados para amanhã')).toBeVisible()
  await capturar(page, '3-desfazer-antes')

  await page.keyboard.press('Control+z')

  await expect(cabecalhoDoCard(coluna(page, COLUNA_3))).toHaveCount(0)
  await expect(page.getByText('2 itens levados para amanhã')).toHaveCount(0)
  await capturar(page, '3-desfazer-depois')
  expect(await lerBanco(page)).toEqual([{ data: SEGUNDA, itens: [`[ ] ${JANTA}`, `[ ] ${BANHO}`] }])
})

test('a alça do item, solta no próprio card, só muda a posição dele', async ({ page }) => {
  const itens = itensDoCard(coluna(page, COLUNA_2))
  await itens.filter({ hasText: BANHO }).hover()
  await capturar(page, '4-reordenar-antes')
  const alca = coluna(page, COLUNA_2).getByRole('button', {
    name: new RegExp(`^Arrastar ${BANHO}`),
  })
  const de = (await alca.boundingBox())!
  const alvo = (await itens.filter({ hasText: JANTA }).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y - 6, { steps: 4 })
  await page.mouse.move(de.x + de.width / 2, alvo.y + 2, { steps: 12 })
  await page.mouse.up()

  await expect(itens).toHaveText([BANHO, JANTA])
  await capturar(page, '4-reordenar-depois')
  expect(await lerBanco(page)).toEqual([{ data: SEGUNDA, itens: [`[ ] ${BANHO}`, `[ ] ${JANTA}`] }])
})
