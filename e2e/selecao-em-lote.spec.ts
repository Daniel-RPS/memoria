import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Selecionar várias com Shift/Ctrl+clique (sem entrar no modo) e mover juntas: arrastar, Alt+↑/↓,
 * Semana, subetapas, barra de ações e Desfazer. Capturas em e2e/capturas/lote-<cenário>.png.
 */

const HOJE = '2026-11-05'
const GRUPO = 'Simulador POOSE'
const ITENS = Array.from({ length: 6 }, (_, indice) => `Item ${indice + 1}`)
const TAREFAS = ['Tarefa A', 'Tarefa B', 'Tarefa C']
const COLUNA_HOJE = 'quinta-feira, 5 de novembro'
const COLUNA_AMANHA = 'sexta-feira, 6 de novembro'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

interface ModuloSubetapas {
  criarSubtarefa: (dados: { taskId: string; titulo: string }) => Promise<unknown>
}

async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, grupo, itens, tarefas }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const soltas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const subetapas = (await importar(
        '/src/db/repositories/subtask-repository.ts',
      )) as ModuloSubetapas
      const card = await grupos.criarGrupo({ titulo: grupo, data: hoje })
      for (const titulo of itens) await grupos.criarItem(card.id, titulo)
      for (const titulo of tarefas) {
        const tarefa = await soltas.criarTarefa({ titulo, data: hoje })
        if (titulo === 'Tarefa A') {
          for (const sub of ['S1', 'S2', 'S3', 'S4']) {
            await subetapas.criarSubtarefa({ taskId: tarefa.id, titulo: sub })
          }
        }
      }
    },
    { hoje: HOJE, grupo: GRUPO, itens: ITENS, tarefas: TAREFAS },
  )
}

async function abrirDia(page: Page) {
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await expandirGrupos(page)
}

const itensDoCard = (page: Page) =>
  page
    .getByRole('region', { name: `Grupo ${GRUPO}` })
    .getByRole('list', { name: `Itens de ${GRUPO}` })
    .getByRole('listitem')
const itemDoCard = (page: Page, titulo: string) =>
  itensDoCard(page).filter({ hasText: new RegExp(`^${titulo}(?![0-9])`) })
const soltas = (page: Page) => page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem')
const tarefaSolta = (page: Page, titulo: string) => soltas(page).filter({ hasText: titulo })
const titulo = (linha: Locator, nome: string) =>
  linha.getByRole('button', { name: nome, exact: true })

async function ordemDosItens(page: Page) {
  await expect(itensDoCard(page)).toHaveCount(ITENS.length)
  return itensDoCard(page).evaluateAll((linhas) =>
    linhas.map((linha) => /Item \d+/.exec(linha.textContent ?? '')?.[0] ?? ''),
  )
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/lote-${nome}.png`, fullPage: true })
}

async function definirTema(page: Page, tema: 'claro' | 'escuro') {
  await page.evaluate((valor) => window.localStorage.setItem('memoria:tema', valor), tema)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
}

/** Arrasta pela alça até o meio da linha `alvo` e solta. */
async function arrastarAte(
  page: Page,
  origem: Locator,
  alvo: Locator,
  onde: 'topo' | 'meio' | 'acima' = 'topo',
) {
  await page.waitForTimeout(400)
  const de = (await origem.boundingBox())!
  const para = (await alvo.boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 4 })
  // Solta pelo alto da linha de destino: o bloco entra antes dela.
  const y = onde === 'topo' ? para.y + 4 : onde === 'acima' ? para.y - 8 : para.y + para.height / 2
  await page.mouse.move(para.x + 30, y, { steps: 20 })
  await page.mouse.up()
}

test.setTimeout(120_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
})

test.describe('seleção em lote', () => {
  test('Shift+clique do 2º ao 4º: 3 selecionadas; arrastar para o topo; Ctrl+Z volta', async ({
    page,
  }) => {
    await abrirDia(page)
    await capturar(page, 'antes-claro')
    await titulo(itemDoCard(page, 'Item 2'), 'Item 2').click({ modifiers: ['Control'] })
    await titulo(itemDoCard(page, 'Item 4'), 'Item 4').click({ modifiers: ['Shift'] })

    await expect(page.locator('[data-selecionada]')).toHaveCount(3)
    await expect(page.getByRole('toolbar')).toContainText('3 selecionadas')
    await capturar(page, 'selecionadas-claro')

    // Arrasta qualquer uma das 3 para o topo: vão juntas, na ordem, e a prévia diz "3 tarefas".
    const alca = itemDoCard(page, 'Item 3').getByRole('button', { name: 'Mover Item 3' })
    const de = (await alca.boundingBox())!
    const para = (await itemDoCard(page, 'Item 1').boundingBox())!
    await page.waitForTimeout(400)
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
    await page.mouse.down()
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 - 6, { steps: 4 })
    await page.mouse.move(para.x + 30, para.y + 4, { steps: 20 })
    await expect(page.getByText('3 tarefas', { exact: true })).toBeVisible()
    // Sem mover o mouse nem redimensionar (captura da página inteira cancelaria o arrasto).
    await page.screenshot({ path: 'e2e/capturas/lote-arrastando-claro.png' })
    await page.mouse.up()

    await expect
      .poll(() => ordemDosItens(page))
      .toEqual(['Item 2', 'Item 3', 'Item 4', 'Item 1', 'Item 5', 'Item 6'])
    await expect(page.getByText('3 tarefas movidas')).toBeVisible()
    await capturar(page, 'depois-claro')

    await page.keyboard.press('Control+z')
    await expect.poll(() => ordemDosItens(page)).toEqual(ITENS)
  })

  test('Ctrl+clique soma/tira; Shift+clique não marca como concluída; a caixa só conclui; Esc e clique fora limpam', async ({
    page,
  }) => {
    await abrirDia(page)
    await titulo(tarefaSolta(page, 'Tarefa B'), 'Tarefa B').click({ modifiers: ['Control'] })
    await titulo(tarefaSolta(page, 'Tarefa C'), 'Tarefa C').click({ modifiers: ['Control'] })
    await expect(page.getByRole('toolbar')).toContainText('2 selecionadas')
    await titulo(tarefaSolta(page, 'Tarefa C'), 'Tarefa C').click({ modifiers: ['Control'] })
    await expect(page.getByRole('toolbar')).toContainText('1 selecionada')

    // A caixa de concluir continua só concluindo (não seleciona).
    await tarefaSolta(page, 'Tarefa A')
      .getByRole('checkbox', { name: 'Concluir Tarefa A' })
      .click({
        modifiers: ['Control'],
      })
    await expect(page.getByRole('toolbar')).toContainText('1 selecionada')
    // Concluída, ela sai da lista (vai para "Concluídas"): a caixa só concluiu.
    await expect(page.getByRole('checkbox', { name: 'Concluir Tarefa A' })).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('toolbar')).toHaveCount(0)
    await expect(page.locator('[data-selecionada]')).toHaveCount(0)

    // Clique fora (no cabeçalho da página) também limpa.
    await titulo(itemDoCard(page, 'Item 1'), 'Item 1').click({ modifiers: ['Control'] })
    await expect(page.getByRole('toolbar')).toBeVisible()
    await page.getByRole('heading', { level: 1 }).click()
    await expect(page.getByRole('toolbar')).toHaveCount(0)
  })

  test('Alt+↑ e Alt+↓ sobem e descem as selecionadas uma posição; Desfazer volta', async ({
    page,
  }) => {
    await abrirDia(page)
    await titulo(itemDoCard(page, 'Item 3'), 'Item 3').click({ modifiers: ['Control'] })
    await titulo(itemDoCard(page, 'Item 4'), 'Item 4').click({ modifiers: ['Control'] })

    await page.keyboard.press('Alt+ArrowUp')
    await expect
      .poll(() => ordemDosItens(page))
      .toEqual(['Item 1', 'Item 3', 'Item 4', 'Item 2', 'Item 5', 'Item 6'])
    await page.keyboard.press('Alt+ArrowDown')
    await expect.poll(() => ordemDosItens(page)).toEqual(ITENS)
    await page.keyboard.press('Alt+ArrowDown')
    await expect
      .poll(() => ordemDosItens(page))
      .toEqual(['Item 1', 'Item 2', 'Item 5', 'Item 3', 'Item 4', 'Item 6'])
    // Ctrl+Z desfaz o último movimento.
    await page.keyboard.press('Control+z')
    await expect.poll(() => ordemDosItens(page)).toEqual(ITENS)
  })

  test('barra de ações: Prioridade, Adiar e Arquivar valem para todas as selecionadas', async ({
    page,
  }) => {
    await abrirDia(page)
    await titulo(tarefaSolta(page, 'Tarefa A'), 'Tarefa A').click({ modifiers: ['Control'] })
    await titulo(tarefaSolta(page, 'Tarefa B'), 'Tarefa B').click({ modifiers: ['Control'] })
    await page.getByRole('button', { name: 'Prioridade', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Prioridade' })).toHaveCount(2)

    await titulo(tarefaSolta(page, 'Tarefa A'), 'Tarefa A').click({ modifiers: ['Control'] })
    await titulo(tarefaSolta(page, 'Tarefa B'), 'Tarefa B').click({ modifiers: ['Control'] })
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByText('2 itens arquivados')).toBeVisible()
    await expect(tarefaSolta(page, 'Tarefa A')).toHaveCount(0)
    await expect(tarefaSolta(page, 'Tarefa B')).toHaveCount(0)
    await page.keyboard.press('Control+z')
    await expect(tarefaSolta(page, 'Tarefa A')).toHaveCount(1)
  })

  test('subetapas: Shift+clique seleciona várias da mesma tarefa e reordena juntas; não mistura com tarefas', async ({
    page,
  }) => {
    await abrirDia(page)
    await tarefaSolta(page, 'Tarefa A')
      .getByRole('button', { name: /^Subetapas de Tarefa A/ })
      .click()
    const subs = tarefaSolta(page, 'Tarefa A').getByRole('list', { name: 'Subetapas de Tarefa A' })
    const nomes = () =>
      subs
        .getByRole('listitem')
        .evaluateAll((linhas) =>
          linhas.map((linha) => /S\d/.exec(linha.textContent ?? '')?.[0] ?? ''),
        )
    expect(await nomes()).toEqual(['S1', 'S2', 'S3', 'S4'])

    await titulo(subs, 'S3').click({ modifiers: ['Control'] })
    await titulo(subs, 'S4').click({ modifiers: ['Shift'] })
    await expect(page.getByRole('toolbar')).toContainText('2 subetapas selecionadas')

    await page.keyboard.press('Alt+ArrowUp')
    await expect.poll(nomes).toEqual(['S1', 'S3', 'S4', 'S2'])
    await page.keyboard.press('Control+z')
    await expect.poll(nomes).toEqual(['S1', 'S2', 'S3', 'S4'])

    // Arrastar uma das duas leva as duas juntas para o topo.
    await arrastarAte(
      page,
      subs.getByRole('button', { name: 'Mover S4' }),
      subs.getByRole('listitem').first(),
      'acima',
    )
    await expect.poll(nomes).toEqual(['S3', 'S4', 'S1', 'S2'])
    await expect(page.getByText('2 subetapas movidas')).toBeVisible()

    // Selecionar uma tarefa troca a seleção de subetapas (não se misturam).
    await titulo(tarefaSolta(page, 'Tarefa B'), 'Tarefa B').click({ modifiers: ['Control'] })
    await expect(page.getByRole('toolbar')).toContainText('1 selecionada')
    await expect(page.locator('[data-alvo-subetapa][data-selecionada]')).toHaveCount(0)
  })

  test('Semana: 2 tarefas com Ctrl+clique arrastadas para outro dia vão juntas; Desfazer', async ({
    page,
  }) => {
    await page.goto(`/semana/${HOJE}`)
    const hoje = page.getByRole('region', { name: COLUNA_HOJE })
    const amanha = page.getByRole('region', { name: COLUNA_AMANHA })
    await expect(hoje.getByRole('link', { name: 'Tarefa B' })).toBeVisible()

    await hoje.getByRole('link', { name: 'Tarefa B' }).click({ modifiers: ['Control'] })
    await hoje.getByRole('link', { name: 'Tarefa C' }).click({ modifiers: ['Control'] })
    await expect(page.getByRole('toolbar')).toContainText('2 selecionadas')
    await expect(page).toHaveURL(new RegExp(`/semana/${HOJE}`))
    await capturar(page, 'semana-selecionadas-claro')

    const de = (await hoje.getByRole('link', { name: 'Tarefa B' }).boundingBox())!
    const para = (await amanha.getByRole('list', { name: /^Pendentes de / }).boundingBox())!
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
    await page.mouse.down()
    await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
    await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 60), {
      steps: 20,
    })
    await expect(page.getByText('2 tarefas', { exact: true })).toBeVisible()
    await page.mouse.up()

    await expect(amanha.getByRole('link', { name: 'Tarefa B' })).toBeVisible()
    await expect(amanha.getByRole('link', { name: 'Tarefa C' })).toBeVisible()
    await expect(hoje.getByRole('link', { name: 'Tarefa A' })).toBeVisible()
    await expect(hoje.getByRole('link', { name: 'Tarefa B' })).toHaveCount(0)

    await page.keyboard.press('Control+z')
    await expect(hoje.getByRole('link', { name: 'Tarefa B' })).toBeVisible()
    await expect(hoje.getByRole('link', { name: 'Tarefa C' })).toBeVisible()

    await definirTema(page, 'escuro')
    await page.goto(`/semana/${HOJE}`)
    await page
      .getByRole('region', { name: COLUNA_HOJE })
      .getByRole('link', { name: 'Tarefa A' })
      .click({ modifiers: ['Control'] })
    await capturar(page, 'semana-selecionadas-escuro')
  })
})
