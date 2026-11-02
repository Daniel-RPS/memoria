import { expect, test, type Page } from '@playwright/test'

/**
 * Procedimentos em cartões (grade por categoria) e editor de etapas compacto. Capturas em
 * e2e/capturas/procedimentos-cartoes-<fase>-*.png (FASE=antes|depois; o padrão é depois), da
 * lista e do editor, nas larguras normal e estreita, nos temas claro e escuro.
 */

const FASE = process.env.FASE ?? 'depois'

interface ModuloCategorias {
  criarCategoria: (dados: {
    nome: string
    cor?: string
    tipo?: 'grupo' | 'procedimento'
  }) => Promise<{ id: string }>
}

interface ModuloProcedimentos {
  criarProcedimento: (dados: {
    titulo: string
    categoryId: string
    etapas: { id: string; texto: string }[]
  }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    procedures: {
      toArray: () => Promise<{ titulo: string; etapas: { texto: string; ordem: number }[] }[]>
    }
  }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({
    path: `e2e/capturas/procedimentos-cartoes-${FASE}-${nome}.png`,
    fullPage: true,
  })
}

/** Casa (amarelo claro, para conferir a barra no tema claro), Trabalho e um sem categoria. */
async function semear(page: Page) {
  await page.evaluate(async () => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const categorias = (await importar(
      '/src/db/repositories/category-repository.ts',
    )) as ModuloCategorias
    const procedimentos = (await importar(
      '/src/db/repositories/procedure-repository.ts',
    )) as ModuloProcedimentos
    const etapas = (...textos: string[]) =>
      textos.map((texto) => ({ id: crypto.randomUUID(), texto }))
    const casa = await categorias.criarCategoria({
      nome: 'Casa',
      cor: '#f2c94c',
      tipo: 'procedimento',
    })
    const trabalho = await categorias.criarCategoria({
      nome: 'Trabalho',
      cor: '#2f80ed',
      tipo: 'procedimento',
    })
    await procedimentos.criarProcedimento({
      titulo: 'Trocar o filtro de água',
      categoryId: casa.id,
      etapas: etapas('Fechar o registro', 'Abrir a tampa do filtro', 'Encaixar o refil novo'),
    })
    await procedimentos.criarProcedimento({
      titulo: 'Limpar a calha antes da temporada de chuvas e conferir os ralos do quintal',
      categoryId: casa.id,
      etapas: etapas(
        'Pegar a escada',
        'Tirar as folhas',
        'Lavar com a mangueira',
        'Conferir o ralo',
        'Guardar a escada',
      ),
    })
    await procedimentos.criarProcedimento({
      titulo: 'Regar a horta',
      categoryId: casa.id,
      etapas: [],
    })
    await procedimentos.criarProcedimento({
      titulo: 'Github',
      categoryId: trabalho.id,
      etapas: etapas('Acessar github', 'Fazer deploy'),
    })
    await procedimentos.criarProcedimento({
      titulo: 'Fechamento do mês',
      categoryId: trabalho.id,
      etapas: etapas(
        'Baixar o extrato',
        'Conferir notas fiscais',
        'Lançar na planilha',
        'Enviar para a contabilidade',
        'Arquivar comprovantes',
        'Pagar impostos',
        'Avisar a equipe',
      ),
    })
    await procedimentos.criarProcedimento({
      titulo: 'Backup do notebook',
      categoryId: '',
      etapas: etapas('Conectar o disco externo', 'Abrir o programa de backup'),
    })
  })
}

async function lerEtapas(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [procedimento] = await db.procedures.toArray()
    return [...(procedimento?.etapas ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((etapa) => etapa.texto)
  })
}

/** Janela estreita: 420px com a barra lateral recolhida (Ctrl+B), como numa tela pequena. */
async function estreitar(page: Page) {
  await page.setViewportSize({ width: 420, height: 900 })
  await page.locator('body').click({ position: { x: 300, y: 5 } })
  await page.keyboard.press('Control+b')
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  // Espera a barra terminar de recolher (a captura não pega o meio da animação).
  await page.waitForTimeout(400)
}

function bloco(page: Page, nome: string) {
  return page.getByRole('region', { name: nome, exact: true })
}

function cartao(page: Page, titulo: string | RegExp) {
  return page.getByRole('link', { name: titulo })
}

test('capturas: lista e editor, larguras e temas', async ({ page }) => {
  await page.goto('/procedimentos')
  await semear(page)
  await expect(cartao(page, /Github/)).toBeVisible()
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.setViewportSize({ width: 1680, height: 1000 })
    await capturar(page, `lista-normal-${tema}`)
    await page.setViewportSize({ width: 900, height: 1000 })
    await capturar(page, `lista-media-${tema}`)
    await estreitar(page)
    await capturar(page, `lista-estreita-${tema}`)
    await page.keyboard.press('Control+b')
  }

  await page.setViewportSize({ width: 1680, height: 1000 })
  await cartao(page, /Fechamento do mês/).click()
  await expect(page.getByRole('status')).toHaveText('Salvo')
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.setViewportSize({ width: 1680, height: 1000 })
    await capturar(page, `editor-normal-${tema}`)
    await estreitar(page)
    await capturar(page, `editor-estreita-${tema}`)
    await page.keyboard.press('Control+b')
  }
})

test('cartões em grade, agrupados por categoria, com "Sem categoria" no fim', async ({ page }) => {
  await page.goto('/procedimentos')
  await semear(page)
  await expect(cartao(page, /Github/)).toBeVisible()

  const blocos = await page
    .getByRole('region', { name: 'Lista de procedimentos' })
    .getByRole('heading', { level: 2 })
    .allTextContents()
  expect(blocos).toEqual(['Casa3', 'Trabalho2', 'Sem categoria1'])

  // Largura normal: 3 colunas (os 3 cartões de Casa na mesma linha, com a mesma altura).
  const caixas = await bloco(page, 'Casa')
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => {
        const { top, left, height } = link.getBoundingClientRect()
        return { top: Math.round(top), left: Math.round(left), height: Math.round(height) }
      }),
    )
  expect(new Set(caixas.map((caixa) => caixa.top)).size).toBe(1)
  expect(new Set(caixas.map((caixa) => caixa.height)).size).toBe(1)
  expect(new Set(caixas.map((caixa) => caixa.left)).size).toBe(3)

  // Média: 2 colunas; estreita: 1.
  const colunas = async () =>
    new Set(
      await bloco(page, 'Casa')
        .getByRole('link')
        .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().left))),
    ).size
  await page.setViewportSize({ width: 900, height: 1000 })
  await expect.poll(colunas).toBe(2)
  await estreitar(page)
  await expect.poll(colunas).toBe(1)
})

test('cartão mostra título, prévia e contagem; clicar e Enter abrem o editor', async ({ page }) => {
  await page.goto('/procedimentos')
  await semear(page)

  const fechamento = cartao(page, /Fechamento do mês/)
  await expect(fechamento).toContainText('1. Baixar o extrato')
  await expect(fechamento).toContainText('3. Lançar na planilha')
  await expect(fechamento).not.toContainText('Enviar para a contabilidade')
  await expect(fechamento).toContainText('+ 4 etapas')
  await expect(fechamento).toContainText('7 etapas')
  await expect(cartao(page, /Regar a horta/)).toContainText('Nenhuma etapa ainda')
  await expect(cartao(page, /Github/)).toContainText('2 etapas')

  await cartao(page, /Github/).click()
  await expect(page.getByLabel('Etapa 1', { exact: true })).toHaveValue('Acessar github')
  await page.goBack()

  // Teclado: o foco chega no cartão (anel visível) e Enter abre.
  await page.getByRole('searchbox', { name: 'Buscar procedimentos' }).focus()
  const backup = cartao(page, /Backup do notebook/)
  // Passa pelo filtro de dia, "Expandir/Recolher tudo" e cabeçalhos dos blocos.
  for (let passo = 0; passo < 20; passo++) {
    await page.keyboard.press('Tab')
    if (await backup.evaluate((link) => link === document.activeElement)) break
  }
  await expect(backup).toBeFocused()
  expect(await backup.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Etapa 1', { exact: true })).toHaveValue('Conectar o disco externo')
})

test('busca filtra os cartões e esconde os blocos vazios', async ({ page }) => {
  await page.goto('/procedimentos')
  await semear(page)
  const busca = page.getByRole('searchbox', { name: 'Buscar procedimentos' })
  const lista = page.getByRole('region', { name: 'Lista de procedimentos' })

  await busca.fill('deploy')
  await expect(cartao(page, /Github/)).toBeVisible()
  await expect(lista.getByRole('link')).toHaveCount(1)
  await expect(bloco(page, 'Casa')).toHaveCount(0)
  await expect(bloco(page, 'Sem categoria')).toHaveCount(0)

  await busca.fill('escada')
  await expect(cartao(page, /Limpar a calha/)).toBeVisible()
  await expect(bloco(page, 'Trabalho')).toHaveCount(0)

  await busca.fill('impressora')
  await expect(page.getByText('Nenhum procedimento encontrado.')).toBeVisible()
  await expect(lista.getByRole('link')).toHaveCount(0)
})

test('editor: "Etapa N" na linha do texto, numeração, lixeira no hover/foco e teclado', async ({
  page,
}) => {
  await page.goto('/procedimentos/novo')
  await page.getByLabel('Título').fill('Trocar o filtro')
  await page.getByRole('button', { name: 'Adicionar etapa' }).click()
  // Enter cria a próxima etapa já focada.
  await page.keyboard.type('Fechar o registro')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Abrir a tampa')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Encaixar o refil')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toHaveValue('Encaixar o refil')
  await page.getByRole('button', { name: 'Criar procedimento' }).click()
  await expect(page.getByRole('status')).toHaveText('Salvo')

  // Rótulo e texto na mesma linha: mesmo topo (o número não fica embaixo do "Etapa").
  const etapa1 = page.getByLabel('Etapa 1', { exact: true })
  const rotulo = page.locator('label', { hasText: /^Etapa 1$/ })
  const caixaRotulo = await rotulo.boundingBox()
  const caixaTexto = await etapa1.boundingBox()
  if (!caixaRotulo || !caixaTexto) throw new Error('Etapa 1 sem caixa na tela')
  expect(Math.abs(caixaRotulo.y - caixaTexto.y)).toBeLessThanOrEqual(4)
  expect(caixaRotulo.height).toBeLessThanOrEqual(caixaTexto.height)
  expect(caixaRotulo.x + caixaRotulo.width).toBeLessThanOrEqual(caixaTexto.x)
  const caixaLinha = await page.getByRole('listitem').filter({ has: etapa1 }).boundingBox()
  expect(caixaLinha?.height ?? 0).toBeGreaterThanOrEqual(34)
  expect(caixaLinha?.height ?? 99).toBeLessThanOrEqual(42)

  // Lixeira escondida até o hover ou o foco.
  await page.getByRole('heading', { name: 'Etapas' }).click()
  const lixeira2 = page.getByRole('button', { name: 'Excluir etapa 2' })
  await expect(lixeira2).toHaveCSS('opacity', '0')
  await page.getByLabel('Etapa 2', { exact: true }).hover()
  await expect(lixeira2).toHaveCSS('opacity', '1')
  await page.mouse.move(0, 0)
  await expect(lixeira2).toHaveCSS('opacity', '0')
  await lixeira2.focus()
  await expect(lixeira2).toHaveCSS('opacity', '1')
  await capturar(page, 'editor-lixeira-foco')

  // Renomear a 2ª, excluir a 1ª: fica 1 e 2, na ordem.
  await page.getByLabel('Etapa 2', { exact: true }).fill('Desrosquear a tampa')
  await page.getByLabel('Etapa 1', { exact: true }).hover()
  await page.getByRole('button', { name: 'Excluir etapa 1' }).click()
  await expect(page.getByLabel('Etapa 1', { exact: true })).toHaveValue('Desrosquear a tampa')
  await expect(page.getByLabel('Etapa 2', { exact: true })).toHaveValue('Encaixar o refil')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Salvo')
  await expect.poll(() => lerEtapas(page)).toEqual(['Desrosquear a tampa', 'Encaixar o refil'])

  // Backspace numa etapa vazia apaga e volta para a anterior.
  await page.getByLabel('Etapa 2', { exact: true }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toBeFocused()
  await page.keyboard.press('Backspace')
  await expect(page.getByLabel('Etapa 3', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Etapa 2', { exact: true })).toBeFocused()
  await expect(page.getByRole('status')).toHaveText('Salvo')
  await expect.poll(() => lerEtapas(page)).toEqual(['Desrosquear a tampa', 'Encaixar o refil'])
})
