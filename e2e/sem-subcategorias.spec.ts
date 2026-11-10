import { expect, test, type Page } from '@playwright/test'

/**
 * Sem subcategorias: só a categoria (de Grupo ou de Procedimento). Os dados vêm de um backup
 * ANTIGO com subcategorias, importado pelo caminho real (os itens ficam na categoria-mãe).
 * Capturas em e2e/capturas/sem-subcategorias-*.png.
 */

const HOJE = '2026-11-10'

interface ModuloBackup {
  lerBackup: (
    texto: string,
    versao: number,
  ) => { isValido: true; backup: unknown } | { isValido: false; mensagem: string }
}

interface ModuloRepositorioBackup {
  importarDados: (backup: unknown) => Promise<void>
  versaoDoBanco: () => number
}

/** Importa um backup do formato 13: "Sprint" em Trabalho › Reuniões, com item e nota. */
async function importarBackupAntigo(page: Page) {
  await page.evaluate(async (hoje) => {
    const base = { criadoEm: '2026-11-01T10:00:00.000Z', atualizadoEm: '2026-11-01T10:00:00.000Z' }
    const arquivo = {
      app: 'MemorIA',
      formato: 13,
      versaoBanco: 12,
      exportadoEm: '2026-11-09T12:00:00.000Z',
      tabelas: {
        categories: [
          { ...base, id: 'trab', nome: 'Trabalho', cor: '#5b4fbf', tipo: 'grupo', ordem: 1 },
          { ...base, id: 'casa', nome: 'Casa', cor: '#2f8a57', tipo: 'grupo', ordem: 2 },
          { ...base, id: 'infra', nome: 'Infra', cor: '#0e7490', tipo: 'procedimento', ordem: 1 },
        ],
        subcategories: [
          { ...base, id: 'reunioes', categoryId: 'trab', nome: 'Reuniões', ordem: 1 },
          { ...base, id: 'limpeza', categoryId: 'casa', nome: 'Limpeza', ordem: 1 },
          { ...base, id: 'srv', categoryId: 'infra', nome: 'Servidores', ordem: 1 },
        ],
        tasks: [],
        subtasks: [],
        procedures: [
          {
            ...base,
            id: 'subir',
            titulo: 'Subir servidor',
            categoryId: 'infra',
            subcategoryId: 'srv',
            etapas: [],
          },
        ],
        notes: [
          {
            ...base,
            id: 'nota',
            titulo: 'Pauta da sprint',
            conteudo: 'Revisar metas',
            vinculo: { tipo: 'grupo', id: 'sprint' },
          },
        ],
        attachments: [],
        groupSeries: [
          {
            ...base,
            id: 'sprint',
            titulo: 'Sprint',
            categoryId: 'trab',
            subcategoryId: 'reunioes',
          },
        ],
        groupCards: [
          { ...base, id: 'card', seriesId: 'sprint', data: hoje, ordem: 1, arquivado: false },
        ],
        groupItems: [
          {
            ...base,
            id: 'daily',
            cadeiaId: 'daily',
            cardId: 'card',
            titulo: 'Daily',
            ordem: 1,
            status: 'pendente',
            dataOriginal: hoje,
          },
        ],
        sessions: [],
      },
    }
    const caminhoBackup = '/src/lib/backup.ts'
    const caminhoRepositorio = '/src/db/repositories/backup-repository.ts'
    const { lerBackup } = (await import(/* @vite-ignore */ caminhoBackup)) as ModuloBackup
    const repositorio = (await import(
      /* @vite-ignore */ caminhoRepositorio
    )) as ModuloRepositorioBackup
    const leitura = lerBackup(JSON.stringify(arquivo), repositorio.versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await repositorio.importarDados(leitura.backup)
  }, HOJE)
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/sem-subcategorias-${nome}.png`, fullPage: true })
}

/** Navegação do próprio app (sem recarregar a página). */
async function irPara(page: Page, tela: string) {
  await page
    .getByRole('navigation', { name: 'Telas' })
    .getByRole('link', { name: tela, exact: true })
    .click()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.addInitScript(() => localStorage.setItem('memoria:fundo', 'liso'))
})

test('Categorias: só categorias nas duas seções, sem "Nova subcategoria" nem itens recuados', async ({
  page,
}) => {
  await page.goto('/categorias')
  await importarBackupAntigo(page)
  const grupos = page.getByRole('list', { name: 'Categorias de Grupos' })
  const procedimentos = page.getByRole('list', { name: 'Categorias de Procedimentos' })
  await expect(grupos.getByRole('button', { name: 'Trabalho', exact: true })).toBeVisible()

  await expect(grupos.locator(':scope > li')).toHaveCount(2)
  await expect(procedimentos.locator(':scope > li')).toHaveCount(1)
  await expect(page.getByRole('list', { name: /^Subcategorias/ })).toHaveCount(0)
  await expect(page.getByText(/subcategoria/i)).toHaveCount(0)
  for (const nome of ['Reuniões', 'Limpeza', 'Servidores']) {
    await expect(page.getByText(nome, { exact: true })).toHaveCount(0)
  }
  await expect(grupos.getByText('1 grupo')).toBeVisible()
  await expect(procedimentos.getByText('1 procedimento')).toBeVisible()
  await capturar(page, 'categorias')
})

test('Seletor na captura rápida: lista plana; criar categoria aplica e aparece em Categorias', async ({
  page,
}) => {
  await page.goto('/inicio')
  await importarBackupAntigo(page)
  const campo = page.getByRole('button', { name: 'Sem categoria', exact: true })
  await campo.click()
  await expect(page.getByRole('menuitemradio')).toHaveText(['Sem categoria', 'Trabalho', 'Casa'])
  await expect(page.getByRole('menu').getByText(/subcategoria/i)).toHaveCount(0)
  await capturar(page, 'seletor-captura')

  await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Pessoal')
  await page.getByRole('textbox', { name: 'Nova categoria' }).press('Enter')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pessoal', exact: true })).toBeVisible()

  await irPara(page, 'Categorias')
  const grupos = page.getByRole('list', { name: 'Categorias de Grupos' })
  await expect(grupos.getByRole('button', { name: 'Pessoal', exact: true })).toBeVisible()
})

test('Grupo que tinha subcategoria aparece só com a categoria no Dia, na Semana e em Notas', async ({
  page,
}) => {
  await page.goto(`/dia/${HOJE}`)
  await importarBackupAntigo(page)
  const principal = page.getByRole('main')
  await expect(principal.getByRole('button', { name: 'Sprint', exact: true })).toBeVisible()
  await expect(principal.getByText('Trabalho', { exact: true })).toBeVisible()
  await expect(principal.getByText(/Reuniões|›/)).toHaveCount(0)
  await capturar(page, 'dia')

  await page.goto(`/semana/${HOJE}`)
  await expect(principal.getByText('Sprint', { exact: true }).first()).toBeVisible()
  await expect(principal.getByText('Reuniões')).toHaveCount(0)
  await expect(principal.getByText(/Trabalho ›/)).toHaveCount(0)

  await page.goto('/notas')
  await expect(principal.getByText('Pauta da sprint').first()).toBeVisible()
  await expect(principal.getByText('Trabalho', { exact: true }).first()).toBeVisible()
  await expect(principal.getByText('Reuniões')).toHaveCount(0)
  await expect(principal.getByText(/Trabalho ›/)).toHaveCount(0)
  await capturar(page, 'notas')
})
