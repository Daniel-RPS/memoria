import { expect, test, type Page } from '@playwright/test'

/**
 * Visão Dia em duas seções ("Grupos" e "Tarefas soltas"), modo Lista/Colunas e ordem lembrados,
 * Colunas vira Lista na janela estreita. Capturas em e2e/capturas/dia-<cenário>.png.
 */

const HOJE = '2026-11-03'
const ONTEM = '2026-11-02'
const AMANHA = '2026-11-04'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<unknown>
}

interface ModuloTarefas {
  criarTarefa: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
  moverTarefas: (ids: string[], destino: string) => Promise<unknown>
  definirConclusao: (id: string, concluida: boolean) => Promise<unknown>
}

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    groupCards: { toArray: () => Promise<{ id: string; data: string }[]> }
    groupItems: {
      toArray: () => Promise<{ cardId: string; titulo: string; status: string; ordem: number }[]>
    }
  }
}

/** Dia cheio: Casa (2 itens) e Livros (1 item); três soltas (uma atrasada, uma feita). */
async function semearDia(page: Page) {
  await page.evaluate(
    async ({ hoje, ontem }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const categorias = (await importar(
        '/src/db/repositories/category-repository.ts',
      )) as ModuloCategorias
      const pessoal = await categorias.criarCategoria({ nome: 'Pessoal', cor: '#2f8a57' })
      const estudos = await categorias.criarCategoria({ nome: 'Estudos', cor: '#5b4fbf' })
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: pessoal.id })
      await grupos.criarItem(casa.id, 'Lavar louça')
      await grupos.criarItem(casa.id, 'Regar plantas')
      const livros = await grupos.criarGrupo({
        titulo: 'Livros',
        data: hoje,
        categoryId: estudos.id,
      })
      await grupos.criarItem(livros.id, 'Ler capítulo 3')
      const curso = await tarefas.criarTarefa({
        titulo: 'Fazer curso',
        data: ontem,
        categoryId: estudos.id,
      })
      await tarefas.moverTarefas([curso.id], hoje)
      await tarefas.criarTarefa({ titulo: 'Ligar para o dentista', data: hoje })
      const feita = await tarefas.criarTarefa({ titulo: 'Pagar conta', data: hoje })
      await tarefas.definirConclusao(feita.id, true)
    },
    { hoje: HOJE, ontem: ONTEM },
  )
}

/** Cards de Casa no banco, por dia, com os itens: `{ data, itens: ['[ ] Regar plantas'] }`. */
async function lerCasa(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const marca: Record<string, string> = {
      pendente: '[ ]',
      concluido: '[x]',
      transferido: '[→]',
      arquivado: '[a]',
    }
    const [cards, itens] = await Promise.all([db.groupCards.toArray(), db.groupItems.toArray()])
    return cards
      .map((card) => ({
        data: card.data,
        itens: itens
          .filter((item) => item.cardId === card.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => `${marca[item.status]} ${item.titulo}`),
      }))
      .filter((card) => card.itens.some((item) => /louça|plantas/.test(item)))
      .sort((a, b) => a.data.localeCompare(b.data))
  })
}

/** Abre o Dia já com os dados semeados (a semeadura precisa de uma página do app aberta). */
async function abrirDiaCheio(page: Page, tema: 'claro' | 'escuro' = 'claro') {
  await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
  await semearDia(page)
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByText('Fazer curso')).toBeVisible()
}

function secao(page: Page, nome: 'Grupos' | 'Tarefas soltas') {
  return page.getByRole('region', { name: nome, exact: true })
}

function cabecalho(page: Page, nome: 'Grupos' | 'Tarefas soltas') {
  return secao(page, nome).getByRole('button', { name: new RegExp(`^${nome}, `) })
}

async function escolherModo(page: Page, modo: 'Lista' | 'Colunas') {
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: modo })
    .click()
}

/** Esquerda e topo de cada seção, para saber se estão lado a lado ou empilhadas. */
async function posicoes(page: Page) {
  const grupos = await secao(page, 'Grupos').boundingBox()
  const soltas = await secao(page, 'Tarefas soltas').boundingBox()
  if (!grupos || !soltas) throw new Error('Seções sem posição')
  return { grupos, soltas }
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/dia-${nome}.png`, fullPage: true })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${AMANHA}`)
})

test('abre com as duas seções, contagens certas e grupos recolhidos', async ({ page }) => {
  await abrirDiaCheio(page)

  await expect(cabecalho(page, 'Grupos')).toHaveAccessibleName('Grupos, 2 grupos')
  await expect(cabecalho(page, 'Grupos')).toContainText('Grupos·2')
  await expect(cabecalho(page, 'Tarefas soltas')).toHaveAccessibleName(
    'Tarefas soltas, 2 pendentes de 3',
  )
  await expect(cabecalho(page, 'Tarefas soltas')).toContainText('2/3')
  for (const grupo of ['Casa', 'Livros']) {
    await expect(page.getByRole('button', { name: `Abrir ${grupo}` })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  }
  await expect(page.getByText('pendente há 1 dia')).toBeVisible()
  // Sem a barra antiga embaixo: criar fica no cabeçalho de cada seção.
  await expect(page.getByRole('textbox', { name: 'Nova tarefa' })).toHaveCount(0)
  await expect(secao(page, 'Grupos').getByRole('button', { name: 'Novo grupo' })).toBeVisible()
  await expect(
    secao(page, 'Tarefas soltas').getByRole('button', { name: 'Nova tarefa' }),
  ).toBeVisible()
})

test('recolher "Tarefas soltas" esconde as tarefas e mantém cabeçalho e contagem', async ({
  page,
}) => {
  await abrirDiaCheio(page)

  await cabecalho(page, 'Tarefas soltas').click()
  await expect(page.getByText('Fazer curso')).toBeHidden()
  await expect(cabecalho(page, 'Tarefas soltas')).toHaveAttribute('aria-expanded', 'false')
  await expect(cabecalho(page, 'Tarefas soltas')).toContainText('2/3')
  await capturar(page, 'soltas-recolhidas')

  await cabecalho(page, 'Tarefas soltas').click()
  await expect(page.getByText('Fazer curso')).toBeVisible()
})

test('Colunas põe as seções lado a lado e fica lembrado ao recarregar', async ({ page }) => {
  await abrirDiaCheio(page)
  const lista = await posicoes(page)
  expect(lista.soltas.y).toBeGreaterThan(lista.grupos.y)

  await escolherModo(page, 'Colunas')
  await expect.poll(async () => (await posicoes(page)).soltas.x).toBeGreaterThan(lista.grupos.x)
  const colunas = await posicoes(page)
  expect(colunas.soltas.y).toBe(colunas.grupos.y)

  await page.reload()
  await expect(page.getByText('Fazer curso')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Colunas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const depois = await posicoes(page)
  expect(depois.soltas.x).toBeGreaterThan(depois.grupos.x)

  // Coluna recolhida vira uma faixa estreita e a outra ocupa o espaço.
  await cabecalho(page, 'Grupos').click()
  await expect.poll(async () => (await posicoes(page)).grupos.width).toBeLessThan(60)
  await capturar(page, 'colunas-grupos-recolhidos')
})

test('"Tarefas soltas primeiro" inverte a ordem e fica lembrado', async ({ page }) => {
  await abrirDiaCheio(page)

  await page.getByRole('button', { name: 'Opções da visualização' }).click()
  await page.getByRole('menuitemradio', { name: 'Tarefas soltas primeiro' }).click()
  await expect
    .poll(async () => {
      const { grupos, soltas } = await posicoes(page)
      return soltas.y < grupos.y
    })
    .toBe(true)

  await escolherModo(page, 'Colunas')
  await expect
    .poll(async () => {
      const { grupos, soltas } = await posicoes(page)
      return soltas.x < grupos.x
    })
    .toBe(true)

  await page.reload()
  await expect(page.getByText('Fazer curso')).toBeVisible()
  const { grupos, soltas } = await posicoes(page)
  expect(soltas.x).toBeLessThan(grupos.x)
})

for (const modo of ['Lista', 'Colunas'] as const) {
  test(`marcar e desmarcar atualiza as contagens na hora (${modo})`, async ({ page }) => {
    await abrirDiaCheio(page)
    await escolherModo(page, modo)

    await page.getByRole('checkbox', { name: 'Concluir Ligar para o dentista' }).click()
    await expect(cabecalho(page, 'Tarefas soltas')).toHaveAccessibleName(
      'Tarefas soltas, 1 pendente de 3',
    )
    await expect(page.getByRole('button', { name: 'Concluídas (2)' })).toBeVisible()
    await page.getByRole('button', { name: 'Concluídas (2)' }).click()
    await page.getByRole('checkbox', { name: 'Desmarcar Ligar para o dentista' }).click()
    await expect(cabecalho(page, 'Tarefas soltas')).toHaveAccessibleName(
      'Tarefas soltas, 2 pendentes de 3',
    )

    const casa = page.getByRole('region', { name: 'Grupo Casa' })
    await page.getByRole('button', { name: 'Abrir Casa' }).click()
    await casa.getByRole('checkbox', { name: 'Concluir Lavar louça' }).click()
    await expect(casa.getByText('1/2')).toBeVisible()
    await casa.getByRole('checkbox', { name: 'Desmarcar Lavar louça' }).click()
    await expect(casa.getByText('0/2')).toBeVisible()
  })
}

test('levar o grupo para amanhã no modo Colunas duplica como antes', async ({ page }) => {
  await abrirDiaCheio(page)
  await escolherModo(page, 'Colunas')
  const casa = page.getByRole('region', { name: 'Grupo Casa' })
  await page.getByRole('button', { name: 'Abrir Casa' }).click()
  await casa.getByRole('checkbox', { name: 'Concluir Lavar louça' }).click()
  await expect(casa.getByText('1/2')).toBeVisible()

  await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
  await page.getByRole('menuitem', { name: 'Levar pendentes para amanhã' }).click()

  await expect
    .poll(() => lerCasa(page))
    .toEqual([
      { data: HOJE, itens: ['[x] Lavar louça', '[→] Regar plantas'] },
      { data: AMANHA, itens: ['[ ] Regar plantas'] },
    ])
  // O original fica no dia, encerrado, com o feito e o transferido.
  await expect(casa.getByText('encerrado')).toBeVisible()
})

test('janela estreita: Colunas vira Lista sem perder a preferência', async ({ page }) => {
  await abrirDiaCheio(page)
  await escolherModo(page, 'Colunas')
  await page.setViewportSize({ width: 820, height: 1000 })

  await expect
    .poll(async () => {
      const { grupos, soltas } = await posicoes(page)
      return soltas.y > grupos.y && Math.abs(soltas.x - grupos.x) < 2
    })
    .toBe(true)
  await expect(page.getByRole('button', { name: 'Colunas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await capturar(page, 'estreita-colunas')

  await page.setViewportSize({ width: 1680, height: 1000 })
  await expect
    .poll(async () => (await posicoes(page)).soltas.y)
    .toBe((await posicoes(page)).grupos.y)
})

test('dia vazio mostra as duas seções com texto de vazio e o botão de criar', async ({ page }) => {
  await expect(cabecalho(page, 'Grupos')).toHaveAccessibleName('Grupos, 0 grupos')
  await expect(secao(page, 'Grupos').getByText('Nenhum grupo neste dia')).toBeVisible()
  await expect(secao(page, 'Tarefas soltas').getByText('Nenhuma tarefa solta')).toBeVisible()

  await secao(page, 'Tarefas soltas').getByRole('button', { name: 'Nova tarefa' }).click()
  const campo = page.getByRole('textbox', { name: 'Nova tarefa' })
  await expect(campo).toBeFocused()
  await campo.fill('Comprar pão')
  await campo.press('Enter')
  await expect(page.getByText('Comprar pão')).toBeVisible()
  await expect(secao(page, 'Tarefas soltas').getByText('Nenhuma tarefa solta')).toBeHidden()

  await secao(page, 'Grupos').getByRole('button', { name: 'Novo grupo' }).click()
  await page.getByRole('textbox', { name: 'Novo grupo' }).fill('Mercado')
  await page.getByRole('textbox', { name: 'Novo grupo' }).press('Enter')
  await expect(page.getByRole('region', { name: 'Grupo Mercado' })).toBeVisible()
  await expect(cabecalho(page, 'Grupos')).toHaveAccessibleName('Grupos, 1 grupo')
})

test('capturas: Lista e Colunas, claro e escuro, cheio e vazio', async ({ page }) => {
  const etapa = process.env.ETAPA ?? 'depois'
  for (const tema of ['claro', 'escuro'] as const) {
    await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await capturar(page, `${etapa}-vazio-${tema}`)
  }
  await abrirDiaCheio(page, 'claro')
  await capturar(page, `${etapa}-cheio-claro`)
  await page.getByRole('button', { name: 'Abrir Casa' }).click()
  await capturar(page, `${etapa}-lista-aberto-claro`)
  await escolherModo(page, 'Colunas')
  await capturar(page, `${etapa}-colunas-claro`)
  await page.evaluate(() => localStorage.setItem('memoria:tema', 'escuro'))
  await page.reload()
  await expect(page.getByText('Fazer curso')).toBeVisible()
  // O grupo aberto antes continua aberto: o layout do Dia é lembrado.
  await expect(page.getByRole('button', { name: 'Recolher Casa' })).toBeVisible()
  await capturar(page, `${etapa}-colunas-escuro`)
  await escolherModo(page, 'Lista')
  await capturar(page, `${etapa}-cheio-escuro`)
})
