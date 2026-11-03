import { test, expect, type Page } from '@playwright/test'

/**
 * Capturas de conferência do Dia (Lista e Colunas) e da Semana, tema claro e escuro, antes e
 * depois do "em andamento" / Semana compacta: `FASE=antes` (sem andamento) ou `FASE=depois` (padrão,
 * com uma tarefa e um item em andamento). Saem em e2e/capturas/comparar-<fase>-<cenário>-<tema>.png.
 */

const FASE = process.env.FASE === 'antes' ? 'antes' : 'depois'
const HOJE = '2026-11-03'
const GRUPO = 'Simulador POOSE'
const ITEM = 'Junção de mesas em nº ímpar'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  definirConclusaoItem: (id: string, concluido: boolean) => Promise<unknown>
}
interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}
interface ModuloAndamento {
  definirAndamento: (alvos: { tarefas?: string[]; itens?: string[] }, marcar: boolean) => unknown
}

async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, comAndamento }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const soltas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const card = await grupos.criarGrupo({ titulo: 'Simulador POOSE', data: hoje })
      const feitos = ['Revisar enunciado', 'Modelar entidades', 'Criar tela de login']
      for (const titulo of [...feitos, 'Configurar rotas', 'Escrever testes de login']) {
        const item = await grupos.criarItem(card.id, titulo)
        if (feitos.includes(titulo)) await grupos.definirConclusaoItem(item.id, true)
      }
      const alvo = await grupos.criarItem(card.id, 'Junção de mesas em nº ímpar')
      await grupos.criarItem(card.id, 'Cálculo de ranking')
      const tarefa = await soltas.criarTarefa({ titulo: 'Revisar relatório', data: hoje })
      await soltas.criarTarefa({ titulo: 'Ligar para o dentista', data: hoje })
      if (comAndamento) {
        const andamento = (await importar(
          '/src/db/repositories/andamento-repository.ts',
        )) as ModuloAndamento
        await andamento.definirAndamento({ tarefas: [tarefa.id], itens: [alvo.id] }, true)
      }
    },
    { hoje: HOJE, comAndamento: FASE === 'depois' },
  )
}

async function capturar(page: Page, cenario: string, tema: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({
    path: `e2e/capturas/comparar-${FASE}-${cenario}-${tema}.png`,
    fullPage: true,
  })
}

for (const tema of ['claro', 'escuro']) {
  test.describe(`${FASE} · tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
      await page.goto(`/dia/${HOJE}`)
      await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
      await semear(page)
    })

    test('Dia em Lista', async ({ page }) => {
      await page.goto(`/dia/${HOJE}`)
      await page.getByRole('button', { name: `Abrir ${GRUPO}` }).click()
      await expect(page.getByText(ITEM)).toBeVisible()
      await capturar(page, 'dia-lista', tema)
    })

    test('Dia em Colunas, Tarefas soltas recolhida e grupo aberto', async ({ page }) => {
      await page.goto(`/dia/${HOJE}`)
      await page
        .getByRole('group', { name: 'Visualização do dia' })
        .getByRole('button', { name: 'Colunas' })
        .click()
      await page
        .getByRole('region', { name: 'Tarefas soltas', exact: true })
        .getByRole('button', { name: /^Tarefas soltas, / })
        .click()
      await page.getByRole('button', { name: `Abrir ${GRUPO}` }).click()
      await expect(page.getByText(ITEM)).toBeVisible()
      await capturar(page, 'dia-colunas', tema)
    })

    test('Semana', async ({ page }) => {
      await page.goto(`/semana/${HOJE}`)
      await page.getByRole('button', { name: `Expandir ${GRUPO}` }).click()
      await expect(page.getByText(ITEM)).toBeVisible()
      await capturar(page, 'semana', tema)
    })
  })
}
