import { expect, test, type Page } from '@playwright/test'

/**
 * Aba Arquivados: arquivar tarefa, grupo, nota e procedimento pelos menus ⋯, ver tudo na tela
 * (blocos, filtro por tipo, busca), desarquivar com "Desfazer", excluir de vez, seleção
 * múltipla e a barra lateral recolhida. Capturas em e2e/capturas/arquivados-*.png.
 */

const HOJE = '2026-11-02'
const ONTEM = '2026-11-01'

interface Modulos {
  categorias: {
    criarCategoria: (dados: {
      nome: string
      cor?: string
      tipo?: 'grupo' | 'procedimento'
    }) => Promise<{ id: string }>
  }
  grupos: {
    criarGrupo: (dados: {
      titulo: string
      data: string
      categoryId?: string
    }) => Promise<{ id: string }>
    criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  }
  tarefas: {
    criarTarefa: (dados: { titulo: string; data: string; categoryId?: string }) => Promise<unknown>
  }
  notas: { criarNota: (dados: { titulo?: string; conteudo?: string }) => Promise<unknown> }
  procedimentos: {
    criarProcedimento: (dados: {
      titulo: string
      categoryId?: string
      etapas: { id: string; texto: string }[]
    }) => Promise<unknown>
  }
}

/** Uma tarefa (de ontem, para o "Voltar para…"), o grupo Casa, uma nota e um procedimento. */
async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, ontem }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const m = {
        categorias: await importar('/src/db/repositories/category-repository.ts'),
        grupos: await importar('/src/db/repositories/group-repository.ts'),
        tarefas: await importar('/src/db/repositories/task-repository.ts'),
        notas: await importar('/src/db/repositories/note-repository.ts'),
        procedimentos: await importar('/src/db/repositories/procedure-repository.ts'),
      } as Modulos
      const casa = await m.categorias.criarCategoria({ nome: 'Casa', cor: '#2f8a57' })
      const rotinas = await m.categorias.criarCategoria({
        nome: 'Rotinas',
        cor: '#c2410c',
        tipo: 'procedimento',
      })
      await m.tarefas.criarTarefa({ titulo: 'Ligar para Fulano', data: ontem, categoryId: casa.id })
      await m.tarefas.criarTarefa({ titulo: 'Pagar a conta de luz', data: hoje })
      const card = await m.grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: casa.id })
      await m.grupos.criarItem(card.id, 'Varrer')
      await m.grupos.criarItem(card.id, 'Lavar a louça')
      await m.notas.criarNota({
        titulo: 'Senha do roteador',
        conteudo: 'Trocar no domingo',
      })
      await m.procedimentos.criarProcedimento({
        titulo: 'Renovar certificado',
        categoryId: rotinas.id,
        etapas: [
          { id: 'e1', texto: 'Abrir o portal' },
          { id: 'e2', texto: 'Pagar a taxa' },
        ],
      })
    },
    { hoje: HOJE, ontem: ONTEM },
  )
}

function navegacao(page: Page) {
  return page.getByRole('navigation', { name: 'Telas' })
}

function linkArquivados(page: Page) {
  return navegacao(page).getByRole('link', { name: 'Arquivados', exact: true })
}

async function abrirComDados(page: Page, tema: 'claro' | 'escuro' = 'claro') {
  await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
  await semear(page)
  // A tarefa é de ontem (para o "Voltar para 01/11"); o grupo Casa é de hoje.
  await page.goto(`/dia/${ONTEM}`)
  await expect(page.getByText('Ligar para Fulano')).toBeVisible()
}

/** Arquiva as quatro coisas pelos menus ⋯ de cada tela. */
async function arquivarTudo(page: Page) {
  await page.getByRole('button', { name: 'Mais ações para Ligar para Fulano' }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await expect(page.getByText('Ligar para Fulano')).toBeHidden()
  await expect(linkArquivados(page)).toHaveAttribute('aria-description', '1 item')

  await navegacao(page).getByRole('link', { name: 'Dia', exact: true }).click()
  await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await expect(page.getByRole('button', { name: 'Abrir Casa' })).toBeHidden()

  await navegacao(page).getByRole('link', { name: 'Notas', exact: true }).click()
  await page.getByRole('button', { name: 'Mais ações para Senha do roteador' }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await expect(page.getByRole('article', { name: 'Senha do roteador' })).toBeHidden()

  await navegacao(page).getByRole('link', { name: 'Procedimentos', exact: true }).click()
  await page.getByRole('button', { name: 'Mais ações para Renovar certificado' }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await expect(page.getByRole('link', { name: /Renovar certificado/ })).toBeHidden()
  await expect(linkArquivados(page)).toHaveAttribute('aria-description', '4 itens')
}

function linha(page: Page, titulo: string) {
  return page.locator('li[data-tipo]', { hasText: titulo })
}

function opcaoDoFiltro(page: Page, nome: string) {
  return page.getByRole('radio', { name: new RegExp(`^${nome}`) })
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/arquivados-${nome}.png`, fullPage: true })
}

test.beforeEach(async ({ page }) => {
  // Roteiros longos (arquivar em quatro telas): com a máquina ocupada passam dos 30 s.
  test.slow()
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
})

test('arquivar tarefa, grupo, nota e procedimento: cada um aparece no seu bloco, sem recarregar', async ({
  page,
}) => {
  await abrirComDados(page)
  await arquivarTudo(page)

  await linkArquivados(page).click()
  await expect(page.getByRole('heading', { name: 'Arquivados', level: 1 })).toBeVisible()
  await expect(page.getByText('Itens tirados do caminho, sem apagar')).toBeVisible()

  for (const [bloco, titulo] of [
    ['Tarefas', 'Ligar para Fulano'],
    ['Grupos de tarefas', 'Casa'],
    ['Notas', 'Senha do roteador'],
    ['Procedimentos', 'Renovar certificado'],
  ] as const) {
    await expect(
      page.getByRole('region', { name: bloco, exact: true }).getByText(titulo),
    ).toBeVisible()
  }
  // Detalhe de cada tipo.
  await expect(linha(page, 'Ligar para Fulano')).toContainText('era de 01/11')
  await expect(linha(page, 'Casa')).toContainText('0 de 2 itens')
  await expect(linha(page, 'Senha do roteador')).toContainText('Nota avulsa')
  await expect(linha(page, 'Renovar certificado')).toContainText('Rotinas · 2 etapas')
  await expect(linha(page, 'Ligar para Fulano')).toContainText('arquivado há')
  await capturar(page, 'cheia-claro')
  // Com o mouse na linha, as ações aparecem por cima do "arquivado há…", sem espremer o título.
  await linha(page, 'Ligar para Fulano').hover()
  await expect(page.getByRole('button', { name: 'Desarquivar Ligar para Fulano' })).toBeVisible()
  await expect(linha(page, 'Ligar para Fulano').getByRole('button', { name: /^Ligar/ })).toHaveText(
    'Ligar para Fulano (Tarefa)',
  )
  await page.screenshot({ path: 'e2e/capturas/arquivados-hover-claro.png', fullPage: true })
})

test('filtro por tipo com contagem (lembrado) e busca', async ({ page }) => {
  await abrirComDados(page)
  await arquivarTudo(page)
  await linkArquivados(page).click()

  await expect(opcaoDoFiltro(page, 'Todos')).toContainText('4')
  await expect(opcaoDoFiltro(page, 'Notas')).toContainText('1')

  await opcaoDoFiltro(page, 'Grupos').click()
  await expect(linha(page, 'Casa')).toBeVisible()
  await expect(linha(page, 'Ligar para Fulano')).toBeHidden()
  await expect(page.getByRole('region', { name: 'Grupos de tarefas' })).toHaveCount(0)

  // Lembrado ao recarregar.
  await page.reload()
  await expect(opcaoDoFiltro(page, 'Grupos')).toHaveAttribute('aria-checked', 'true')
  await opcaoDoFiltro(page, 'Todos').click()

  // Busca por título, texto e categoria.
  const busca = page.getByRole('searchbox', { name: 'Buscar arquivados' })
  await busca.fill('domingo')
  await expect(linha(page, 'Senha do roteador')).toBeVisible()
  await expect(linha(page, 'Casa')).toBeHidden()
  await busca.fill('rotinas')
  await expect(linha(page, 'Renovar certificado')).toBeVisible()
  await expect(linha(page, 'Senha do roteador')).toBeHidden()
  await busca.fill('zzz')
  await expect(page.getByText('Nada arquivado com “zzz”.')).toBeVisible()
})

test('desarquivar cada um volta ao lugar certo e o Desfazer arquiva de novo', async ({ page }) => {
  await abrirComDados(page)
  await arquivarTudo(page)
  await linkArquivados(page).click()

  // Tarefa de ontem: o padrão é hoje; "Desfazer" devolve ao arquivo.
  await linha(page, 'Ligar para Fulano').hover()
  await page.getByRole('button', { name: 'Desarquivar Ligar para Fulano' }).click()
  const opcoes = page.getByRole('menuitem')
  await expect(opcoes.nth(0)).toHaveText('Trazer para hoje')
  await expect(opcoes.nth(1)).toHaveText('Voltar para 01/11')
  await opcoes.nth(0).click()
  await expect(page.getByText('Tarefa desarquivada')).toBeVisible()
  await expect(linha(page, 'Ligar para Fulano')).toBeHidden()
  await page
    .locator('[data-sonner-toast]', { hasText: 'Tarefa desarquivada' })
    .getByRole('button', { name: 'Desfazer' })
    .click()
  await expect(linha(page, 'Ligar para Fulano')).toBeVisible()

  // Desarquiva de novo e confere no Dia, sem tocar em "pendente há".
  await linha(page, 'Ligar para Fulano').hover()
  await page.getByRole('button', { name: 'Desarquivar Ligar para Fulano' }).click()
  await page.getByRole('menuitem', { name: 'Voltar para 01/11' }).click()
  await expect(linha(page, 'Ligar para Fulano')).toBeHidden()

  // Grupo: volta para o dia que tinha (hoje).
  await linha(page, 'Casa').hover()
  await page.getByRole('button', { name: 'Desarquivar Casa' }).click()
  await page.getByRole('menuitem', { name: 'Trazer para hoje' }).click()
  await expect(linha(page, 'Casa')).toBeHidden()

  // Nota e procedimento: direto, e voltam às abas deles.
  await linha(page, 'Senha do roteador').hover()
  await page.getByRole('button', { name: 'Desarquivar Senha do roteador' }).click()
  await linha(page, 'Renovar certificado').hover()
  await page.getByRole('button', { name: 'Desarquivar Renovar certificado' }).click()
  await expect(page.getByText('Nada arquivado.', { exact: false })).toBeVisible()
  await expect(linkArquivados(page)).not.toHaveAttribute('aria-description')
  await expect(linkArquivados(page).locator('[data-contador]')).toHaveCount(0)

  await navegacao(page).getByRole('link', { name: 'Notas', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Senha do roteador' })).toBeVisible()
  await navegacao(page).getByRole('link', { name: 'Procedimentos', exact: true }).click()
  await expect(page.getByRole('link', { name: /Renovar certificado/ })).toBeVisible()
  await page.goto(`/dia/${ONTEM}`)
  await expect(page.getByText('Ligar para Fulano')).toBeVisible()
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('button', { name: 'Abrir Casa' })).toBeVisible()
})

test('excluir permanentemente pede confirmação; seleção múltipla desarquiva e exclui vários', async ({
  page,
}) => {
  await abrirComDados(page)
  await arquivarTudo(page)
  await linkArquivados(page).click()

  // Cancelar não apaga.
  await page.getByRole('button', { name: 'Mais ações para Senha do roteador' }).click()
  await page.getByRole('menuitem', { name: 'Excluir permanentemente…' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(linha(page, 'Senha do roteador')).toBeVisible()

  await page.getByRole('button', { name: 'Mais ações para Senha do roteador' }).click()
  await page.getByRole('menuitem', { name: 'Excluir permanentemente…' }).click()
  await page.getByRole('button', { name: 'Excluir permanentemente' }).click()
  await expect(linha(page, 'Senha do roteador')).toBeHidden()
  await expect(linkArquivados(page)).toHaveAttribute('aria-description', '3 itens')

  // Seleção múltipla: marca duas e desarquiva; depois marca o resto e exclui.
  await page.getByRole('checkbox', { name: 'Selecionar Ligar para Fulano' }).click()
  await page.getByRole('checkbox', { name: 'Selecionar Casa' }).click()
  const barra = page.getByRole('toolbar', { name: 'Ações para os itens selecionados' })
  await expect(barra).toContainText('2 selecionados')
  await barra.getByRole('button', { name: 'Desarquivar' }).click()
  await expect(page.getByText('2 itens desarquivados')).toBeVisible()
  await expect(linha(page, 'Ligar para Fulano')).toBeHidden()
  await expect(linha(page, 'Casa')).toBeHidden()

  await page.getByRole('checkbox', { name: 'Selecionar Renovar certificado' }).click()
  await barra.getByRole('button', { name: 'Excluir…' }).click()
  await page.getByRole('button', { name: 'Excluir permanentemente' }).click()
  await expect(page.getByText('Nada arquivado.', { exact: false })).toBeVisible()
})

test('barra recolhida: ícone e dica de Arquivados; capturas nos dois temas', async ({ page }) => {
  await abrirComDados(page)
  await arquivarTudo(page)
  await linkArquivados(page).click()
  await expect(linkArquivados(page).locator('[data-contador]')).toHaveText('4')
  await capturar(page, 'barra-aberta-claro')

  await page.keyboard.press('Control+b')
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  await page.waitForTimeout(600)
  await expect(linkArquivados(page)).toHaveAttribute('aria-current', 'page')
  await linkArquivados(page).hover()
  await expect(page.getByRole('tooltip', { name: 'Arquivados' })).toBeVisible()
  await page.screenshot({
    path: 'e2e/capturas/arquivados-barra-recolhida-claro.png',
    clip: { x: 0, y: 0, width: 420, height: 520 },
  })
  await page.keyboard.press('Control+b')

  await page.evaluate(() => localStorage.setItem('memoria:tema', 'escuro'))
  await page.reload()
  await expect(linha(page, 'Casa')).toBeVisible()
  await capturar(page, 'cheia-escuro')
  await page.keyboard.press('Control+b')
  await page.waitForTimeout(600)
  await linkArquivados(page).hover()
  await expect(page.getByRole('tooltip', { name: 'Arquivados' })).toBeVisible()
  await page.screenshot({
    path: 'e2e/capturas/arquivados-barra-recolhida-escuro.png',
    clip: { x: 0, y: 0, width: 420, height: 520 },
  })
})

test('vazia: ícone grande e a dica de onde arquivar', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('memoria:tema', 'claro'))
  await page.goto('/arquivados')
  await expect(
    page.getByText(
      'Nada arquivado. Use Arquivar no menu ⋯ de uma tarefa, grupo, nota ou procedimento.',
    ),
  ).toBeVisible()
  await expect(linkArquivados(page).locator('[data-contador]')).toHaveCount(0)
  await capturar(page, 'vazia-claro')
  await page.evaluate(() => localStorage.setItem('memoria:tema', 'escuro'))
  await page.reload()
  await expect(page.getByText('Nada arquivado.', { exact: false })).toBeVisible()
  await capturar(page, 'vazia-escuro')
})
