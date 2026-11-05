import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Ordem de exibição: prioridade e em andamento sobem para o topo do grupo e das tarefas soltas
 * (prioridade+andamento, andamento, prioridade, demais), parar/tirar volta ao lugar, e arrastar
 * dentro de um bloco do topo reordena só ele. Capturas em e2e/capturas/ordem-<cenário>.png.
 */

const HOJE = '2026-11-05'
const GRUPO = 'Simulador POOSE'
const ITENS = Array.from({ length: 10 }, (_, indice) => `Item ${indice + 1}`)
const TAREFAS = ['Tarefa A', 'Tarefa B', 'Tarefa C']
const COLUNA_HOJE = 'quinta-feira, 5 de novembro'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, grupo, itens, tarefas }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const soltas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const card = await grupos.criarGrupo({ titulo: grupo, data: hoje })
      for (const titulo of itens) await grupos.criarItem(card.id, titulo)
      for (const titulo of tarefas) await soltas.criarTarefa({ titulo, data: hoje })
    },
    { hoje: HOJE, grupo: GRUPO, itens: ITENS, tarefas: TAREFAS },
  )
}

async function abrirDia(page: Page) {
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await expandirGrupos(page)
}

function itensDoCard(page: Page) {
  return page
    .getByRole('region', { name: `Grupo ${GRUPO}` })
    .getByRole('list', { name: `Itens de ${GRUPO}` })
    .getByRole('listitem')
}

function itemDoCard(page: Page, titulo: string) {
  return itensDoCard(page).filter({ hasText: new RegExp(`^${titulo}(?![0-9])`) })
}

function soltas(page: Page) {
  return page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem')
}

async function escolherNoMenu(page: Page, linha: Locator, titulo: string, opcao: string) {
  await linha.getByRole('button', { name: `Mais ações para ${titulo}` }).click()
  await page.getByRole('menuitem', { name: opcao, exact: true }).click()
}

const andamento = (page: Page, titulo: string) =>
  escolherNoMenu(page, itemDoCard(page, titulo), titulo, 'Marcar como em andamento')
const pararAndamento = (page: Page, titulo: string) =>
  escolherNoMenu(page, itemDoCard(page, titulo), titulo, 'Parar andamento')
const prioridade = (page: Page, titulo: string) =>
  escolherNoMenu(page, itemDoCard(page, titulo), titulo, 'Marcar como prioridade')
const tirarPrioridade = (page: Page, titulo: string) =>
  escolherNoMenu(page, itemDoCard(page, titulo), titulo, 'Tirar prioridade')

/** Os títulos, na ordem, dos primeiros `quantidade` itens do card. */
async function primeiros(page: Page, quantidade: number) {
  await expect(itensDoCard(page)).toHaveCount(ITENS.length)
  const titulos = await itensDoCard(page).evaluateAll((linhas) =>
    linhas.map((linha) => /Item \d+/.exec(linha.textContent ?? '')?.[0] ?? ''),
  )
  return titulos.slice(0, quantidade)
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/ordem-${nome}.png`, fullPage: true })
}

async function definirTema(page: Page, tema: 'claro' | 'escuro') {
  await page.evaluate((valor) => window.localStorage.setItem('memoria:tema', valor), tema)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
}

/** Arrasta pela alça `origem` até o meio da linha `alvo` e solta. */
async function arrastarAte(page: Page, origem: Locator, alvo: Locator) {
  // A animação de subir/descer (~200 ms) precisa ter acabado para medir as posições.
  await page.waitForTimeout(400)
  const de = (await origem.boundingBox())!
  const para = (await alvo.boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 4 })
  await page.mouse.move(para.x + 30, para.y + para.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.setTimeout(90_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
})

test.describe('ordem de exibição', () => {
  test('o 8º item como prioridade sobe para logo abaixo dos em andamento (Dia e Semana)', async ({
    page,
  }) => {
    await abrirDia(page)
    await andamento(page, 'Item 2')
    await andamento(page, 'Item 3')
    await capturar(page, 'dia-antes-claro')
    await prioridade(page, 'Item 8')

    await expect
      .poll(() => primeiros(page, 6))
      .toEqual(['Item 2', 'Item 3', 'Item 8', 'Item 1', 'Item 4', 'Item 5'])
    await capturar(page, 'dia-depois-claro')

    for (const tema of ['claro', 'escuro'] as const) {
      await definirTema(page, tema)
      await page.goto(`/semana/${HOJE}`)
      await expandirGrupos(page)
      const coluna = page.getByRole('region', { name: COLUNA_HOJE })
      const lista = coluna.getByRole('list', { name: `Itens de ${GRUPO}` }).getByRole('listitem')
      await expect(lista).toHaveCount(ITENS.length)
      const ordem = await lista.evaluateAll((linhas) =>
        linhas.map((linha) => /Item \d+/.exec(linha.textContent ?? '')?.[0] ?? ''),
      )
      expect(ordem.slice(0, 4)).toEqual(['Item 2', 'Item 3', 'Item 8', 'Item 1'])
      await capturar(page, `semana-${tema}`)
    }
  })

  test('prioridade+andamento fica em primeiro; tirar a prioridade desce para o bloco em andamento', async ({
    page,
  }) => {
    await abrirDia(page)
    await andamento(page, 'Item 1')
    await andamento(page, 'Item 2')
    await prioridade(page, 'Item 5')
    await andamento(page, 'Item 5')
    await expect.poll(() => primeiros(page, 4)).toEqual(['Item 5', 'Item 1', 'Item 2', 'Item 3'])

    await tirarPrioridade(page, 'Item 5')
    await expect.poll(() => primeiros(page, 4)).toEqual(['Item 1', 'Item 2', 'Item 5', 'Item 3'])
  })

  test('o 7º item em andamento vai para o topo; parar volta para a 7ª posição', async ({
    page,
  }) => {
    await abrirDia(page)
    await andamento(page, 'Item 7')
    await expect.poll(async () => (await primeiros(page, 3))[0]).toBe('Item 7')

    await pararAndamento(page, 'Item 7')
    await expect.poll(() => primeiros(page, 10)).toEqual(ITENS)
  })

  test('arrastar dentro do bloco do topo reordena só ele; nos demais, o solto não atravessa o bloco', async ({
    page,
  }) => {
    await abrirDia(page)
    await andamento(page, 'Item 2')
    await andamento(page, 'Item 3')
    await expect.poll(() => primeiros(page, 3)).toEqual(['Item 2', 'Item 3', 'Item 1'])

    // Item 3 para o topo do bloco em andamento.
    await arrastarAte(
      page,
      itemDoCard(page, 'Item 3').getByRole('button', { name: 'Mover Item 3' }),
      itemDoCard(page, 'Item 2'),
    )
    await expect.poll(() => primeiros(page, 3)).toEqual(['Item 3', 'Item 2', 'Item 1'])
    await page.reload()
    await expandirGrupos(page)
    await expect.poll(() => primeiros(page, 3)).toEqual(['Item 3', 'Item 2', 'Item 1'])

    // Item 9 arrastado para cima do bloco do topo: para logo abaixo dele (ordem entre os demais).
    await arrastarAte(
      page,
      itemDoCard(page, 'Item 9').getByRole('button', { name: 'Mover Item 9' }),
      itemDoCard(page, 'Item 3'),
    )
    await expect
      .poll(async () => (await primeiros(page, 5)).slice(0, 2))
      .toEqual(['Item 3', 'Item 2'])
    const depois = await primeiros(page, 10)
    expect(depois.slice(0, 2)).toEqual(['Item 3', 'Item 2'])
    expect(depois.indexOf('Item 9')).toBeGreaterThanOrEqual(2)

    // Parar o andamento do Item 3: a posição arrastada deixa de valer e ele volta ao lugar.
    await pararAndamento(page, 'Item 3')
    const final = await primeiros(page, 10)
    expect(final[0]).toBe('Item 2')
    expect(final.indexOf('Item 3')).toBeLessThan(final.indexOf('Item 4'))
  })

  test('tarefas soltas: prioridade e andamento sobem; sem marca voltam ao lugar', async ({
    page,
  }) => {
    await abrirDia(page)
    const titulosSoltas = () =>
      soltas(page).evaluateAll((linhas) =>
        linhas.map((linha) => /Tarefa [A-C]/.exec(linha.textContent ?? '')?.[0] ?? ''),
      )
    expect(await titulosSoltas()).toEqual(TAREFAS)

    await escolherNoMenu(
      page,
      soltas(page).filter({ hasText: 'Tarefa C' }),
      'Tarefa C',
      'Marcar como prioridade',
    )
    await expect.poll(titulosSoltas).toEqual(['Tarefa C', 'Tarefa A', 'Tarefa B'])
    await escolherNoMenu(
      page,
      soltas(page).filter({ hasText: 'Tarefa B' }),
      'Tarefa B',
      'Marcar como em andamento',
    )
    await expect.poll(titulosSoltas).toEqual(['Tarefa B', 'Tarefa C', 'Tarefa A'])
    await capturar(page, 'soltas-claro')

    await escolherNoMenu(
      page,
      soltas(page).filter({ hasText: 'Tarefa B' }),
      'Tarefa B',
      'Parar andamento',
    )
    await escolherNoMenu(
      page,
      soltas(page).filter({ hasText: 'Tarefa C' }),
      'Tarefa C',
      'Tirar prioridade',
    )
    await expect.poll(titulosSoltas).toEqual(TAREFAS)
  })
})
