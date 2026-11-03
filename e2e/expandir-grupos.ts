import type { Page } from '@playwright/test'

/**
 * Abre todos os grupos recolhidos do Dia ("Abrir X") ou da Semana ("Expandir X"): as visões
 * abrem com os grupos recolhidos. Chame depois que os cards aparecerem.
 */
export async function expandirGrupos(page: Page) {
  // Espera algum card aparecer (aberto ou recolhido); "Recolher menu" é a barra lateral.
  await page
    .getByRole('button', { name: /^(Abrir|Expandir|Recolher) (?!tudo$|menu$)/ })
    .first()
    .waitFor()
  const recolhidos = page
    .locator('button[aria-expanded="false"]')
    .and(page.getByRole('button', { name: /^(Abrir|Expandir) / }))
  for (let vez = 0; vez < 50 && (await recolhidos.count()) > 0; vez++) {
    await recolhidos.first().click()
  }
}
