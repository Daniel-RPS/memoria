import { expect, test, type Locator, type Page } from '@playwright/test'
import { AGORA, fixarTema, semearAjustes } from './semear-ajustes.ts'

/**
 * Notas com blocos recolhíveis (lembrados), filtro por dia e Recentes por dia; Procedimentos com
 * filtro pelo dia de criação; ícones (emoji e marca) em procedimentos e categorias. Capturas em
 * e2e/capturas/ajustes-depois-*.png.
 */

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/ajustes-depois-${nome}.png`, fullPage: true })
}

function lista(page: Page) {
  return page.getByRole('region', { name: 'Lista de notas' })
}

function bloco(page: Page, nome: string) {
  return lista(page).getByRole('region', { name: nome, exact: true })
}

/** Botão do cabeçalho do bloco (abre e fecha). */
function cabecalho(regiao: Locator) {
  return regiao.getByRole('heading').getByRole('button')
}

async function irPara(page: Page, tela: string) {
  await page.getByRole('navigation', { name: 'Telas' }).getByRole('link', { name: tela }).click()
}

async function escolherFiltroDeDia(page: Page, rotulo: RegExp, opcao: string) {
  await page.getByRole('button', { name: rotulo }).click()
  await page.getByRole('option', { name: opcao }).click()
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000)
  await page.clock.setFixedTime(AGORA)
})

test('Notas: recolher e expandir blocos em "Por categoria" e "Por grupo", lembrado ao recarregar', async ({
  page,
}) => {
  await page.goto('/notas')
  await semearAjustes(page)

  const casa = bloco(page, 'Casa')
  await expect(cabecalho(casa)).toHaveAttribute('aria-expanded', 'true')
  await expect(casa.getByRole('article')).toHaveCount(2)

  // Teclado: Tab chega no cabeçalho e Enter fecha.
  await cabecalho(casa).focus()
  await page.keyboard.press('Enter')
  await expect(cabecalho(casa)).toHaveAttribute('aria-expanded', 'false')
  await expect(casa.getByRole('article')).toHaveCount(0) // fechado = fora do leitor de tela
  await capturar(page, 'notas-categoria-recolhido')

  await page.getByRole('radio', { name: 'Por grupo' }).click()
  const hostinger = bloco(page, 'Hostinger')
  await cabecalho(hostinger).click()
  await expect(cabecalho(hostinger)).toHaveAttribute('aria-expanded', 'false')
  // Espaço também alterna.
  await cabecalho(bloco(page, 'Tarefas soltas')).focus()
  await page.keyboard.press('Space')
  await expect(cabecalho(bloco(page, 'Tarefas soltas'))).toHaveAttribute('aria-expanded', 'false')

  await page.reload()
  // O modo e o que estava recolhido em cada modo voltam.
  await expect(cabecalho(bloco(page, 'Hostinger'))).toHaveAttribute('aria-expanded', 'false')
  await expect(cabecalho(bloco(page, 'Casa'))).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('radio', { name: 'Por categoria' }).click()
  await expect(cabecalho(bloco(page, 'Casa'))).toHaveAttribute('aria-expanded', 'false')
  await expect(cabecalho(bloco(page, 'Hostinger'))).toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Recolher tudo' }).click()
  for (const nome of ['Casa', 'Hostinger', 'Notas avulsas']) {
    await expect(cabecalho(bloco(page, nome))).toHaveAttribute('aria-expanded', 'false')
  }
  await expect(page.getByRole('button', { name: 'Recolher tudo' })).toBeDisabled()
  await capturar(page, 'notas-tudo-recolhido')
  await page.getByRole('button', { name: 'Expandir tudo' }).click()
  for (const nome of ['Casa', 'Hostinger', 'Notas avulsas']) {
    await expect(cabecalho(bloco(page, nome))).toHaveAttribute('aria-expanded', 'true')
  }
})

test('Notas: filtro "Hoje" e "Escolher data…" nos três modos, com a busca', async ({ page }) => {
  await page.goto('/notas')
  await semearAjustes(page)
  // Bloco recolhido abre sozinho enquanto há filtro.
  await cabecalho(bloco(page, 'Casa')).click()

  await escolherFiltroDeDia(page, /Filtrar pelo dia da edição/, 'Hoje')
  await expect(page.getByRole('button', { name: 'Filtrar pelo dia da edição: Hoje' })).toBeVisible()
  await expect(lista(page).getByRole('article')).toHaveCount(2)
  await expect(cabecalho(bloco(page, 'Casa'))).toHaveAttribute('aria-expanded', 'true')
  await expect(bloco(page, 'Notas avulsas')).toHaveCount(0) // sem resultado, some
  await capturar(page, 'notas-filtro-hoje-categoria')

  await page.getByRole('radio', { name: 'Por grupo' }).click()
  await expect(lista(page).getByRole('article')).toHaveCount(2)
  await expect(bloco(page, 'Hostinger').getByRole('article')).toHaveCount(1)
  await page.getByRole('radio', { name: 'Recentes' }).click()
  await expect(bloco(page, 'Hoje').getByRole('article')).toHaveCount(2)
  await expect(bloco(page, 'Ontem')).toHaveCount(0)

  // Escolher data… → 30/10 (dia só).
  await page.getByRole('button', { name: /Filtrar pelo dia da edição/ }).click()
  await page.getByRole('option', { name: 'Escolher data…' }).click()
  await capturar(page, 'notas-filtro-calendario')
  // Novembro aberto: 30/10 aparece como dia de fora do mês.
  await page.locator('[data-day="30/10/2026"]').click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Filtrar pelo dia da edição: 30/10' }),
  ).toBeVisible()
  await expect(bloco(page, 'sexta, 30/10').getByRole('article')).toHaveCount(2)
  await page.getByRole('radio', { name: 'Por categoria' }).click()
  await expect(lista(page).getByRole('article')).toHaveCount(2)
  await expect(bloco(page, 'Notas avulsas').getByRole('article')).toHaveCount(1)

  // Junto com a busca.
  await page.getByRole('searchbox').fill('aspirador')
  await expect(lista(page).getByRole('article')).toHaveCount(1)
  await page.getByRole('searchbox').fill('build')
  await expect(page.getByText('Nenhuma nota com “build”.')).toBeVisible()

  // Lembrado ao recarregar; "×" limpa.
  await page.getByRole('searchbox').fill('')
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Filtrar pelo dia da edição: 30/10' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtro de dia' }).click()
  await expect(lista(page).getByRole('article')).toHaveCount(6)
  // Sem filtro, o bloco recolhido antes volta a ficar recolhido.
  await expect(cabecalho(bloco(page, 'Casa'))).toHaveAttribute('aria-expanded', 'false')
})

test('Notas: Recentes separadas por dia, cada dia recolhe', async ({ page }) => {
  await page.goto('/notas')
  await semearAjustes(page)
  await page.getByRole('radio', { name: 'Recentes' }).click()

  const titulos = lista(page).getByRole('heading', { level: 2 })
  await expect(titulos).toHaveText(['Hoje2', 'Ontem1', 'sexta, 30/102', '30/10/20251'])
  // Dentro do dia, a mais recente primeiro.
  await expect(bloco(page, 'Hoje').getByRole('article')).toHaveText([
    /Lembrete do envio/,
    /Rodar build antes/,
  ])
  // 23:59 de ontem fica em "Ontem" (não em hoje, apesar de já ser dia 2 em UTC).
  await expect(bloco(page, 'Ontem').getByRole('article')).toHaveText([/Acesso ao painel/])
  await capturar(page, 'notas-recentes')

  await cabecalho(bloco(page, 'Ontem')).click()
  await expect(cabecalho(bloco(page, 'Ontem'))).toHaveAttribute('aria-expanded', 'false')
  await expect(bloco(page, 'Ontem').getByRole('article')).toHaveCount(0)
  await capturar(page, 'notas-recentes-recolhido')
})

test('Notas: a linha de vínculo não corta "09:00" no meio', async ({ page }) => {
  for (const largura of [1440, 1024, 820]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto('/notas')
    if (largura === 1440) await semearAjustes(page)
    const link = lista(page).getByRole('link', { name: /Tarefa Mandar tal coisa às 09:00/ })
    await expect(link).toBeVisible()
    const linhas = await link.evaluate((elemento) => {
      const texto = [...elemento.querySelectorAll('span')]
        .map((span) => span.firstChild)
        .find((no) => no?.nodeType === Node.TEXT_NODE && no.textContent?.includes('09:00'))
      if (!texto?.textContent) return -1
      const intervalo = document.createRange()
      const inicio = texto.textContent.indexOf('09:00')
      intervalo.setStart(texto, inicio)
      intervalo.setEnd(texto, inicio + '09:00'.length)
      return new Set([...intervalo.getClientRects()].map((retangulo) => Math.round(retangulo.top)))
        .size
    })
    expect(linhas, `largura ${largura}`).toBe(1)
    expect(
      await link.evaluate(
        (elemento) => getComputedStyle(elemento.querySelector('span:last-child')!).hyphens,
      ),
    ).not.toBe('auto')
  }
})

test('Procedimentos: filtro pelo dia de criação esconde os que não batem e os blocos vazios', async ({
  page,
}) => {
  await page.goto('/procedimentos')
  await semearAjustes(page)
  const regiao = page.getByRole('region', { name: 'Lista de procedimentos' })
  await expect(regiao.getByRole('link')).toHaveCount(4)

  // Rodapé: criado e editado em dias diferentes mostra os dois.
  const release = regiao.getByRole('link', { name: /Publicar release/ })
  await expect(release).toContainText('criado 01/11 · editado 02/11')
  await expect(regiao.getByRole('link', { name: /^Github/ })).toContainText('criado em 02/11')

  await escolherFiltroDeDia(page, /Filtrar pelo dia da criação/, 'Hoje')
  await expect(
    page.getByRole('button', { name: 'Filtrar pelo dia da criação: Criado em: hoje' }),
  ).toBeVisible()
  await expect(regiao.getByRole('link')).toHaveCount(1)
  await expect(regiao.getByRole('region', { name: 'Servidor' })).toHaveCount(0)
  await expect(regiao.getByRole('region', { name: 'Sem categoria' })).toHaveCount(0)
  await capturar(page, 'procedimentos-filtro-hoje')

  await escolherFiltroDeDia(page, /Filtrar pelo dia da criação/, 'Este mês')
  await expect(regiao.getByRole('link')).toHaveCount(2)

  await page.getByRole('button', { name: /Filtrar pelo dia da criação/ }).click()
  await page.getByRole('option', { name: 'Escolher data…' }).click()
  await page.getByRole('button', { name: /anterior/i }).click()
  await page.locator('[data-day="20/10/2026"]').click()
  await page.keyboard.press('Escape')
  await expect(regiao.getByRole('link')).toHaveCount(1)
  await expect(regiao.getByRole('region', { name: 'Servidor' })).toBeVisible()

  await page.getByRole('searchbox').fill('github')
  await expect(page.getByText('Nenhum procedimento encontrado.')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Filtrar pelo dia da criação: Criado em: 20/10' }),
  ).toBeVisible()
})

test('Ícones: GitHub no procedimento e emoji na categoria Casa aparecem em todo lugar', async ({
  page,
}) => {
  await page.goto('/procedimentos')
  await semearAjustes(page)

  // Procedimento "Github" ← ícone do GitHub.
  await page.getByRole('link', { name: /^Github/ }).click()
  const botaoIcone = page.getByRole('button', { name: 'Ícone do procedimento' })
  await botaoIcone.click()
  await capturar(page, 'seletor-emoji')
  await page.getByRole('dialog').getByRole('tab', { name: 'Marcas' }).click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'GitHub', exact: true }),
  ).toBeVisible()
  await capturar(page, 'seletor-marcas')
  await page.getByRole('dialog').getByRole('button', { name: 'GitHub', exact: true }).click()
  await expect(botaoIcone.locator('[data-marca="github"]')).toBeVisible()
  await expect(page.getByText('Salvo')).toBeVisible()

  await irPara(page, 'Procedimentos')
  const cartao = page.getByRole('link', { name: /^Github/ })
  await expect(cartao.locator('[data-marca="github"]')).toBeVisible()
  // O bloco da categoria "Github" (de Procedimentos) mostra o ícone dela.
  await page.getByRole('searchbox').fill('github')
  await expect(cartao).toBeVisible()
  await capturar(page, 'procedimentos-icone')

  // Categoria "Casa" ← emoji 🏠 (busca em português).
  await irPara(page, 'Categorias')
  await page.getByRole('button', { name: 'Ícone da categoria Casa' }).click()
  const painel = page.getByRole('dialog')
  await painel.getByRole('searchbox', { name: 'Buscar emoji' }).fill('casa')
  await painel.getByRole('gridcell', { name: 'Casa', exact: true }).click()
  const linhaCasa = page.getByRole('button', { name: 'Ícone da categoria Casa' })
  await expect(linhaCasa).toContainText('🏠')
  await capturar(page, 'categorias-icones')

  // "Usados recentemente" mostra o emoji escolhido.
  await page.getByRole('button', { name: 'Ícone da categoria Hostinger' }).click()
  await expect(
    page.getByRole('dialog').getByRole('region', { name: 'Usados recentemente' }).getByText('🏠'),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  // Seletor de categoria (filtro da aba Notas) e blocos.
  await irPara(page, 'Notas')
  await expect(bloco(page, 'Casa').getByRole('heading')).toContainText('🏠')
  await page.getByRole('button', { name: /Filtrar por categoria/ }).click()
  await expect(page.getByRole('menuitemradio', { name: /Casa/ })).toContainText('🏠')
  await page.keyboard.press('Escape')

  // Cards de grupo: Dia e Semana (o Início só resume o dia em números).
  await irPara(page, 'Dia')
  await expect(page.getByLabel('Grupo Casa', { exact: true }).first()).toContainText('🏠')
  await irPara(page, 'Semana')
  await expect(page.getByText('🏠').first()).toBeVisible()
  await capturar(page, 'semana-icone')
})

test('Ícones: marca escura (GitHub) fica legível no tema escuro', async ({ page }) => {
  await fixarTema(page, 'escuro')
  await page.goto('/procedimentos')
  const { github } = await semearAjustes(page)
  await page.evaluate(async (id) => {
    const caminho = '/src/db/repositories/procedure-repository.ts'
    const modulo = (await import(/* @vite-ignore */ caminho)) as {
      obterProcedimento: (
        id: string,
      ) => Promise<{ titulo: string; etapas: { id: string; texto: string }[] }>
      salvarProcedimento: (id: string, dados: Record<string, unknown>) => Promise<void>
    }
    const atual = await modulo.obterProcedimento(id)
    await modulo.salvarProcedimento(id, {
      titulo: atual.titulo,
      categoryId: '',
      etapas: atual.etapas,
      icone: { tipo: 'marca', valor: 'github' },
    })
  }, github.procedimentoId)

  const icone = page.getByRole('link', { name: /^Github/ }).locator('[data-marca="github"]')
  await expect(icone).toBeVisible()
  const contraste = await icone.evaluate((elemento) => {
    const canal = (valor: number) => {
      const c = valor / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const luminancia = (cor: string) => {
      const [r, g, b] = (cor.match(/[\d.]+/g) ?? []).map(Number)
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
    }
    const papel = getComputedStyle(document.documentElement).getPropertyValue('--papel').trim()
    const amostra = document.createElement('span')
    amostra.style.color = papel
    document.body.append(amostra)
    const fundo = getComputedStyle(amostra).color
    amostra.remove()
    const [a, b] = [luminancia(getComputedStyle(elemento).backgroundColor), luminancia(fundo)]
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
  expect(contraste).toBeGreaterThanOrEqual(3)
  await capturar(page, 'procedimentos-icone-escuro')
})
