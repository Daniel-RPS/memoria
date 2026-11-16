import { expect, test } from '@playwright/test'

test('rascunho automático no Dia e na captura rápida', async ({ page }) => {
  // Limpa o localStorage para começar limpo
  await page.goto('/dia/hoje')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // 1. No Dia, abrir "+ Nova tarefa" e digitar "Comprar pão"
  const botaoNovaTarefa = page.getByRole('button', { name: 'Nova tarefa' })
  await botaoNovaTarefa.click()

  const campoNovaTarefa = page.getByRole('textbox', { name: 'Nova tarefa' })
  await campoNovaTarefa.fill('Comprar pão')

  // Ir ao Início
  await page.getByRole('link', { name: 'MemorIA — ir para o Início' }).click()
  await expect(page).toHaveURL(/\/inicio$/)

  // Digitar texto na captura rápida
  const campoCaptura = page.getByRole('textbox', { name: 'Título da tarefa' })
  await campoCaptura.fill('Ideia para o projeto')

  // Voltar ao Dia diretamente pela URL
  await page.goto('/dia/hoje')
  await expect(page).toHaveURL(/\/dia\//)

  // O campo já está aberto com "Comprar pão"
  const campoNovaTarefaVolta = page.getByRole('textbox', { name: 'Nova tarefa' })
  await expect(campoNovaTarefaVolta).toBeVisible()
  await expect(campoNovaTarefaVolta).toHaveValue('Comprar pão')

  // Enter cria a tarefa e a chave some do localStorage
  await campoNovaTarefaVolta.press('Enter')
  await expect(page.getByText('Comprar pão')).toBeVisible()

  const temChaveDia = await page.evaluate(() => {
    return Object.keys(localStorage).some(
      (k) => k.startsWith('memoria:rascunho:nova-tarefa') && localStorage.getItem(k) !== null,
    )
  })
  expect(temChaveDia).toBe(false)

  // Voltar ao Início: o texto digitado na captura rápida continua lá
  await page.getByRole('link', { name: 'MemorIA — ir para o Início' }).click()
  await expect(page).toHaveURL(/\/inicio$/)

  const campoCapturaVolta = page.getByRole('textbox', { name: 'Título da tarefa' })
  await expect(campoCapturaVolta).toHaveValue('Ideia para o projeto')
})
