import { expect, test, type Page } from '@playwright/test'
import { AGORA, fixarTema, semearAjustes } from './semear-ajustes.ts'

/**
 * Capturas das abas Notas (três modos) e Procedimentos, larga e estreita, claro e escuro, em
 * e2e/capturas/ajustes-<fase>-*.png (FASE=antes|depois; o padrão é depois).
 */

const FASE = process.env.FASE ?? 'depois'
const LARGURAS = [
  { nome: 'larga', width: 1440, height: 1000 },
  { nome: 'estreita', width: 820, height: 1000 },
] as const

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/ajustes-${FASE}-${nome}.png`, fullPage: true })
}

async function escolherModo(page: Page, modo: 'Por categoria' | 'Por grupo' | 'Recentes') {
  await page.getByRole('radio', { name: modo }).click()
}

for (const tema of ['claro', 'escuro'] as const) {
  for (const largura of LARGURAS) {
    test(`capturas ${tema} ${largura.nome}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.clock.setFixedTime(AGORA)
      await page.setViewportSize({ width: largura.width, height: largura.height })
      await fixarTema(page, tema)
      await page.goto('/notas')
      await semearAjustes(page)
      const sufixo = `${tema}-${largura.nome}`

      for (const modo of ['Por categoria', 'Por grupo', 'Recentes'] as const) {
        await escolherModo(page, modo)
        await expect(page.getByRole('article').first()).toBeVisible()
        await capturar(page, `notas-${modo.replace(' ', '-').toLowerCase()}-${sufixo}`)
        if (FASE === 'antes') continue
        await page.getByRole('button', { name: 'Recolher tudo' }).click()
        await capturar(page, `notas-${modo.replace(' ', '-').toLowerCase()}-fechado-${sufixo}`)
        await page.getByRole('button', { name: 'Expandir tudo' }).click()
      }

      if (FASE !== 'antes') {
        await page.getByRole('button', { name: /Filtrar pelo dia da edição/ }).click()
        await capturar(page, `notas-filtro-aberto-${sufixo}`)
        await page.getByRole('option', { name: 'Escolher data…' }).click()
        await page.locator('[data-day="30/10/2026"]').click()
        await page.locator('[data-day="01/11/2026"]').click()
        await capturar(page, `notas-filtro-intervalo-${sufixo}`)
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: 'Limpar filtro de dia' }).click()
      }

      await page.goto('/procedimentos')
      await expect(page.getByRole('link', { name: /Github/ }).first()).toBeVisible()
      await capturar(page, `procedimentos-${sufixo}`)
      if (FASE === 'antes') return

      await page.getByRole('button', { name: /Filtrar pelo dia da criação/ }).click()
      await page.getByRole('option', { name: 'Este mês' }).click()
      await capturar(page, `procedimentos-filtro-${sufixo}`)

      await page.getByRole('link', { name: /^Github/ }).click()
      await page.getByRole('button', { name: 'Ícone do procedimento' }).click()
      await expect(page.getByRole('gridcell').first()).toBeVisible({ timeout: 20_000 })
      await capturar(page, `seletor-emoji-${sufixo}`)
      await page.getByRole('dialog').getByRole('tab', { name: 'Marcas' }).click()
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'n8n' }).locator('[data-marca]'),
      ).toBeVisible()
      await page.waitForTimeout(500) // desenhos das marcas (máscaras) carregando
      await capturar(page, `seletor-marcas-${sufixo}`)
      await page.getByRole('dialog').getByRole('button', { name: 'GitHub', exact: true }).click()
      await capturar(page, `editor-procedimento-${sufixo}`)

      await page.goto('/categorias')
      await capturar(page, `categorias-${sufixo}`)
    })
  }
}
