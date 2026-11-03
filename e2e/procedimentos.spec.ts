import { expect, test, type Page } from '@playwright/test'

/**
 * Procedimentos no navegador: criar com etapas e categoria, editar (renomear e excluir etapa,
 * com a numeração se ajustando), achar pela busca no bloco da categoria e excluir com
 * confirmação. Capturas em e2e/capturas/procedimento-*.png.
 */

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; tipo?: 'procedimento' }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    procedures: {
      toArray: () => Promise<
        { titulo: string; categoryId?: string; etapas: { texto: string; ordem: number }[] }[]
      >
    }
  }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/procedimento-${nome}.png`, fullPage: true })
}

/** Procedimentos gravados, com as etapas na ordem gravada. */
async function lerProcedimentos(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    return (await db.procedures.toArray()).map(({ titulo, categoryId, etapas }) => ({
      titulo,
      temCategoria: Boolean(categoryId),
      etapas: [...etapas].sort((a, b) => a.ordem - b.ordem).map((etapa) => etapa.texto),
    }))
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/procedimentos')
  await page.evaluate(async () => {
    const caminho = '/src/db/repositories/category-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminho)) as ModuloCategorias
    await categorias.criarCategoria({ nome: 'Casa', tipo: 'procedimento' })
  })
  // Categoria sem procedimento já aparece como bloco vazio.
  await expect(
    page.getByRole('region', { name: 'Casa' }).getByText('Nenhum procedimento nesta categoria'),
  ).toBeVisible()
})

test('criar, editar e excluir um procedimento', async ({ page }) => {
  await capturar(page, '1-lista-vazia')

  // Criar: título, categoria e 3 etapas.
  await page.getByRole('link', { name: 'Novo procedimento', exact: true }).click()
  await page.getByLabel('Título').fill('Trocar o filtro de água')
  await page.getByRole('button', { name: 'Categoria' }).click()
  await page.getByRole('menuitemradio', { name: 'Casa' }).click()
  for (const texto of ['Fechar o registro', 'Abrir a tampa do filtro', 'Encaixar o refil novo']) {
    await page.getByRole('button', { name: 'Adicionar etapa' }).click()
    await page.keyboard.type(texto)
  }
  await capturar(page, '2-novo-com-3-etapas')
  await page.getByRole('button', { name: 'Criar procedimento' }).click()

  // Página do procedimento: tudo editável e gravado sozinho.
  await expect(page.getByRole('status')).toHaveText('Salvo')
  await expect(page.getByLabel('Etapa 2', { exact: true })).toHaveValue('Abrir a tampa do filtro')
  await page.getByLabel('Etapa 2', { exact: true }).fill('Desrosquear a tampa do filtro')
  await page.getByRole('button', { name: 'Excluir etapa 1' }).click()
  await expect(page.getByLabel('Etapa 1', { exact: true })).toHaveValue(
    'Desrosquear a tampa do filtro',
  )
  await expect(page.getByLabel('Etapa 2', { exact: true })).toHaveValue('Encaixar o refil novo')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Salvo')
  await capturar(page, '3-editado')
  expect(await lerProcedimentos(page)).toEqual([
    {
      titulo: 'Trocar o filtro de água',
      temCategoria: true,
      etapas: ['Desrosquear a tampa do filtro', 'Encaixar o refil novo'],
    },
  ])

  // Lista: no bloco da categoria; a busca acha pelo texto da etapa.
  await page.getByRole('link', { name: 'Procedimentos', exact: true }).first().click()
  const blocoCasa = page.getByRole('region', { name: 'Casa' })
  await expect(blocoCasa.getByRole('link', { name: /Trocar o filtro de água/ })).toContainText(
    '2 etapas',
  )
  await page.getByRole('searchbox', { name: 'Buscar procedimentos' }).fill('refil')
  await expect(page.getByRole('link', { name: /Trocar o filtro de água/ })).toBeVisible()
  await capturar(page, '4-lista-busca')
  await page.getByRole('searchbox', { name: 'Buscar procedimentos' }).fill('impressora')
  await expect(page.getByText('Nenhum procedimento encontrado.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar procedimentos' }).fill('')

  // Excluir pede confirmação.
  await page.getByRole('link', { name: /Trocar o filtro de água/ }).click()
  await page.getByRole('button', { name: 'Excluir procedimento…' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Excluir “Trocar o filtro de água”?')
  await capturar(page, '5-confirmar-exclusao')
  await page.getByRole('button', { name: 'Excluir procedimento', exact: true }).click()

  await expect(page).toHaveURL(/\/procedimentos$/)
  // A categoria "Casa" continua existindo: fica o bloco vazio, não o convite grande.
  await expect(
    page.getByRole('region', { name: 'Casa' }).getByText('Nenhum procedimento nesta categoria'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Criar o primeiro procedimento/ })).toHaveCount(0)
  expect(await lerProcedimentos(page)).toEqual([])
  await capturar(page, '6-excluido')
})
