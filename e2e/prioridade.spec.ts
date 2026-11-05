import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Prioridade (bandeira) em tarefa solta e item de grupo: menu ⋯, tecla P, bandeira no Dia, na
 * Semana e no grupo recolhido; mantida ao arrastar para outro dia; some ao concluir.
 * Capturas em e2e/capturas/prioridade-<cenário>.png (claro e escuro).
 */

const HOJE = '2026-11-05'
const GRUPO = 'Simulador POOSE'
const ITENS = [
  'Junção de mesas em nº ímpar',
  'Cálculo de ranking',
  'Exportar relatório',
  'Revisar permissões',
  'Validar importação',
  'Conferir backup',
  'Atualizar documentação',
  'Ajustar contraste',
]
const OITAVO = ITENS[7]
const TAREFA = 'Revisar relatório'
const OUTRA_TAREFA = 'Ligar para o dentista'
const COLUNA_HOJE = 'quinta-feira, 5 de novembro'
const COLUNA_AMANHA = 'sexta-feira, 6 de novembro'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    tasks: { toArray: () => Promise<{ titulo: string; prioridade?: boolean; data: string }[]> }
    groupItems: {
      toArray: () => Promise<{ titulo: string; prioridade?: boolean; status: string }[]>
    }
  }
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
    { hoje: HOJE, grupo: GRUPO, itens: ITENS, tarefas: [TAREFA, OUTRA_TAREFA] },
  )
}

/** Títulos de tarefas soltas e de itens que estão como prioridade no banco. */
async function prioritariosNoBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [tarefas, itens] = await Promise.all([db.tasks.toArray(), db.groupItems.toArray()])
    return [...tarefas, ...itens]
      .filter((registro) => registro.prioridade === true)
      .map((registro) => registro.titulo)
      .sort()
  })
}

async function abrirDia(page: Page) {
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await expandirGrupos(page)
}

function cardDoGrupo(page: Page) {
  return page.getByRole('region', { name: `Grupo ${GRUPO}` })
}

function itemDoGrupo(page: Page, titulo: string) {
  return cardDoGrupo(page).getByRole('listitem').filter({ hasText: titulo }).first()
}

function tarefaSolta(page: Page, titulo: string) {
  return page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem').filter({
    hasText: titulo,
  })
}

async function escolherNoMenu(page: Page, linha: Locator, titulo: string, opcao: string) {
  await linha.getByRole('button', { name: `Mais ações para ${titulo}` }).click()
  await page.getByRole('menuitem', { name: opcao, exact: true }).click()
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/prioridade-${nome}.png`, fullPage: true })
}

async function definirTema(page: Page, tema: 'claro' | 'escuro') {
  await page.evaluate((valor) => window.localStorage.setItem('memoria:tema', valor), tema)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
}

/** Aperta em `origem`, anda até a lista de pendentes da coluna `destino` e solta. */
async function arrastar(page: Page, origem: Locator, destino: Locator) {
  const de = (await origem.boundingBox())!
  const para = (await destino.getByRole('list', { name: /^Pendentes de / }).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 60), {
    steps: 20,
  })
  await page.mouse.up()
}

test.setTimeout(90_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
})

test.describe('prioridade', () => {
  test('menu ⋯ marca e tira; a bandeira aparece no Dia, na Semana e no grupo recolhido', async ({
    page,
  }) => {
    await abrirDia(page)
    const linha = itemDoGrupo(page, OITAVO)
    await escolherNoMenu(page, linha, OITAVO, 'Marcar como prioridade')

    await expect(linha.getByRole('img', { name: 'Prioridade' })).toBeVisible()
    await expect(linha.getByRole('img', { name: 'Prioridade' })).toHaveAttribute(
      'title',
      'Prioridade',
    )
    await escolherNoMenu(page, tarefaSolta(page, TAREFA), TAREFA, 'Marcar como prioridade')
    await expect(tarefaSolta(page, TAREFA).getByRole('img', { name: 'Prioridade' })).toBeVisible()
    await capturar(page, 'dia-claro')

    // Menu agora oferece tirar.
    await linha.getByRole('button', { name: `Mais ações para ${OITAVO}` }).click()
    await expect(page.getByRole('menuitem', { name: 'Tirar prioridade' })).toBeVisible()
    await page.keyboard.press('Escape')

    // Grupo recolhido: a bandeira fica ao lado da contagem.
    await cardDoGrupo(page)
      .getByRole('button', { name: `Recolher ${GRUPO}` })
      .click()
    await expect(cardDoGrupo(page).getByRole('img', { name: '1 item prioritário' })).toBeVisible()
    await capturar(page, 'dia-grupo-recolhido-claro')

    // Semana: a bandeira também (grupo recolhido, depois aberto, claro e escuro).
    for (const tema of ['claro', 'escuro'] as const) {
      await definirTema(page, tema)
      await page.goto(`/semana/${HOJE}`)
      const coluna = page.getByRole('region', { name: COLUNA_HOJE })
      // Hoje abre com o grupo aberto: a bandeira está no item e na tarefa solta.
      await expect(
        coluna
          .getByRole('listitem')
          .filter({ hasText: OITAVO })
          .getByRole('img', { name: 'Prioridade' }),
      ).toBeVisible()
      await expect(
        coluna
          .getByRole('listitem')
          .filter({ hasText: TAREFA })
          .getByRole('img', { name: 'Prioridade' }),
      ).toBeVisible()
      await capturar(page, `semana-aberta-${tema}`)
      // Recolhido, a bandeira vai para o lado da contagem do grupo.
      await coluna.getByRole('button', { name: `Recolher ${GRUPO}` }).click()
      await expect(coluna.getByRole('img', { name: '1 item prioritário' })).toBeVisible()
      await capturar(page, `semana-recolhida-${tema}`)
    }

    await abrirDia(page)
    await escolherNoMenu(page, itemDoGrupo(page, OITAVO), OITAVO, 'Tirar prioridade')
    await expect(itemDoGrupo(page, OITAVO).getByRole('img', { name: 'Prioridade' })).toHaveCount(0)
  })

  test('tecla P na linha em foco e nas selecionadas (várias de uma vez); Ctrl+Z desfaz', async ({
    page,
  }) => {
    await abrirDia(page)
    await tarefaSolta(page, TAREFA)
      .getByRole('checkbox', { name: `Concluir ${TAREFA}` })
      .focus()
    await page.keyboard.press('p')
    await expect(tarefaSolta(page, TAREFA).getByRole('img', { name: 'Prioridade' })).toBeVisible()
    expect(await prioritariosNoBanco(page)).toEqual([TAREFA])

    // Ctrl+Z (aviso na tela) desfaz.
    await page.keyboard.press('Control+z')
    await expect(tarefaSolta(page, TAREFA).getByRole('img', { name: 'Prioridade' })).toHaveCount(0)

    // Várias selecionadas: P marca todas.
    await page.getByRole('button', { name: 'Selecionar' }).click()
    await tarefaSolta(page, TAREFA)
      .getByRole('checkbox', { name: `Selecionar ${TAREFA}` })
      .click()
    await itemDoGrupo(page, ITENS[1])
      .getByRole('checkbox', { name: `Selecionar ${ITENS[1]}` })
      .click()
    await page.locator('body').press('p')
    await expect.poll(() => prioritariosNoBanco(page)).toEqual([ITENS[1], TAREFA].sort())
  })

  test('arrastar a tarefa e o grupo para amanhã mantém a prioridade; concluir tira', async ({
    page,
  }) => {
    await abrirDia(page)
    await escolherNoMenu(page, tarefaSolta(page, TAREFA), TAREFA, 'Marcar como prioridade')
    await escolherNoMenu(page, itemDoGrupo(page, OITAVO), OITAVO, 'Marcar como prioridade')

    await page.goto(`/semana/${HOJE}`)
    await expandirGrupos(page)
    const hoje = page.getByRole('region', { name: COLUNA_HOJE })
    const amanha = page.getByRole('region', { name: COLUNA_AMANHA })
    await arrastar(page, hoje.getByRole('link', { name: TAREFA }), amanha)

    // A tarefa foi movida e continua prioridade.
    await expect(amanha.getByRole('link', { name: TAREFA })).toBeVisible()
    await expect(
      amanha
        .getByRole('listitem')
        .filter({ hasText: TAREFA })
        .getByRole('img', { name: 'Prioridade' }),
    ).toBeVisible()

    // O item (pela alça) vai para amanhã: a cópia é prioridade, o original (transferido) não.
    await arrastar(
      page,
      hoje.getByRole('button', { name: new RegExp(`^Arrastar ${OITAVO}`) }),
      amanha,
    )
    await expect
      .poll(async () => (await prioritariosNoBanco(page)).sort())
      .toEqual([OITAVO, TAREFA].sort())
    await page.goto(`/dia/2026-11-06`)
    await expandirGrupos(page)
    await expect(itemDoGrupo(page, OITAVO).getByRole('img', { name: 'Prioridade' })).toBeVisible()
    await capturar(page, 'amanha-claro')

    // Concluir tira a prioridade; desmarcar volta pendente comum.
    await itemDoGrupo(page, OITAVO)
      .getByRole('checkbox', { name: `Concluir ${OITAVO}` })
      .click()
    await expect.poll(() => prioritariosNoBanco(page)).toEqual([TAREFA])
    await page
      .getByRole('region', { name: 'Tarefas do dia' })
      .getByRole('checkbox', { name: `Concluir ${TAREFA}` })
      .click()
    await expect.poll(() => prioritariosNoBanco(page)).toEqual([])
  })
})
