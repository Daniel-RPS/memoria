import { expect, test } from '@playwright/test'

/**
 * Modo Cartões nas etapas de procedimento:
 * - Alternar entre Lista e Cartões no editor.
 * - Modo Cartões mostra etapas em grade + botão em cartão "+ Adicionar etapa".
 * - Preferência persiste após recarregar a página.
 * - Edição de texto e adição de etapa funcionam no modo Cartões e renumeram.
 */

interface ModuloProcedimentos {
  criarProcedimento: (dados: {
    titulo: string
    etapas: { id: string; texto: string }[]
  }) => Promise<{ id: string }>
}

test('alternar entre Lista e Cartões nas etapas, persistência e edição', async ({ page }) => {
  await page.goto('/procedimentos')

  const id = await page.evaluate(async () => {
    const caminho = '/src/db/repositories/procedure-repository.ts'
    const procedimentos = (await import(/* @vite-ignore */ caminho)) as ModuloProcedimentos
    const res = await procedimentos.criarProcedimento({
      titulo: 'Backup do Servidor',
      etapas: [
        { id: crypto.randomUUID(), texto: 'Conectar via SSH' },
        { id: crypto.randomUUID(), texto: 'Executar dump do banco' },
        { id: crypto.randomUUID(), texto: 'Enviar para armazenamento frio' },
      ],
    })
    return res.id
  })

  await page.goto(`/procedimentos/${id}`)
  await expect(page.getByRole('heading', { name: 'Etapas' })).toBeVisible()

  // No início, o modo padrão é Lista (ol com borda simples vertical)
  const botaoLista = page.getByRole('button', { name: 'Lista' })
  const botaoCartoes = page.getByRole('button', { name: 'Cartões' })

  await expect(botaoLista).toHaveAttribute('aria-pressed', 'true')
  await expect(botaoCartoes).toHaveAttribute('aria-pressed', 'false')

  // Alterna para Cartões
  await botaoCartoes.click()
  await expect(botaoCartoes).toHaveAttribute('aria-pressed', 'true')

  // Verifica se a grade de cartões foi montada com as 3 etapas e o botão tracejado de adicionar
  const botaoAdicionarNoCartao = page.getByRole('button', { name: 'Adicionar etapa' })
  await expect(botaoAdicionarNoCartao).toBeVisible()

  // 3 cartões presentes
  await expect(page.getByLabel('Etapa 1', { exact: true })).toHaveValue('Conectar via SSH')
  await expect(page.getByLabel('Etapa 2', { exact: true })).toHaveValue('Executar dump do banco')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toHaveValue('Enviar para armazenamento frio')

  // Verifica que os 3 cartões estão lado a lado (mesmo top / mesma linha na grade)
  const box1 = await page.getByLabel('Etapa 1', { exact: true }).boundingBox()
  const box2 = await page.getByLabel('Etapa 2', { exact: true }).boundingBox()
  const box3 = await page.getByLabel('Etapa 3', { exact: true }).boundingBox()
  expect(box1).not.toBeNull()
  expect(box2).not.toBeNull()
  expect(box3).not.toBeNull()
  if (box1 && box2 && box3) {
    // Mesma linha (top aproximado)
    expect(Math.abs(box1.y - box2.y)).toBeLessThan(5)
    expect(Math.abs(box2.y - box3.y)).toBeLessThan(5)
    // Lado a lado (x crescente)
    expect(box2.x).toBeGreaterThan(box1.x)
    expect(box3.x).toBeGreaterThan(box2.x)
  }

  // Recarregar a página mantém a preferência Cartões
  await page.reload()
  await expect(page.getByRole('button', { name: 'Cartões' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Etapa 1', { exact: true })).toBeVisible()

  // Editar texto no cartão
  await page.getByLabel('Etapa 2', { exact: true }).fill('Executar pg_dump e compactar')
  await expect(page.getByRole('status')).toHaveText('Salvo')

  // Adicionar etapa pelo cartão tracejado
  await page.getByRole('button', { name: 'Adicionar etapa' }).click()
  await expect(page.getByLabel('Etapa 4', { exact: true })).toBeVisible()
  await page.getByLabel('Etapa 4', { exact: true }).fill('Verificar integridade do arquivo')
  await expect(page.getByRole('status')).toHaveText('Salvo')

  // Voltar para Lista
  await page.getByRole('button', { name: 'Lista' }).click()
  await expect(page.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')

  // Etapas na vertical (x alinhado, y crescente)
  const linha1 = await page.getByLabel('Etapa 1', { exact: true }).boundingBox()
  const linha2 = await page.getByLabel('Etapa 2', { exact: true }).boundingBox()
  expect(linha1).not.toBeNull()
  expect(linha2).not.toBeNull()
  if (linha1 && linha2) {
    expect(linha2.y).toBeGreaterThan(linha1.y)
    expect(Math.abs(linha1.x - linha2.x)).toBeLessThan(5)
  }

  // Valores mantidos
  await expect(page.getByLabel('Etapa 2', { exact: true })).toHaveValue('Executar pg_dump e compactar')
  await expect(page.getByLabel('Etapa 4', { exact: true })).toHaveValue('Verificar integridade do arquivo')
})
