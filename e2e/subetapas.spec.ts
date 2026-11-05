import { expect, test, type Locator, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

/**
 * Subetapas em tarefas soltas e em itens de grupo: criar pelo menu, levar para outro dia (a cópia
 * leva todas, as concluídas ainda marcadas), conclusão automática pela última e reabertura ao
 * desmarcar. Capturas em e2e/capturas/subetapas-<cenário>.png (claro e escuro).
 */

const HOJE = '2026-11-05'
const AMANHA = '2026-11-06'
const GRUPO = 'Simulador POOSE'
const ITEM = 'Junção de mesas em nº ímpar'
const OUTRO_ITEM = 'Cálculo de ranking'
const TAREFA = 'Revisar relatório'
const COLUNA_HOJE = 'quinta-feira, 5 de novembro'
const COLUNA_AMANHA = 'sexta-feira, 6 de novembro'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

/** Simulador POOSE com dois itens e uma tarefa solta, hoje. */
async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, grupo, itens, tarefa }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const soltas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const card = await grupos.criarGrupo({ titulo: grupo, data: hoje })
      for (const titulo of itens) await grupos.criarItem(card.id, titulo)
      await soltas.criarTarefa({ titulo: tarefa, data: hoje })
    },
    { hoje: HOJE, grupo: GRUPO, itens: [ITEM, OUTRO_ITEM], tarefa: TAREFA },
  )
}

async function abrirDia(page: Page, data = HOJE) {
  await page.goto(`/dia/${data}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
  await expandirGrupos(page)
}

function cardDoGrupo(page: Page) {
  return page.getByRole('region', { name: `Grupo ${GRUPO}` })
}

function itemDoGrupo(page: Page, titulo: string) {
  return cardDoGrupo(page).getByRole('listitem').filter({ hasText: titulo }).first()
}

async function escolherNoMenu(page: Page, linha: Locator, titulo: string, opcao: string) {
  await linha.getByRole('button', { name: `Mais ações para ${titulo}` }).click()
  await page.getByRole('menuitem', { name: opcao, exact: true }).click()
}

async function adicionarSubetapas(page: Page, linha: Locator, titulo: string, nomes: string[]) {
  await escolherNoMenu(page, linha, titulo, 'Adicionar subetapa')
  const campo = linha.getByRole('textbox', { name: 'Nova subetapa' })
  await expect(campo).toBeFocused()
  for (const nome of nomes) await campo.fill(nome).then(() => campo.press('Enter'))
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/subetapas-${nome}.png`, fullPage: true })
}

async function definirTema(page: Page, tema: 'claro' | 'escuro') {
  await page.evaluate((valor) => window.localStorage.setItem('memoria:tema', valor), tema)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
}

test.setTimeout(90_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
})

test.describe('subetapas', () => {
  test('3 subetapas num item, marcar 1 e adiar o grupo: amanhã mostra 1/3 com a primeira riscada', async ({
    page,
  }) => {
    await abrirDia(page)
    const linha = itemDoGrupo(page, ITEM)
    await adicionarSubetapas(page, linha, ITEM, ['Ler enunciado', 'Montar caso', 'Conferir saída'])

    const lista = linha.getByRole('list', { name: `Subetapas de ${ITEM}` })
    await expect(lista.getByRole('listitem')).toHaveCount(3)
    await lista.getByRole('checkbox', { name: 'Concluir Ler enunciado' }).click()
    await expect(
      linha.getByRole('button', { name: `Subetapas de ${ITEM}: 1 de 3 concluídas` }),
    ).toHaveText('1/3')
    await capturar(page, 'dia-claro')

    await cardDoGrupo(page)
      .getByRole('button', { name: `Mais ações para o grupo ${GRUPO}` })
      .click()
    await page.getByRole('menuitem', { name: 'Levar pendentes para amanhã' }).click()

    await abrirDia(page, AMANHA)
    const copia = itemDoGrupo(page, ITEM)
    const botao = copia.getByRole('button', { name: `Subetapas de ${ITEM}: 1 de 3 concluídas` })
    await expect(botao).toHaveText('1/3')
    await botao.click()
    const listaAmanha = copia.getByRole('list', { name: `Subetapas de ${ITEM}` })
    await expect(
      listaAmanha.getByRole('checkbox', { name: 'Desmarcar Ler enunciado' }),
    ).toBeChecked()
    await expect(
      listaAmanha.getByRole('button', { name: 'Ler enunciado', exact: true }),
    ).toHaveClass(/line-through/)
    await expect(
      listaAmanha.getByRole('checkbox', { name: 'Concluir Montar caso' }),
    ).not.toBeChecked()
    await capturar(page, 'dia-amanha-claro')

    // O original, hoje, ficou como estava (transferido, com as mesmas subetapas).
    await abrirDia(page)
    await itemDoGrupo(page, ITEM)
      .getByRole('button', { name: `Subetapas de ${ITEM}: 1 de 3 concluídas` })
      .click()
    await expect(
      itemDoGrupo(page, ITEM)
        .getByRole('list', { name: `Subetapas de ${ITEM}` })
        .getByRole('listitem'),
    ).toHaveCount(3)
  })

  test('marcar as 3 conclui o item sozinho (aviso com Desfazer); desmarcar uma reabre', async ({
    page,
  }) => {
    await abrirDia(page)
    const linha = itemDoGrupo(page, OUTRO_ITEM)
    await adicionarSubetapas(page, linha, OUTRO_ITEM, ['A', 'B', 'C'])
    const lista = linha.getByRole('list', { name: `Subetapas de ${OUTRO_ITEM}` })

    await lista.getByRole('checkbox', { name: 'Concluir A' }).click()
    await lista.getByRole('checkbox', { name: 'Concluir B' }).click()
    await expect(linha.getByRole('checkbox', { name: `Concluir ${OUTRO_ITEM}` })).not.toBeChecked()
    await lista.getByRole('checkbox', { name: 'Concluir C' }).click()

    await expect(page.getByText('Tarefa concluída')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible()
    const feito = cardDoGrupo(page).getByRole('list', { name: `Feitos e transferidos de ${GRUPO}` })
    const concluido = feito.getByRole('listitem').filter({ hasText: OUTRO_ITEM })
    await expect(concluido.getByRole('checkbox', { name: `Desmarcar ${OUTRO_ITEM}` })).toBeChecked()
    await capturar(page, 'item-concluido')

    // Desmarcar uma subetapa reabre: o item volta para os pendentes.
    await concluido
      .getByRole('button', { name: `Subetapas de ${OUTRO_ITEM}: 3 de 3 concluídas` })
      .click()
    await concluido.getByRole('checkbox', { name: 'Desmarcar B' }).click()
    const pendentes = cardDoGrupo(page).getByRole('list', { name: `Itens de ${GRUPO}` })
    await expect(
      pendentes
        .getByRole('listitem')
        .filter({ hasText: OUTRO_ITEM })
        .getByRole('checkbox', {
          name: `Concluir ${OUTRO_ITEM}`,
        }),
    ).not.toBeChecked()
  })

  test('tarefa solta: colar várias linhas cria várias; Backspace em linha vazia volta; Esc sai', async ({
    page,
  }) => {
    await abrirDia(page)
    const pendentes = page.getByRole('list', { name: 'Pendentes' })
    const linha = pendentes.getByRole('listitem').filter({ hasText: TAREFA })
    await escolherNoMenu(page, linha, TAREFA, 'Adicionar subetapa')
    const campo = linha.getByRole('textbox', { name: 'Nova subetapa' })
    await campo.evaluate((elemento) => {
      const dados = new DataTransfer()
      dados.setData('text', 'Coletar dados\nEscrever resumo\n\nRevisar')
      elemento.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dados, bubbles: true, cancelable: true }),
      )
    })
    const lista = linha.getByRole('list', { name: `Subetapas de ${TAREFA}` })
    await expect(lista.getByRole('listitem')).toHaveCount(3)

    // Backspace no campo vazio entra na última subetapa; esvaziar e Backspace apaga e sobe.
    await campo.focus()
    await campo.press('Backspace')
    const edicao = lista.getByRole('textbox', { name: 'Nome da tarefa' })
    await expect(edicao).toHaveValue('Revisar')
    await edicao.fill('')
    await edicao.press('Backspace')
    await expect(lista.getByRole('listitem')).toHaveCount(2)
    await expect(lista.getByRole('textbox', { name: 'Nome da tarefa' })).toHaveValue(
      'Escrever resumo',
    )

    await page.keyboard.press('Escape')
    await linha.getByRole('textbox', { name: 'Nova subetapa' }).focus()
    await page.keyboard.press('Escape')
    await expect(linha.getByRole('textbox', { name: 'Nova subetapa' })).toHaveCount(0)
  })

  test('Semana: subetapas começam recolhidas mostrando só 1/3; claro e escuro', async ({
    page,
  }) => {
    await abrirDia(page)
    const linha = itemDoGrupo(page, ITEM)
    await adicionarSubetapas(page, linha, ITEM, ['Um', 'Dois', 'Três'])
    await linha.getByRole('checkbox', { name: 'Concluir Um' }).click()

    for (const tema of ['claro', 'escuro'] as const) {
      await definirTema(page, tema)
      await page.goto(`/semana/${HOJE}`)
      await expandirGrupos(page)
      const coluna = page.getByRole('region', { name: COLUNA_HOJE })
      const itemSemana = coluna.getByRole('listitem').filter({ hasText: ITEM }).first()
      const botao = itemSemana.getByRole('button', {
        name: `Subetapas de ${ITEM}: 1 de 3 concluídas`,
      })
      await expect(botao).toHaveText('1/3')
      await expect(botao).toHaveAttribute('aria-expanded', 'false')
      await expect(itemSemana.getByRole('list', { name: `Subetapas de ${ITEM}` })).toHaveCount(0)
      await capturar(page, `semana-recolhida-${tema}`)

      await botao.click()
      await expect(
        itemSemana.getByRole('list', { name: `Subetapas de ${ITEM}` }).getByRole('listitem'),
      ).toHaveCount(3)
      await capturar(page, `semana-aberta-${tema}`)
    }
    await expect(page.getByRole('region', { name: COLUNA_AMANHA })).toBeVisible()
  })
})
