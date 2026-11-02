import { expect, test, type Page } from '@playwright/test'

/**
 * Notas ligadas a tarefa solta, grupo e item, no navegador de verdade: "Adicionar nota" pelo
 * menu ⋯ (Dia e Semana) e pelo Início, ícone de nota sem recarregar, a nota seguindo o item
 * levado a outro dia, a aba Notas (modos, filtros, busca, troca de categoria ao vivo),
 * excluir com aviso e desvincular. Capturas em e2e/capturas/notas-<fase>-*.png
 * (FASE=antes|depois; o padrão é depois).
 */

const HOJE = '2026-11-02'
const AMANHA = '2026-11-03'
const FASE = process.env.FASE ?? 'depois'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string; seriesId: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string; cadeiaId: string }>
  definirCategoriaDoGrupo: (seriesId: string, categoria: { categoryId?: string }) => Promise<void>
}

interface ModuloTarefas {
  criarTarefa: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
}

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
}

interface ModuloNotas {
  criarNota: (dados: {
    titulo?: string
    conteudo?: string
    vinculo?: { tipo: 'tarefa' | 'grupo' | 'item'; id: string }
  }) => Promise<{ id: string }>
}

interface Semeado {
  hostinger: { seriesId: string; cadeiaDeploy: string }
  casa: { seriesId: string; categoriaId: string }
  categoriaHostinger: string
  ligar: string
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/notas-${FASE}-${nome}.png`, fullPage: true })
}

/**
 * Hoje: grupo "Hostinger" (categoria Hostinger) com "Fazer Deploy" e "Renovar SSL", grupo
 * "Casa" (categoria Casa) com "Varrer" e a tarefa solta "Ligar para Fulano" (categoria Casa).
 */
async function semear(page: Page): Promise<Semeado> {
  return page.evaluate(async (hoje) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
    const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
    const categorias = (await importar(
      '/src/db/repositories/category-repository.ts',
    )) as ModuloCategorias
    const catHostinger = await categorias.criarCategoria({ nome: 'Hostinger', cor: '#5b4fbf' })
    const catCasa = await categorias.criarCategoria({ nome: 'Casa', cor: '#2f8a57' })
    const hostinger = await grupos.criarGrupo({
      titulo: 'Hostinger',
      data: hoje,
      categoryId: catHostinger.id,
    })
    const deploy = await grupos.criarItem(hostinger.id, 'Fazer Deploy')
    await grupos.criarItem(hostinger.id, 'Renovar SSL')
    const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: catCasa.id })
    await grupos.criarItem(casa.id, 'Varrer')
    const ligar = await tarefas.criarTarefa({
      titulo: 'Ligar para Fulano',
      data: hoje,
      categoryId: catCasa.id,
    })
    return {
      hostinger: { seriesId: hostinger.seriesId, cadeiaDeploy: deploy.cadeiaId },
      casa: { seriesId: casa.seriesId, categoriaId: catCasa.id },
      categoriaHostinger: catHostinger.id,
      ligar: ligar.id,
    }
  }, HOJE)
}

async function semearNotas(page: Page, semeado: Semeado) {
  await page.evaluate(async ({ hostinger, casa, ligar }: Semeado) => {
    const caminho = '/src/db/repositories/note-repository.ts'
    const notas = (await import(/* @vite-ignore */ caminho)) as ModuloNotas
    await notas.criarNota({
      conteudo: 'Rodar build antes\nconferir variáveis de ambiente',
      vinculo: { tipo: 'item', id: hostinger.cadeiaDeploy },
    })
    await notas.criarNota({
      titulo: 'Acesso ao painel',
      conteudo: 'Usuário no gerenciador de senhas',
      vinculo: { tipo: 'grupo', id: hostinger.seriesId },
    })
    await notas.criarNota({
      conteudo: 'Ver se o aspirador carregou',
      vinculo: { tipo: 'grupo', id: casa.seriesId },
    })
    await notas.criarNota({
      conteudo: 'Número novo: final 4321',
      vinculo: { tipo: 'tarefa', id: ligar },
    })
    await notas.criarNota({ titulo: 'Ideias para o fim de semana', conteudo: 'Feira, parque' })
  }, semeado)
}

/** "Adicionar nota" pelo menu ⋯ `nomeDoMenu` e escreve; devolve a gaveta aberta. */
async function adicionarNotaPeloMenu(page: Page, nomeDoMenu: string, texto: string) {
  await page.getByRole('button', { name: nomeDoMenu }).first().click()
  await page.getByRole('menuitem', { name: 'Adicionar nota' }).click()
  const gaveta = page.getByRole('dialog', { name: 'Notas' })
  await gaveta.getByLabel('Texto da nota').fill(texto)
  await expect(gaveta.getByText('Salvo')).toBeVisible()
  return gaveta
}

async function irPara(page: Page, tela: 'Notas' | 'Início') {
  await page.getByRole('navigation', { name: 'Telas' }).getByRole('link', { name: tela }).click()
}

function listaDeNotas(page: Page) {
  return page.getByRole('region', { name: 'Lista de notas' })
}

function blocoDaLista(page: Page, nome: string) {
  return listaDeNotas(page).getByRole('region', { name: nome, exact: true })
}

test.beforeEach(async ({ page }) => {
  // Cenários longos (vários passos e capturas).
  test.setTimeout(240_000)
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('Dia: nota no item "Fazer Deploy" aparece no item e na aba Notas sem recarregar', async ({
  page,
}) => {
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
  await capturar(page, '1-dia-antes')

  const gaveta = await adicionarNotaPeloMenu(
    page,
    'Mais ações para Fazer Deploy',
    'Subir pelo painel da Hostinger',
  )
  await expect(gaveta.getByText('Hostinger').first()).toBeVisible()
  await expect(gaveta.getByText('Fazer Deploy').first()).toBeVisible()
  await capturar(page, '2-dia-gaveta')
  await page.keyboard.press('Escape')

  await expect(page.getByRole('button', { name: 'Notas de Fazer Deploy: 1 nota' })).toBeVisible()
  await capturar(page, '3-dia-icone')

  await irPara(page, 'Notas')
  const cartao = listaDeNotas(page).getByRole('article', { name: 'Subir pelo painel da Hostinger' })
  await expect(cartao).toBeVisible()
  await expect(cartao.getByRole('link', { name: 'Grupo Hostinger' })).toBeVisible()
  await expect(cartao.getByRole('link', { name: 'Item Fazer Deploy' })).toBeVisible()
  await expect(cartao).toContainText('Categoria HostingerGrupo HostingerItem Fazer Deploy')
})

test('Semana e Início: nota no card "Casa" e na tarefa "Ligar para Fulano"', async ({ page }) => {
  await page.goto(`/semana/${HOJE}`)
  await semear(page)

  await adicionarNotaPeloMenu(page, 'Mais ações para o grupo Casa', 'Comprar saco do aspirador')
  await capturar(page, '4-semana-gaveta')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Notas de Casa: 1 nota' }).first()).toBeVisible()
  await capturar(page, '5-semana-icone')

  await irPara(page, 'Início')
  const soltas = page.getByRole('region', { name: 'Hoje', exact: true }).getByRole('group', {
    name: 'Tarefas soltas',
  })
  await soltas.getByRole('listitem').first().hover()
  await soltas.getByRole('button', { name: 'Adicionar nota em Ligar para Fulano' }).click()
  const gaveta = page.getByRole('dialog', { name: 'Notas' })
  await gaveta.getByLabel('Texto da nota').fill('Ligar depois das 14h')
  await expect(gaveta.getByText('Salvo')).toBeVisible()
  await capturar(page, '6-inicio-gaveta')
  await page.keyboard.press('Escape')
  await expect(
    soltas.getByRole('button', { name: 'Notas de Ligar para Fulano: 1 nota' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Hoje', exact: true })
      .getByRole('button', { name: 'Notas de Casa: 1 nota' }),
  ).toBeVisible()
  await capturar(page, '7-inicio-icones')

  await irPara(page, 'Notas')
  await expect(blocoDaLista(page, 'Casa').getByRole('article')).toHaveCount(2)
})

test('levar o item com nota para amanhã: a nota continua no dia seguinte', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  const semeado = await semear(page)
  await semearNotas(page, semeado)

  await page.getByRole('button', { name: 'Mais ações para Fazer Deploy' }).click()
  await page.getByRole('menuitem', { name: 'Adiar para amanhã' }).click()
  await page.goto(`/dia/${AMANHA}`)
  const icone = page.getByRole('button', { name: 'Notas de Fazer Deploy: 1 nota' })
  await expect(icone).toBeVisible()
  await icone.click()
  const gaveta = page.getByRole('dialog', { name: 'Notas' })
  await expect(gaveta.getByLabel('Texto da nota')).toHaveValue(/Rodar build antes/)
  // O registro "transferido" de hoje mostra a mesma nota.
  await page.keyboard.press('Escape')
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('button', { name: 'Notas de Fazer Deploy: 1 nota' })).toBeVisible()
})

test('aba Notas: modos, filtros, busca e troca de categoria ao vivo', async ({ page }) => {
  await page.goto('/notas')
  const semeado = await semear(page)
  await semearNotas(page, semeado)

  const titulosDosBlocos = () =>
    listaDeNotas(page).getByRole('heading', { level: 2 }).allInnerTexts()

  await expect(blocoDaLista(page, 'Hostinger')).toBeVisible()
  expect((await titulosDosBlocos()).map((titulo) => titulo.split('\n')[0])).toEqual([
    'Hostinger',
    'Casa',
    'Notas avulsas',
  ])
  await capturar(page, '8-aba-categoria')

  await page.getByRole('radio', { name: 'Por grupo' }).click()
  await expect(blocoDaLista(page, 'Tarefas soltas')).toBeVisible()
  expect((await titulosDosBlocos()).map((titulo) => titulo.split('\n')[0])).toEqual([
    'Casa',
    'Hostinger',
    'Tarefas soltas',
    'Notas avulsas',
  ])
  await capturar(page, '9-aba-grupo')

  await page.getByRole('radio', { name: 'Recentes' }).click()
  // Recentes: um bloco por dia (todas editadas hoje).
  await expect(listaDeNotas(page).getByRole('heading', { level: 2 })).toHaveText(['Hoje5'])
  await expect(listaDeNotas(page).getByRole('article')).toHaveCount(5)
  await capturar(page, '10-aba-recentes')

  // Lembra o modo ao voltar à tela.
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Recentes' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('radio', { name: 'Por categoria' }).click()

  await page.getByRole('button', { name: 'Tipo de vínculo: Todas' }).click()
  await page.getByRole('menuitemradio', { name: 'Itens' }).click()
  // Espera o menu fechar (e devolver o foco) antes do próximo.
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(listaDeNotas(page).getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'Tipo de vínculo: Itens' }).click()
  await page.getByRole('menuitemradio', { name: 'Todas' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)

  await page.getByRole('button', { name: 'Filtrar por categoria: Todas as categorias' }).click()
  await page.getByRole('menuitemradio', { name: 'Casa' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(listaDeNotas(page).getByRole('article')).toHaveCount(2)
  await page.getByRole('button', { name: 'Filtrar por categoria: Casa' }).click()
  await page.getByRole('menuitemradio', { name: 'Todas as categorias' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)

  await page.getByRole('searchbox', { name: 'Buscar notas' }).fill('Hostinger')
  await expect(listaDeNotas(page).getByRole('article')).toHaveCount(2)
  await capturar(page, '11-aba-busca')
  await page.getByRole('searchbox', { name: 'Buscar notas' }).fill('')

  // Outra aba (ou outra tela) troca a categoria do grupo: a nota muda de bloco na hora.
  await page.evaluate(async ({ casa, categoriaHostinger }: Semeado) => {
    const caminho = '/src/db/repositories/group-repository.ts'
    const grupos = (await import(/* @vite-ignore */ caminho)) as ModuloGrupos
    await grupos.definirCategoriaDoGrupo(casa.seriesId, { categoryId: categoriaHostinger })
  }, semeado)
  await expect(
    blocoDaLista(page, 'Hostinger').getByRole('article', { name: 'Ver se o aspirador carregou' }),
  ).toBeVisible()
  await expect(blocoDaLista(page, 'Casa').getByRole('article')).toHaveCount(1)
})

test('excluir tarefa com nota avisa e a nota vira avulsa; desvincular pelo editor', async ({
  page,
}) => {
  await page.goto(`/dia/${HOJE}`)
  const semeado = await semear(page)
  await semearNotas(page, semeado)

  await page.getByRole('button', { name: 'Mais ações para Ligar para Fulano' }).click()
  await page.getByRole('menuitem', { name: 'Excluir…' }).click()
  const confirmacao = page.getByRole('alertdialog')
  await expect(
    confirmacao.getByText('Esta tarefa tem 1 nota. Ela ficará como nota avulsa.'),
  ).toBeVisible()
  await capturar(page, '12-excluir-aviso')
  await confirmacao.getByRole('button', { name: 'Excluir tarefa' }).click()

  await irPara(page, 'Notas')
  await expect(
    blocoDaLista(page, 'Notas avulsas').getByRole('article', { name: 'Número novo: final 4321' }),
  ).toBeVisible()

  // Desvincular a nota do grupo Hostinger pelo editor.
  await listaDeNotas(page).getByRole('link', { name: 'Acesso ao painel' }).click()
  await page.getByRole('button', { name: 'Desvincular' }).click()
  await expect(page.getByRole('group', { name: 'Vínculo da nota' })).toContainText('Nota avulsa')
  await capturar(page, '13-editor-avulsa')
  await page.getByRole('link', { name: 'Notas', exact: true }).first().click()
  await expect(
    blocoDaLista(page, 'Notas avulsas').getByRole('article', { name: 'Acesso ao painel' }),
  ).toBeVisible()

  // E vincular de novo pelo "Vincular a…".
  await listaDeNotas(page).getByRole('link', { name: 'Acesso ao painel' }).click()
  await page.getByRole('button', { name: 'Vincular a…' }).click()
  await page.getByRole('searchbox', { name: 'Buscar tarefa, grupo ou item' }).fill('renovar')
  await capturar(page, '14-vincular-a')
  await page.getByRole('button', { name: /Item Renovar SSL/ }).click()
  await expect(page.getByRole('group', { name: 'Vínculo da nota' })).toContainText('Renovar SSL')
})

test('capturas: aba Notas e gaveta, larguras normal e estreita, temas claro e escuro', async ({
  page,
}) => {
  await page.goto('/notas')
  const semeado = await semear(page)
  await semearNotas(page, semeado)
  await expect(blocoDaLista(page, 'Hostinger')).toBeVisible()

  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    for (const [largura, nome] of [
      [1680, 'normal'],
      [900, 'estreita'],
    ] as const) {
      await page.setViewportSize({ width: largura, height: 1000 })
      await page.goto('/notas')
      for (const modo of ['Por categoria', 'Por grupo', 'Recentes']) {
        await page.getByRole('radio', { name: modo }).click()
        await capturar(page, `aba-${modo.replace(' ', '-').toLowerCase()}-${nome}-${tema}`)
      }
      await page.getByRole('radio', { name: 'Por categoria' }).click()

      await page.goto(`/dia/${HOJE}`)
      await expect(
        page.getByRole('button', { name: 'Notas de Fazer Deploy: 1 nota' }),
      ).toBeVisible()
      await capturar(page, `dia-icones-${nome}-${tema}`)
      await page.getByRole('button', { name: 'Notas de Hostinger: 1 nota' }).click()
      await expect(page.getByRole('dialog', { name: 'Notas' })).toBeVisible()
      await capturar(page, `dia-gaveta-${nome}-${tema}`)
      await page.keyboard.press('Escape')

      await page.goto(`/semana/${HOJE}`)
      await expect(
        page.getByRole('button', { name: 'Notas de Fazer Deploy: 1 nota' }).first(),
      ).toBeVisible()
      await capturar(page, `semana-icones-${nome}-${tema}`)
      await page.getByRole('button', { name: 'Notas de Casa: 1 nota' }).first().click()
      await expect(page.getByRole('dialog', { name: 'Notas' })).toBeVisible()
      await capturar(page, `semana-gaveta-${nome}-${tema}`)
      await page.keyboard.press('Escape')
    }
  }
})
