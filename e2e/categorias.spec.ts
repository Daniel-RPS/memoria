import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Categorias criadas e aplicadas sem sair da tela, card editável na Semana e tudo
 * sincronizado entre as telas (e entre abas). Capturas em e2e/capturas/categorias-*.png.
 */

const SEGUNDA = '2026-11-02'
const COLUNA_2 = 'segunda-feira, 2 de novembro'
const INDIGO = '#5b4fbf'
const RGB_INDIGO = 'rgb(91, 79, 191)'
const RGB_VERDE = 'rgb(47, 138, 87)'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<unknown>
}

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
    etapas: never[]
  }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    categories: { toArray: () => Promise<{ id: string; nome: string; cor: string }[]> }
    subcategories: { toArray: () => Promise<{ id: string; nome: string }[]> }
    groupSeries: {
      toArray: () => Promise<{ titulo: string; categoryId?: string; subcategoryId?: string }[]>
    }
    groupItems: { toArray: () => Promise<{ titulo: string; ordem: number }[]> }
    procedures: {
      toArray: () => Promise<{ titulo: string; categoryId?: string; subcategoryId?: string }[]>
    }
  }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/categorias-${nome}.png` })
}

async function lerBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [categorias, subcategorias, series, itens, procedimentos] = await Promise.all([
      db.categories.toArray(),
      db.subcategories.toArray(),
      db.groupSeries.toArray(),
      db.groupItems.toArray(),
      db.procedures.toArray(),
    ])
    return {
      categorias,
      subcategorias,
      series,
      itens: itens.sort((a, b) => a.ordem - b.ordem).map((item) => item.titulo),
      procedimentos,
    }
  })
}

/** Cria o card "Casa" (com um item) na segunda, opcionalmente numa categoria nova. */
async function semearCard(page: Page, categoria?: { nome: string; cor: string }) {
  await page.evaluate(
    async ({ data, categoria }) => {
      const caminhoGrupos = '/src/db/repositories/group-repository.ts'
      const caminhoCategorias = '/src/db/repositories/category-repository.ts'
      const grupos = (await import(/* @vite-ignore */ caminhoGrupos)) as ModuloGrupos
      const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
      const categoryId = categoria ? (await categorias.criarCategoria(categoria)).id : undefined
      const card = await grupos.criarGrupo({ titulo: 'Casa', data, categoryId })
      await grupos.criarItem(card.id, 'Varrer')
    },
    { data: SEGUNDA, categoria },
  )
}

function coluna(page: Page) {
  return page.getByRole('region', { name: COLUNA_2 })
}

/** O card compacto da Semana (o `li` da coluna que contém o título). */
function cardNaSemana(page: Page, titulo: string) {
  return coluna(page)
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: new RegExp(`^(Expandir|Recolher) ${titulo}$`) }),
    })
}

/** Cor da faixa à esquerda do card (o primeiro `span` decorativo). */
function corDaFaixa(card: Locator) {
  return card.evaluate((elemento) => {
    const faixa =
      elemento.querySelector('[data-cor]') ?? elemento.querySelector('span[aria-hidden]')
    return faixa ? getComputedStyle(faixa).backgroundColor : ''
  })
}

/** Na Semana a barra fica recolhida: Dia, Mês e Ano estão no menu do ícone "Calendário". */
async function irPara(page: Page, tela: string) {
  const navegacao = page.getByRole('navigation', { name: 'Telas' })
  const link = navegacao.getByRole('link', { name: tela, exact: true })
  if (await link.isVisible()) return link.click()
  await navegacao.getByRole('button', { name: /^Calendário/ }).click()
  await page.getByRole('menuitem', { name: tela, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  // Segunda, 2/11/2026: a semana aberta vai de 2 a 8 de novembro.
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('Semana: pelo menu ⋯ do card, cria "Trabalho" com cor, aplica e aparece em Categorias', async ({
  page,
}) => {
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCard(page)
  const card = cardNaSemana(page, 'Casa')
  await expect(card).toBeVisible()
  await card.hover()
  await capturar(page, '1-antes')

  await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
  await page.getByRole('menuitem', { name: 'Categoria' }).hover()
  await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Trabalho')
  await page.getByRole('radio', { name: 'Índigo' }).click()
  await capturar(page, '1-formulario')
  await page.getByRole('textbox', { name: 'Nova categoria' }).press('Enter')

  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect.poll(() => corDaFaixa(card)).toBe(RGB_INDIGO)
  const banco = await lerBanco(page)
  expect(banco.categorias).toEqual([expect.objectContaining({ nome: 'Trabalho', cor: INDIGO })])
  expect(banco.series[0].categoryId).toBe(banco.categorias[0].id)
  await capturar(page, '1-depois-semana')

  // Navegação do próprio app: sem recarregar a página.
  await irPara(page, 'Categorias')
  const lista = page.getByRole('list', { name: 'Categorias de Grupos' })
  await expect(lista.getByRole('button', { name: 'Trabalho', exact: true })).toBeVisible()
  await expect(lista.getByText('1 grupo')).toBeVisible()
  await capturar(page, '1-depois-categorias')
})

test('Procedimento: cria uma subcategoria pelo seletor e ela fica aplicada', async ({ page }) => {
  await page.goto('/procedimentos')
  const id = await page.evaluate(async () => {
    const caminhoCategorias = '/src/db/repositories/category-repository.ts'
    const caminhoProcedimentos = '/src/db/repositories/procedure-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
    const procedimentos = (await import(
      /* @vite-ignore */ caminhoProcedimentos
    )) as ModuloProcedimentos
    const casa = await categorias.criarCategoria({ nome: 'Casa', tipo: 'procedimento' })
    return (
      await procedimentos.criarProcedimento({
        titulo: 'Regar as plantas',
        categoryId: casa.id,
        etapas: [],
      })
    ).id
  })
  await page.goto(`/procedimentos/${id}`)
  const campo = page.getByRole('button', { name: 'Categoria', exact: true })
  await expect(campo).toHaveText('Casa')
  await capturar(page, '2-antes')

  await campo.click()
  await page.getByRole('menuitemradio', { name: 'Casa' }).hover()
  await page.getByRole('menuitem', { name: 'Nova subcategoria em Casa' }).click()
  await page.getByRole('textbox', { name: 'Nova subcategoria' }).fill('Jardim')
  await capturar(page, '2-formulario')
  await page.getByRole('textbox', { name: 'Nova subcategoria' }).press('Enter')

  await expect(campo).toHaveText('Casa › Jardim')
  await expect(page.getByRole('status')).toHaveText('Salvo')
  await capturar(page, '2-depois')
  const banco = await lerBanco(page)
  expect(banco.subcategorias.map((subcategoria) => subcategoria.nome)).toEqual(['Jardim'])
  expect(banco.procedimentos[0].subcategoryId).toBe(banco.subcategorias[0].id)
})

test('Semana: renomeia o card e adiciona, renomeia e exclui um item', async ({ page }) => {
  await page.goto(`/semana/${SEGUNDA}`)
  await semearCard(page)
  await expect(cardNaSemana(page, 'Casa')).toBeVisible()
  await expandirGrupos(page)
  await capturar(page, '3-antes')

  await coluna(page).getByRole('button', { name: 'Casa', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome da tarefa' }).fill('Lar')
  await page.getByRole('textbox', { name: 'Nome da tarefa' }).press('Enter')
  const card = cardNaSemana(page, 'Lar')
  await expect(card).toBeVisible()

  await card.getByRole('textbox', { name: 'Adicionar item em Lar' }).fill('Lavar louça')
  await card.getByRole('textbox', { name: 'Adicionar item em Lar' }).press('Enter')
  await card.getByRole('button', { name: 'Lavar louça', exact: true }).click()
  await card.getByRole('textbox', { name: 'Nome da tarefa' }).fill('Lavar a louça')
  await card.getByRole('textbox', { name: 'Nome da tarefa' }).press('Enter')
  await expect(card.getByRole('button', { name: 'Lavar a louça', exact: true })).toBeVisible()
  await capturar(page, '3-meio')

  await card.getByRole('listitem').filter({ hasText: 'Varrer' }).hover()
  await card.getByRole('button', { name: 'Mais ações para Varrer' }).click()
  await page.getByRole('menuitem', { name: 'Excluir' }).click()
  await expect(card.getByText('Varrer')).toHaveCount(0)
  await capturar(page, '3-depois')

  const banco = await lerBanco(page)
  expect(banco.series.map((serie) => serie.titulo)).toEqual(['Lar'])
  expect(banco.itens).toEqual(['Lavar a louça'])
})

test('Categorias: trocar a cor muda os cards no Dia e na Semana', async ({ page }) => {
  await page.goto(`/dia/${SEGUNDA}`)
  await semearCard(page, { nome: 'Casa', cor: INDIGO })
  const cardNoDia = page.getByRole('region', { name: 'Grupo Casa' })
  await expect.poll(() => corDaFaixa(cardNoDia)).toBe(RGB_INDIGO)
  await capturar(page, '4-antes-dia')
  await irPara(page, 'Semana')
  await expect.poll(() => corDaFaixa(cardNaSemana(page, 'Casa'))).toBe(RGB_INDIGO)
  await capturar(page, '4-antes-semana')

  await irPara(page, 'Categorias')
  await page.getByRole('button', { name: 'Cor de Casa: Índigo. Trocar cor' }).click()
  await page
    .getByRole('radiogroup', { name: 'Cor de Casa' })
    .getByRole('radio', { name: 'Verde' })
    .click()
  await page.keyboard.press('Escape')
  await capturar(page, '4-categorias')

  await irPara(page, 'Semana')
  await expect.poll(() => corDaFaixa(cardNaSemana(page, 'Casa'))).toBe(RGB_VERDE)
  await capturar(page, '4-depois-semana')
  // O relógio está fixo na segunda: "Dia" abre o mesmo dia, sem recarregar.
  await irPara(page, 'Dia')
  await expect
    .poll(() => corDaFaixa(page.getByRole('region', { name: 'Grupo Casa' })))
    .toBe(RGB_VERDE)
  await capturar(page, '4-depois-dia')
})

test('Duas abas: a categoria criada numa aparece na outra', async ({ page, context }) => {
  await page.goto('/categorias')
  const outra = await context.newPage()
  await outra.goto('/categorias')
  await expect(outra.getByText('Nenhuma categoria aqui ainda.', { exact: false })).toHaveCount(2)
  await outra.screenshot({ path: 'e2e/capturas/categorias-5-antes-outra-aba.png' })

  await page.getByRole('button', { name: 'Nova categoria em Procedimentos' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Saúde')
  await page.getByRole('button', { name: 'Criar categoria' }).click()
  const lista = { name: 'Categorias de Procedimentos' }
  await expect(page.getByRole('list', lista).getByText('Saúde')).toBeVisible()

  await expect(outra.getByRole('list', lista).getByText('Saúde')).toBeVisible()
  await outra.screenshot({ path: 'e2e/capturas/categorias-5-depois-outra-aba.png' })
})
