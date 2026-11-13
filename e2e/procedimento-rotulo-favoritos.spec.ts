import { expect, test } from '@playwright/test'

/**
 * E2E Playwright cobrindo:
 * 1. Renomear "Etapa 1" para "Segunda-feira" na Lista, trocar para Cartões -> nome igual;
 *    esvaziar o campo -> volta "Etapa 1".
 * 2. Favoritar um procedimento -> aparece em "Procedimentos favoritos" no Início, abaixo do gráfico;
 *    clicar abre o editor; desfavoritar -> a seção some.
 */

interface ModuloProcedimentos {
  criarProcedimento: (dados: {
    titulo: string
    etapas: { id: string; texto: string }[]
  }) => Promise<{ id: string }>
}

test('nome da etapa editável e procedimentos favoritos no Início', async ({ page }) => {
  await page.goto('/procedimentos')

  const id = await page.evaluate(async () => {
    const caminho = '/src/db/repositories/procedure-repository.ts'
    const procedimentos = (await import(/* @vite-ignore */ caminho)) as ModuloProcedimentos
    const res = await procedimentos.criarProcedimento({
      titulo: 'Rotina Semanal',
      etapas: [
        { id: crypto.randomUUID(), texto: 'Planejar sprints' },
        { id: crypto.randomUUID(), texto: 'Reunião de alinhamento' },
      ],
    })
    return res.id
  })

  // Abre o editor do procedimento
  await page.goto(`/procedimentos/${id}`)
  await expect(page.getByRole('heading', { name: 'Etapas' })).toBeVisible()

  // 1. Rótulo da etapa: clicar em "Etapa 1" para renomear
  const rotuloEtapa1 = page.getByText('Etapa 1', { exact: true })
  await expect(rotuloEtapa1).toBeVisible()
  await rotuloEtapa1.click()

  // O campo de edição de rótulo aparece com o placeholder "Etapa 1"
  const inputRotulo = page.getByPlaceholder('Etapa 1')
  await expect(inputRotulo).toBeVisible()
  await inputRotulo.fill('Segunda-feira')
  await inputRotulo.press('Enter')

  // Deve exibir o novo nome "Segunda-feira"
  await expect(page.getByText('Segunda-feira')).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Salvo')

  // Troca para o modo Cartões
  await page.getByRole('button', { name: 'Cartões' }).click()
  await expect(page.getByRole('button', { name: 'Cartões' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Segunda-feira')).toBeVisible()

  // Clica no rótulo no cartão para editar e esvaziar
  await page.getByText('Segunda-feira').click()
  const inputRotuloCartao = page.getByPlaceholder('Etapa 1')
  await expect(inputRotuloCartao).toBeVisible()
  await inputRotuloCartao.fill('')
  await inputRotuloCartao.press('Enter')

  // Deve voltar para "Etapa 1"
  await expect(page.getByText('Etapa 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Salvo')

  // 2. Favoritar o procedimento no editor
  const botaoFavoritar = page.getByRole('button', { name: 'Favoritar' })
  await expect(botaoFavoritar).toBeVisible()
  await botaoFavoritar.click()

  // Botão muda para "Remover dos favoritos"
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()

  // Vai para a tela Início
  await page.goto('/inicio')
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible()

  // A seção "Procedimentos favoritos" deve estar visível abaixo do mapa/gráfico
  const secaoFavoritos = page.getByRole('heading', { name: 'Procedimentos favoritos' })
  await expect(secaoFavoritos).toBeVisible()

  // O link do procedimento favorito está presente e clicar abre o editor
  const linkFavorito = page.getByRole('link', { name: /Rotina Semanal/ })
  await expect(linkFavorito).toBeVisible()
  await linkFavorito.click()

  await expect(page).toHaveURL(new RegExp(`/procedimentos/${id}$`))

  // Desfavoritar pelo editor
  await page.getByRole('button', { name: 'Remover dos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Favoritar' })).toBeVisible()

  // Volta ao Início -> a seção "Procedimentos favoritos" sumiu
  await page.goto('/inicio')
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Procedimentos favoritos' })).toHaveCount(0)
})
