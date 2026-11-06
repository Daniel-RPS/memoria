import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Tema (Claro, Escuro, Sistema) e fundo no navegador de verdade: lembrados ao recarregar, sem
 * piscar o tema errado ao abrir, logo legível nos dois temas, arrasto da Semana por cima do
 * fundo, fundo parado com movimento reduzido e duas abas em sincronia. No fim, capturas de
 * todas as telas nos dois temas em e2e/capturas/tema-<tela>-<tema>.png.
 */

const SEGUNDA = '2026-11-02'
const COLUNA_2 = 'segunda-feira, 2 de novembro'
const COLUNA_3 = 'terça-feira, 3 de novembro'

function temaDoHtml(page: Page) {
  return page.evaluate(() => document.documentElement.dataset.tema)
}

function seletorDeTema(page: Page) {
  return page.locator('aside').getByRole('radiogroup', { name: 'Tema' })
}

async function escolherFundo(page: Page, nome: string) {
  await page.locator('aside').getByRole('button', { name: 'Fundo', exact: true }).click()
  await page.getByRole('menuitemradio', { name: nome, exact: true }).click()
}

/** O par da logo que está à vista (o do outro tema fica `visibility: hidden`). */
function logoAnunciada(page: Page) {
  return page.locator('aside').getByRole('img', { name: 'MemorIA', exact: true })
}

/**
 * Grava o tema do <html> no fim da leitura do HTML ("interactive"): o script do index.html já
 * rodou e os módulos do app (React) ainda não. É o tema com que a página aparece.
 */
async function registrarPrimeiroTema(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return
      const janela = window as unknown as { primeiroTema?: string }
      janela.primeiroTema = document.documentElement.dataset.tema
    })
  })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${SEGUNDA}T10:00:00-03:00`))
})

test('Claro, Escuro e Sistema pelo seletor; recarregar lembra e abre sem piscar', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await registrarPrimeiroTema(page)
  await page.goto('/inicio')
  // Padrão: Sistema, que aqui está escuro.
  await expect(seletorDeTema(page).getByRole('radio', { name: 'Sistema' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(await temaDoHtml(page)).toBe('escuro')

  await seletorDeTema(page).getByRole('radio', { name: 'Claro' }).click()
  await expect.poll(() => temaDoHtml(page)).toBe('claro')
  await page.reload()
  expect(await page.evaluate(() => (window as { primeiroTema?: string }).primeiroTema)).toBe(
    'claro',
  )
  await expect(seletorDeTema(page).getByRole('radio', { name: 'Claro' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const fundoClaro = await page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  )
  expect(fundoClaro).toBe('rgb(244, 242, 248)')

  await seletorDeTema(page).getByRole('radio', { name: 'Escuro' }).click()
  await expect.poll(() => temaDoHtml(page)).toBe('escuro')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload()
  // Escolha fixa vale mais que o sistema (agora claro).
  expect(await page.evaluate(() => (window as { primeiroTema?: string }).primeiroTema)).toBe(
    'escuro',
  )

  await seletorDeTema(page).getByRole('radio', { name: 'Sistema' }).click()
  await expect.poll(() => temaDoHtml(page)).toBe('claro')
  // Sistema reage à troca do sistema operacional sem recarregar.
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => temaDoHtml(page)).toBe('escuro')

  // Ctrl+Shift+L alterna.
  await page.keyboard.press('Control+Shift+L')
  await expect.poll(() => temaDoHtml(page)).toBe('claro')
})

test('logo: "Memor" escuro no claro e branco no escuro, expandida e recolhida', async ({
  page,
}) => {
  await page.goto('/inicio')
  for (const tema of ['Claro', 'Escuro'] as const) {
    const isClaro = tema === 'Claro'
    await seletorDeTema(page).getByRole('radio', { name: tema }).click()
    await expect(page.locator('html')).toHaveAttribute('data-tema', isClaro ? 'claro' : 'escuro')
    await expect(logoAnunciada(page)).toHaveCount(1)
    await expect(logoAnunciada(page)).toHaveAttribute(
      'src',
      isClaro ? /simbolo-memoria-claro/ : /simbolo-memoria\.png/,
    )
    const nome = page.locator('aside [data-logo-nome]')
    await expect.poll(() => nome.evaluate((svg) => getComputedStyle(svg).opacity)).toBe('1')
    expect(await nome.evaluate((svg) => getComputedStyle(svg).color)).toBe(
      isClaro ? 'rgb(17, 16, 25)' : 'rgb(236, 232, 245)',
    )
    await page.screenshot({
      path: `e2e/capturas/tema-logo-${tema.toLowerCase()}-expandida.png`,
      clip: { x: 0, y: 0, width: 260, height: 90 },
    })

    await page.keyboard.press('Control+B')
    await expect(logoAnunciada(page)).toHaveAttribute(
      'src',
      isClaro ? /simbolo-memoria-claro/ : /simbolo-memoria\.png/,
    )
    await expect(page.locator('aside').getByRole('button', { name: 'Aparência' })).toBeVisible()
    // Espera a barra terminar de estreitar e o nome sumir antes da captura.
    await expect
      .poll(() =>
        page
          .locator('aside')
          .first()
          .evaluate((barra) => barra.getBoundingClientRect().width),
      )
      .toBe(64)
    await expect.poll(() => nome.evaluate((svg) => getComputedStyle(svg).opacity)).toBe('0')
    await page.screenshot({
      path: `e2e/capturas/tema-logo-${tema.toLowerCase()}-recolhida.png`,
      clip: { x: 0, y: 0, width: 90, height: 120 },
    })
    await page.keyboard.press('Control+B')
  }
})

test('trocar o fundo (até Liso) não atrapalha arrastar o card na Semana', async ({ page }) => {
  await page.goto(`/semana/${SEGUNDA}`)
  await page.evaluate(async (data) => {
    const caminho = '/src/db/repositories/group-repository.ts'
    const grupos = (await import(/* @vite-ignore */ caminho)) as {
      criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
      criarItem: (cardId: string, titulo: string) => Promise<unknown>
    }
    const card = await grupos.criarGrupo({ titulo: 'Casa', data })
    await grupos.criarItem(card.id, 'Dar banho')
  }, SEGUNDA)

  const fundo = page.locator('.fundo-do-app')
  await expect(fundo).toHaveAttribute('data-fundo', 'aurora')
  await escolherFundo(page, 'Grade de pontos')
  await expect(fundo).toHaveAttribute('data-fundo', 'pontos')
  await escolherFundo(page, 'Grade com holofote')
  await expect(fundo).toHaveAttribute('data-fundo', 'grade')
  await escolherFundo(page, 'Liso')
  await expect(fundo).toHaveCount(0)
  await escolherFundo(page, 'Aurora')
  await expect(fundo).toHaveAttribute('data-fundo', 'aurora')
  // O fundo não pega ponteiro.
  expect(await fundo.evaluate((camada) => getComputedStyle(camada).pointerEvents)).toBe('none')

  await page.reload()
  await expect(fundo).toHaveAttribute('data-fundo', 'aurora')
  const coluna = (nome: string) => page.getByRole('region', { name: nome })
  const cabecalho = (lugar: Locator) => lugar.getByRole('button', { name: /^Grupo Casa, / })
  const de = (await cabecalho(coluna(COLUNA_2)).boundingBox())!
  const para = (await coluna(COLUNA_3)
    .getByRole('list', { name: /^Pendentes de / })
    .boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 60), {
    steps: 20,
  })
  await page.mouse.up()
  await expect(page.getByText('1 item levado para amanhã')).toBeVisible()
  await expect(cabecalho(coluna(COLUNA_3))).toBeVisible()
})

test('com movimento reduzido, a aurora fica parada', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/inicio')
  const animacoes = await page
    .locator('.fundo-do-app .mancha')
    .evaluateAll((manchas) => manchas.map((mancha) => getComputedStyle(mancha).animationName))
  expect(animacoes).toEqual(['none', 'none', 'none'])

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const comMovimento = await page
    .locator('.fundo-do-app .mancha')
    .first()
    .evaluate((mancha) => getComputedStyle(mancha).animationName)
  expect(comMovimento).toBe('deriva-1')
})

test('duas abas: trocar o tema numa muda a outra', async ({ page, context }) => {
  await page.goto('/inicio')
  const outra = await context.newPage()
  await outra.goto(`/semana/${SEGUNDA}`)
  await seletorDeTema(page).getByRole('radio', { name: 'Escuro' }).click()
  await expect.poll(() => temaDoHtml(outra)).toBe('escuro')
  await expect(seletorDeTema(outra).getByRole('radio', { name: 'Escuro' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await seletorDeTema(outra).getByRole('radio', { name: 'Claro' }).click()
  await expect.poll(() => temaDoHtml(page)).toBe('claro')
})

test('5 cliques rápidos no tema terminam no último, sem animações empilhadas', async ({ page }) => {
  await page.goto('/inicio')
  await seletorDeTema(page).waitFor()
  const resultado = await page.evaluate(async () => {
    const botao = (nome: string) =>
      document.querySelector<HTMLButtonElement>(`aside [role=radiogroup] [aria-label="${nome}"]`)!
    const inicio = performance.now()
    for (const nome of ['Escuro', 'Claro', 'Escuro', 'Claro', 'Escuro']) botao(nome).click()
    const cliques = performance.now() - inicio
    const animacoes = document
      .getAnimations()
      .filter((animacao) =>
        String((animacao.effect as KeyframeEffect | null)?.pseudoElement ?? '').includes(
          'view-transition',
        ),
      )
    return { cliques, maxCrossfades: new Set(animacoes.map((a) => a.startTime)).size }
  })
  expect(resultado.cliques).toBeLessThan(200)
  expect(resultado.maxCrossfades).toBeLessThanOrEqual(1)
  await expect.poll(() => temaDoHtml(page)).toBe('escuro')
  await expect(seletorDeTema(page).getByRole('radio', { name: 'Escuro' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.reload()
  expect(await temaDoHtml(page)).toBe('escuro')
})

test('com movimento reduzido, a troca de tema é instantânea', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/inicio')
  await seletorDeTema(page).waitFor()
  const depoisDoClique = await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('aside [role=radiogroup] [aria-label="Escuro"]')!
      .click()
    return {
      tema: document.documentElement.dataset.tema,
      crossfades: document
        .getAnimations()
        .filter((animacao) =>
          String((animacao.effect as KeyframeEffect | null)?.pseudoElement ?? '').includes(
            'view-transition',
          ),
        ).length,
      fundo: getComputedStyle(document.documentElement).backgroundColor,
    }
  })
  expect(depoisDoClique.tema).toBe('escuro')
  expect(depoisDoClique.crossfades).toBe(0)
  expect(depoisDoClique.fundo).not.toBe('rgb(244, 242, 248)')
})

test('arrastar uma tarefa no Dia continua funcionando nos dois temas', async ({ page }) => {
  await page.goto(`/dia/${SEGUNDA}`)
  await page.evaluate(async (data) => {
    const caminho = '/src/db/repositories/task-repository.ts'
    const tarefas = (await import(/* @vite-ignore */ caminho)) as {
      criarTarefa: (dados: { titulo: string; data: string }) => Promise<unknown>
    }
    for (const titulo of ['Alfa', 'Beta', 'Gama']) await tarefas.criarTarefa({ titulo, data })
  }, SEGUNDA)
  const ordem = () =>
    page
      .locator('[data-flip-id]')
      .evaluateAll((linhas) =>
        linhas.map((linha) => /Alfa|Beta|Gama/.exec(linha.textContent ?? '')?.[0] ?? ''),
      )
  await expect(page.getByText('Gama')).toBeVisible()
  for (const [tema, esperado] of [
    ['Escuro', ['Gama', 'Alfa', 'Beta']],
    ['Claro', ['Beta', 'Gama', 'Alfa']],
  ] as const) {
    await seletorDeTema(page).getByRole('radio', { name: tema }).click()
    const atual = await ordem()
    const ultimo = atual[atual.length - 1]
    await page.waitForTimeout(400)
    const de = (await page
      .getByRole('button', { name: `Mover ${ultimo}`, exact: true })
      .boundingBox())!
    const para = (await page.getByText(atual[0], { exact: true }).boundingBox())!
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
    await page.mouse.down()
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 - 6, { steps: 4 })
    await page.mouse.move(para.x + 30, para.y + 2, { steps: 20 })
    await page.mouse.up()
    await expect.poll(ordem).toEqual([...esperado])
  }
})

test('capturas de todas as telas nos dois temas', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/inicio')
  await page.evaluate(async (data) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const categorias = await importar('/src/db/repositories/category-repository.ts')
    const tarefas = await importar('/src/db/repositories/task-repository.ts')
    const grupos = await importar('/src/db/repositories/group-repository.ts')
    const procedimentos = await importar('/src/db/repositories/procedure-repository.ts')
    const notas = await importar('/src/db/repositories/note-repository.ts')
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#8a5a3c' })
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#3366c2' })
    const saude = await categorias.criarCategoria({ nome: 'Saúde', cor: '#1f7a80' })
    await tarefas.criarTarefa({ titulo: 'Ligar para a clínica', data, categoryId: saude.id })
    await tarefas.criarTarefa({ titulo: 'Enviar relatório', data, categoryId: trabalho.id })
    const feita = await tarefas.criarTarefa({ titulo: 'Pagar luz', data, categoryId: casa.id })
    await tarefas.definirConclusao(feita.id, true)
    await tarefas.criarTarefa({ titulo: 'Dentista 14h', data: '2026-11-04', categoryId: saude.id })
    await tarefas.criarTarefa({ titulo: 'Renovar CNH', data: '2026-10-29' })
    const card = await grupos.criarGrupo({ titulo: 'Mercado', data, categoryId: casa.id })
    await grupos.criarItem(card.id, 'Café')
    await grupos.criarItem(card.id, 'Pão')
    const sprint = await grupos.criarGrupo({
      titulo: 'Sprint',
      data: '2026-11-03',
      categoryId: trabalho.id,
    })
    await grupos.criarItem(sprint.id, 'Revisar PR')
    await procedimentos.criarProcedimento({
      titulo: 'Fechar o mês',
      categoryId: trabalho.id,
      etapas: [
        { id: 'a', texto: 'Conferir extratos' },
        { id: 'b', texto: 'Enviar notas' },
      ],
    })
    await notas.criarNota({ titulo: 'Ideias', conteudo: 'Trocar a cortina da sala.' })
  }, SEGUNDA)

  const telas: [string, string, string][] = [
    ['inicio', '/inicio', 'Início'],
    ['dia', `/dia/${SEGUNDA}`, 'Ligar para a clínica'],
    ['semana', `/semana/${SEGUNDA}`, 'Mercado'],
    ['mes', `/mes/${SEGUNDA}`, 'novembro'],
    ['ano', '/ano/2026', '2026'],
    ['procedimentos', '/procedimentos', 'Fechar o mês'],
    ['notas', '/notas', 'Ideias'],
    ['categorias', '/categorias', 'Trabalho'],
    ['backup', '/backup', 'Backup'],
  ]
  for (const tema of ['claro', 'escuro']) {
    await page.evaluate((escolha) => localStorage.setItem('memoria:tema', escolha), tema)
    for (const [nome, caminho, texto] of telas) {
      await page.goto(caminho)
      await expect(page.getByText(texto).first()).toBeVisible()
      expect(await temaDoHtml(page)).toBe(tema)
      await page.screenshot({ path: `e2e/capturas/tema-${nome}-${tema}.png`, fullPage: true })
    }
  }
})
