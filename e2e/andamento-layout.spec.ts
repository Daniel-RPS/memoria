import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * "Em andamento" (marca, some ao adiar/mover/arrastar/duplicar/concluir), layout do Dia lembrado
 * (Colunas, seção recolhida, grupo aberto: entre telas, recarregar e outro dia) e Semana mais
 * compacta. Capturas em e2e/capturas/andamento-<cenário>.png.
 */

const HOJE = '2026-11-03'
const AMANHA = '2026-11-04'
const GRUPO = 'Simulador POOSE'
const ITEM = 'Junção de mesas em nº ímpar'
const OUTRO_ITEM = 'Cálculo de ranking'
const TAREFA_A = 'Revisar relatório'
const TAREFA_B = 'Ligar para o dentista'
const COLUNA_HOJE = 'terça-feira, 3 de novembro'
const COLUNA_AMANHA = 'quarta-feira, 4 de novembro'

const FEITOS = [
  'Revisar enunciado',
  'Modelar entidades',
  'Criar tela de login',
  'Configurar rotas',
  'Escrever testes de login',
  'Ajustar contraste',
  'Publicar rascunho',
]
const PENDENTES = [
  ITEM,
  OUTRO_ITEM,
  'Exportar relatório',
  'Revisar permissões',
  'Validar importação',
  'Conferir backup',
  'Atualizar documentação',
]

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  definirConclusaoItem: (id: string, concluido: boolean) => Promise<unknown>
  copiarGrupos: (cardIds: string[], destino: string) => Promise<unknown>
}

interface ModuloTarefas {
  criarTarefa: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: {
    tasks: { toArray: () => Promise<{ emAndamento?: boolean }[]> }
    groupItems: { toArray: () => Promise<{ emAndamento?: boolean }[]> }
  }
}

/** Simulador POOSE (7/14) e duas tarefas soltas, hoje. */
async function semear(page: Page, opcoes: { copiaAmanha?: boolean } = {}) {
  await page.evaluate(
    async ({ hoje, amanha, feitos, pendentes, copiaAmanha, tarefas }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const soltas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const card = await grupos.criarGrupo({ titulo: 'Simulador POOSE', data: hoje })
      for (const titulo of feitos) {
        const item = await grupos.criarItem(card.id, titulo)
        await grupos.definirConclusaoItem(item.id, true)
      }
      for (const titulo of pendentes) await grupos.criarItem(card.id, titulo)
      for (const titulo of tarefas) await soltas.criarTarefa({ titulo, data: hoje })
      if (copiaAmanha) await grupos.copiarGrupos([card.id], amanha)
    },
    {
      hoje: HOJE,
      amanha: AMANHA,
      feitos: FEITOS,
      pendentes: PENDENTES,
      copiaAmanha: opcoes.copiaAmanha ?? false,
      tarefas: [TAREFA_A, TAREFA_B],
    },
  )
}

/** Quantos registros no banco estão marcados em andamento (tarefas soltas + itens). */
async function contarEmAndamentoNoBanco(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    const [tarefas, itens] = await Promise.all([db.tasks.toArray(), db.groupItems.toArray()])
    return [...tarefas, ...itens].filter((registro) => registro.emAndamento === true).length
  })
}

async function abrirDia(page: Page, data = HOJE) {
  await page.goto(`/dia/${data}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
}

function cardDoGrupo(page: Page) {
  return page.getByRole('region', { name: `Grupo ${GRUPO}` })
}

function itemDoGrupo(page: Page, titulo: string) {
  return cardDoGrupo(page).getByRole('listitem').filter({ hasText: titulo })
}

function tarefaSolta(page: Page, titulo: string) {
  return page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem').filter({
    hasText: titulo,
  })
}

async function abrirGrupoNoDia(page: Page) {
  await cardDoGrupo(page)
    .getByRole('button', { name: `Abrir ${GRUPO}` })
    .click()
}

async function escolherNoMenu(page: Page, linha: Locator, titulo: string, opcao: string) {
  await linha.getByRole('button', { name: `Mais ações para ${titulo}` }).click()
  await page.getByRole('menuitem', { name: opcao, exact: true }).click()
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/andamento-${nome}.png`, fullPage: true })
}

/** Aperta em `origem`, anda até o meio da lista de pendentes de `destino` e solta. */
async function arrastar(page: Page, origem: Locator, destino: Locator) {
  const de = (await origem.boundingBox())!
  const para = (await destino.getByRole('list', { name: /^Pendentes de / }).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 8, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + Math.min(para.height / 2, 60), {
    steps: 20,
  })
  await page.mouse.up()
}

// Cenários longos (várias páginas e arrastos): folga para a máquina ocupada.
test.setTimeout(90_000)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
})

test.describe('em andamento', () => {
  test('marcar mostra filete, "agora" e ponto; recolhido, o ponto fica ao lado de 7/14; a Semana também', async ({
    page,
  }) => {
    await semear(page)
    await abrirDia(page)
    await abrirGrupoNoDia(page)
    await capturar(page, 'dia-antes-de-marcar')

    const linha = itemDoGrupo(page, ITEM)
    await escolherNoMenu(page, linha, ITEM, 'Marcar como em andamento')

    await expect(page.getByText('Em andamento', { exact: true })).toBeVisible()
    await expect(linha.locator('[data-em-andamento]')).toBeVisible()
    await expect(linha.locator('[data-filete-andamento]')).toBeVisible()
    await expect(linha.getByText('agora')).toBeVisible()
    await expect(linha.locator('[data-ponto-andamento]')).toBeVisible()
    // A posição na lista não muda: continua sendo o primeiro pendente.
    await expect(cardDoGrupo(page).getByRole('listitem').first()).toContainText(ITEM)
    await capturar(page, 'dia-em-andamento')

    // O menu agora oferece parar.
    await linha.getByRole('button', { name: `Mais ações para ${ITEM}` }).click()
    await expect(page.getByRole('menuitem', { name: 'Parar andamento' })).toBeVisible()
    await page.keyboard.press('Escape')

    // Recolhido, só sobra o ponto ao lado da contagem.
    await cardDoGrupo(page)
      .getByRole('button', { name: `Recolher ${GRUPO}` })
      .click()
    const contagem = cardDoGrupo(page).getByText('7/14')
    await expect(contagem.locator('[data-ponto-andamento]')).toBeVisible()
    await capturar(page, 'dia-grupo-recolhido')

    // Semana: o mesmo indicador, menor (recolhido e aberto).
    await page.goto(`/semana/${HOJE}`)
    const coluna = page.getByRole('region', { name: COLUNA_HOJE })
    // Hoje o card abre aberto (só os cards de hoje); recolhe para ver só o ponto.
    await coluna.getByRole('button', { name: `Recolher ${GRUPO}` }).click()
    await expect(coluna.getByText('7/14').locator('[data-ponto-andamento]')).toBeVisible()
    await capturar(page, 'semana-grupo-recolhido')
    await coluna.getByRole('button', { name: `Expandir ${GRUPO}` }).click()
    const linhaSemana = coluna.getByRole('listitem').filter({ hasText: ITEM })
    await expect(linhaSemana.locator('[data-filete-andamento]')).toBeVisible()
    await expect(linhaSemana.getByText('agora')).toBeVisible()
    await capturar(page, 'semana-em-andamento')
  })

  test('duas tarefas ao mesmo tempo ficam em andamento; parar tira só a escolhida', async ({
    page,
  }) => {
    await semear(page)
    await abrirDia(page)

    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Marcar como em andamento')
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_B), TAREFA_B, 'Marcar como em andamento')
    await expect(tarefaSolta(page, TAREFA_A).locator('[data-em-andamento]')).toBeVisible()
    await expect(tarefaSolta(page, TAREFA_B).locator('[data-em-andamento]')).toBeVisible()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(2)

    await abrirGrupoNoDia(page)
    await escolherNoMenu(page, itemDoGrupo(page, ITEM), ITEM, 'Marcar como em andamento')
    await expect(page.locator('[data-em-andamento]')).toHaveCount(3)
    await capturar(page, 'dia-varias')

    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Parar andamento')
    await expect(page.locator('[data-em-andamento]')).toHaveCount(2)
    await expect(tarefaSolta(page, TAREFA_B).locator('[data-em-andamento]')).toBeVisible()
  })

  test('Selecionar: "Em andamento" e "Parar andamento" valem para as selecionadas', async ({
    page,
  }) => {
    await semear(page)
    await abrirDia(page)
    await page.getByRole('button', { name: 'Selecionar' }).click()
    await page.getByRole('checkbox', { name: `Selecionar ${TAREFA_A}` }).check()
    await page.getByRole('checkbox', { name: `Selecionar ${TAREFA_B}` }).check()
    await page.getByRole('button', { name: 'Em andamento', exact: true }).click()

    await expect(page.locator('[data-em-andamento]')).toHaveCount(2)
    expect(await contarEmAndamentoNoBanco(page)).toBe(2)

    await page.getByRole('button', { name: 'Selecionar' }).click()
    await page.getByRole('checkbox', { name: `Selecionar ${TAREFA_A}` }).check()
    await page.getByRole('button', { name: 'Parar andamento', exact: true }).click()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(1)
  })

  test('Desfazer (botão do aviso) devolve a situação de antes', async ({ page }) => {
    await semear(page)
    await abrirDia(page)
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Marcar como em andamento')
    await expect(page.locator('[data-em-andamento]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
  })

  test('concluir pelo quadradinho tira a marca sozinho', async ({ page }) => {
    await semear(page)
    await abrirDia(page)
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Marcar como em andamento')
    await expect(page.getByText('agora')).toBeVisible()

    await page.getByRole('checkbox', { name: `Concluir ${TAREFA_A}` }).click()
    await expect(page.getByText('agora')).toHaveCount(0)
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
    expect(await contarEmAndamentoNoBanco(page)).toBe(0)

    // Item de grupo: o mesmo.
    await abrirGrupoNoDia(page)
    await escolherNoMenu(page, itemDoGrupo(page, ITEM), ITEM, 'Marcar como em andamento')
    await expect(page.locator('[data-em-andamento]')).toHaveCount(1)
    await page.getByRole('checkbox', { name: `Concluir ${ITEM}` }).click()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
  })

  test('"Adiar para amanhã" e "Mover para outro dia…" levam a tarefa sem a marca', async ({
    page,
  }) => {
    await semear(page)
    await abrirDia(page)

    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Marcar como em andamento')
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Adiar para amanhã')
    await expect(tarefaSolta(page, TAREFA_A)).toHaveCount(0)

    await escolherNoMenu(page, tarefaSolta(page, TAREFA_B), TAREFA_B, 'Marcar como em andamento')
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_B), TAREFA_B, 'Mover para outro dia…')
    await page
      .getByRole('dialog', { name: 'Mover para outro dia' })
      .getByRole('button', { name: 'Amanhã' })
      .click()
    await expect(tarefaSolta(page, TAREFA_B)).toHaveCount(0)

    await abrirDia(page, AMANHA)
    await expect(tarefaSolta(page, TAREFA_A)).toBeVisible()
    await expect(tarefaSolta(page, TAREFA_B)).toBeVisible()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
    await expect(page.getByText('agora')).toHaveCount(0)
    expect(await contarEmAndamentoNoBanco(page)).toBe(0)
  })

  test('item de grupo: adiar para amanhã leva a cópia sem a marca', async ({ page }) => {
    await semear(page)
    await abrirDia(page)
    await abrirGrupoNoDia(page)
    await escolherNoMenu(page, itemDoGrupo(page, ITEM), ITEM, 'Marcar como em andamento')
    await escolherNoMenu(page, itemDoGrupo(page, ITEM), ITEM, 'Adiar para amanhã')
    await expect(page.getByText('1 item levado para o dia seguinte')).toBeVisible()
    expect(await contarEmAndamentoNoBanco(page)).toBe(0)

    await abrirDia(page, AMANHA)
    await cardDoGrupo(page)
      .getByRole('button', { name: /^(Abrir|Recolher) / })
      .first()
      .waitFor()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
  })

  test('Semana: arrastar a tarefa e o grupo para outro dia tira a marca (original e cópia)', async ({
    page,
  }) => {
    await semear(page)
    await page.goto(`/semana/${HOJE}`)
    const hoje = page.getByRole('region', { name: COLUNA_HOJE })
    const amanha = page.getByRole('region', { name: COLUNA_AMANHA })
    // Hoje o card já abre aberto.
    await expect(hoje.getByRole('button', { name: `Recolher ${GRUPO}` })).toBeVisible()

    // Marca um item (menu do item na Semana); a tarefa solta é marcada pelo Dia.
    const linhaItem = hoje.getByRole('listitem').filter({ hasText: ITEM })
    await escolherNoMenu(page, linhaItem, ITEM, 'Marcar como em andamento')
    await expect(linhaItem.getByText('agora')).toBeVisible()
    await page.goto(`/dia/${HOJE}`)
    await escolherNoMenu(page, tarefaSolta(page, TAREFA_A), TAREFA_A, 'Marcar como em andamento')
    await page.goto(`/semana/${HOJE}`)
    await expect(
      hoje.getByRole('listitem').filter({ hasText: TAREFA_A }).getByText('agora'),
    ).toBeVisible()
    expect(await contarEmAndamentoNoBanco(page)).toBe(2)

    // A tarefa solta arrastada para amanhã perde a marca.
    await arrastar(page, hoje.getByRole('link', { name: TAREFA_A }), amanha)
    await expect(amanha.getByRole('link', { name: TAREFA_A })).toBeVisible()
    await expect(amanha.getByText('agora')).toHaveCount(0)
    expect(await contarEmAndamentoNoBanco(page)).toBe(1)

    // O card arrastado duplica: nem o original nem a cópia levam a marca.
    await arrastar(
      page,
      hoje.getByRole('button', { name: new RegExp(`^Grupo ${GRUPO}, `) }),
      amanha,
    )
    await expect(page.getByText(/itens? levados? para amanhã/)).toBeVisible()
    await expect(
      amanha.getByRole('button', { name: new RegExp(`^Grupo ${GRUPO}, `) }),
    ).toBeVisible()
    await expect(page.locator('[data-em-andamento]')).toHaveCount(0)
    await expect(page.getByText('agora')).toHaveCount(0)
    expect(await contarEmAndamentoNoBanco(page)).toBe(0)
  })
})

test.describe('layout do Dia lembrado', () => {
  test('Colunas, Tarefas soltas recolhida e grupo aberto voltam iguais: outra tela, recarregar e outro dia', async ({
    page,
  }) => {
    await semear(page, { copiaAmanha: true })
    await abrirDia(page)
    await page
      .getByRole('group', { name: 'Visualização do dia' })
      .getByRole('button', { name: 'Colunas' })
      .click()
    await page
      .getByRole('region', { name: 'Tarefas soltas', exact: true })
      .getByRole('button', { name: /^Tarefas soltas, / })
      .click()
    await abrirGrupoNoDia(page)

    async function conferirLayout() {
      await expect(page.locator('[data-modo="colunas"]')).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Tarefas soltas', exact: true }),
      ).toHaveAttribute('data-recolhida', 'true')
      await expect(page.getByRole('region', { name: 'Grupos', exact: true })).not.toHaveAttribute(
        'data-recolhida',
        /.*/,
      )
      await expect(
        cardDoGrupo(page).getByRole('button', { name: `Recolher ${GRUPO}` }),
      ).toBeVisible()
    }
    await conferirLayout()
    await capturar(page, 'layout-lembrado')

    // Outra tela e volta (sem recarregar a página).
    await page.getByRole('link', { name: 'Notas' }).click()
    await expect(page).toHaveURL(/\/notas/)
    await page.goBack()
    await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
    await conferirLayout()

    // Recarregar.
    await page.reload()
    await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
    await conferirLayout()

    // Dia seguinte: a data do sistema muda e a cópia do grupo herda o estado do original.
    await page.clock.setFixedTime(new Date(`${AMANHA}T09:00:00-03:00`))
    await page.goto('/dia/hoje')
    await expect(page).toHaveURL(new RegExp(`/dia/(hoje|${AMANHA})`))
    await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
    await conferirLayout()
  })

  test('Lista: a seção Grupos recolhida também é lembrada; janela estreita cai para Lista sem perder Colunas', async ({
    page,
  }) => {
    await semear(page)
    await abrirDia(page)
    await page
      .getByRole('group', { name: 'Visualização do dia' })
      .getByRole('button', { name: 'Colunas' })
      .click()
    await page
      .getByRole('region', { name: 'Grupos', exact: true })
      .getByRole('button', { name: /^Grupos, / })
      .click()

    await page.setViewportSize({ width: 700, height: 900 })
    const grupos = (await page.getByRole('region', { name: 'Grupos', exact: true }).boundingBox())!
    const soltas = (await page
      .getByRole('region', { name: 'Tarefas soltas', exact: true })
      .boundingBox())!
    // Estreita, empilha (uma seção sob a outra) mas a preferência continua Colunas.
    expect(soltas.y).toBeGreaterThan(grupos.y)
    expect(Math.abs(soltas.x - grupos.x)).toBeLessThan(2)

    await page.setViewportSize({ width: 1680, height: 1000 })
    await page.reload()
    await expect(page.locator('[data-modo="colunas"]')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Grupos', exact: true })).toHaveAttribute(
      'data-recolhida',
      'true',
    )
  })

  test('grupo excluído não deixa lixo guardado', async ({ page }) => {
    await semear(page)
    await abrirDia(page)
    await abrirGrupoNoDia(page)
    const antes = await page.evaluate(() => localStorage.getItem('memoria:dia-layout'))
    expect(JSON.parse(antes!).gruposAbertos).toHaveLength(1)

    await page.getByRole('button', { name: `Mais ações para o grupo ${GRUPO}` }).click()
    await page.getByRole('menuitem', { name: /^Excluir/ }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /^Excluir/ })
      .click()
    await expect(cardDoGrupo(page)).toHaveCount(0)

    await expect
      .poll(
        async () =>
          JSON.parse((await page.evaluate(() => localStorage.getItem('memoria:dia-layout')))!)
            .gruposAbertos,
      )
      .toEqual([])
  })
})

test.describe('Semana compacta', () => {
  test('letra menor, separadores entre os itens do grupo e a tarefa solta no mesmo tamanho', async ({
    page,
  }) => {
    await semear(page)
    await page.goto(`/semana/${HOJE}`)
    const coluna = page.getByRole('region', { name: COLUNA_HOJE })
    // Hoje o card já abre aberto.
    await expect(coluna.getByRole('button', { name: `Recolher ${GRUPO}` })).toBeVisible()

    const itens = coluna.getByRole('list', { name: `Itens de ${GRUPO}` }).getByRole('listitem')
    await expect(itens).toHaveCount(14)
    const estilo = (alvo: Locator, propriedade: string) =>
      alvo.evaluate((no, nome) => getComputedStyle(no).getPropertyValue(nome), propriedade)

    // Item do grupo: 13px, com linha fina embaixo; texto longo quebra (sem reticências).
    const primeiro = itens.filter({ hasText: ITEM })
    expect(await estilo(primeiro.getByText(ITEM), 'font-size')).toBe('13px')
    expect(await estilo(primeiro, 'border-bottom-width')).toBe('1px')
    expect(await estilo(primeiro.getByText(ITEM), 'text-overflow')).not.toBe('ellipsis')
    // Nome do grupo: 1px maior que os itens, semibold.
    const nome = coluna.getByRole('button', { name: GRUPO, exact: true })
    expect(await estilo(nome, 'font-size')).toBe('14px')
    expect(Number(await estilo(nome, 'font-weight'))).toBe(600)
    // Tarefa solta: o mesmo tamanho dos itens.
    expect(
      await estilo(
        coluna.getByRole('listitem').filter({ hasText: TAREFA_A }).getByText(TAREFA_A),
        'font-size',
      ),
    ).toBe('13px')

    await capturar(page, 'semana-compacta')
  })
})
