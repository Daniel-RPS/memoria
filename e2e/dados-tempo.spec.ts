import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * E2E da aba "Dados" › "Tempo nas tarefas" e do timer automático de "Em andamento".
 * Capturas salvas em `e2e/capturas/dados-*.png`.
 */

const HOJE = '2026-11-03'
const AMANHA = '2026-11-04'
const TAREFA_RELATORIO = 'Revisar relatório trimestral'
const TAREFA_ESTUDO = 'Estudar arquitetura do banco'
const GRUPO = 'Simulador POOSE'
const ITEM_GRUPO = 'Junção de mesas em nº ímpar'

interface ModuloCategorias {
  criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
}

interface ModuloTarefas {
  criarTarefa: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
}

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
}

async function semearBase(page: Page) {
  await page.evaluate(
    async ({ hoje, tRelatorio, tEstudo, nomeGrupo, nomeItem }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const categorias = (await importar(
        '/src/db/repositories/category-repository.ts',
      )) as ModuloCategorias
      const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos

      const trabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#8B3DFF' })
      const estudo = await categorias.criarCategoria({ nome: 'Estudos', cor: '#10B981' })

      await tarefas.criarTarefa({
        titulo: tRelatorio,
        data: hoje,
        categoryId: trabalho.id,
      })
      await tarefas.criarTarefa({
        titulo: tEstudo,
        data: hoje,
        categoryId: estudo.id,
      })
      const card = await grupos.criarGrupo({
        titulo: nomeGrupo,
        data: hoje,
        categoryId: trabalho.id,
      })
      await grupos.criarItem(card.id, nomeItem)
    },
    {
      hoje: HOJE,
      tRelatorio: TAREFA_RELATORIO,
      tEstudo: TAREFA_ESTUDO,
      nomeGrupo: GRUPO,
      nomeItem: ITEM_GRUPO,
    },
  )
}

function tarefaSolta(page: Page, titulo: string) {
  return page.getByRole('list', { name: 'Pendentes' }).getByRole('listitem').filter({
    hasText: titulo,
  })
}

async function escolherNoMenu(page: Page, linha: Locator, titulo: string, opcao: string) {
  await linha.getByRole('button', { name: `Mais ações para ${titulo}` }).click()
  await page.getByRole('menuitem', { name: opcao, exact: true }).click()
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/dados-${nome}.png`, fullPage: true })
}

test.setTimeout(90_000)

test.describe('Dados › Tempo nas tarefas', () => {
  test('estado vazio, barra lateral aberta/recolhida (tooltip de Dados) e temas claro/escuro', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
    await page.goto('/dados')

    await expect(page.getByRole('heading', { name: 'Dados', exact: true })).toBeVisible()
    await expect(page.getByText('Como seu tempo foi usado')).toBeVisible()
    await expect(
      page.getByText(
        'Nenhum tempo medido ainda. Marque uma tarefa como Em andamento para começar.',
      ),
    ).toBeVisible()

    // Link Dados ativo na barra lateral aberta
    const linkDados = page.getByRole('navigation', { name: 'Telas' }).getByRole('link', {
      name: 'Dados',
      exact: true,
    })
    await expect(linkDados).toHaveAttribute('aria-current', 'page')
    await capturar(page, 'vazio-barra-aberta-claro')

    // Tema escuro com tela vazia
    await page.keyboard.press('Control+Shift+L')
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro')
    await capturar(page, 'vazio-barra-aberta-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Recolher barra lateral: mostra ícone e tooltip "Dados"
    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await linkDados.hover()
    await expect(page.getByRole('tooltip', { name: 'Dados' })).toBeVisible()
    await capturar(page, 'vazio-barra-recolhida-claro')
  })

  test('marcar em andamento → 12 min → "agora · 12 min", recarregar mantém tempo, parar → menu mostra "Tempo gasto: 12 min" e aparece em Dados', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T10:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)
    await semearBase(page)
    await page.goto(`/dia/${HOJE}`)

    const linha = tarefaSolta(page, TAREFA_RELATORIO)
    await escolherNoMenu(page, linha, TAREFA_RELATORIO, 'Marcar como em andamento')
    await expect(linha.getByText('agora · <1 min')).toBeVisible()

    // Avança 12 minutos: atualiza a cada minuto
    await page.clock.fastForward(12 * 60_000)
    await expect(linha.getByText('agora · 12 min')).toBeVisible()
    await capturar(page, 'tarefa-agora-12min-claro')

    // Tema escuro com tarefa a 12 min
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'tarefa-agora-12min-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Recarregar a página com a tarefa ligada mantém o tempo certo
    await page.reload()
    const linhaAposReload = tarefaSolta(page, TAREFA_RELATORIO)
    await expect(linhaAposReload.getByText('agora · 12 min')).toBeVisible()

    // Parar andamento → menu ⋯ mostra "Tempo gasto: 12 min"
    await escolherNoMenu(page, linhaAposReload, TAREFA_RELATORIO, 'Parar andamento')
    await linhaAposReload
      .getByRole('button', { name: `Mais ações para ${TAREFA_RELATORIO}` })
      .click()
    await expect(page.getByText('Tempo gasto: 12 min')).toBeVisible()
    await page.keyboard.press('Escape')

    // Aparece na aba Dados
    await page.getByRole('link', { name: 'Dados', exact: true }).click()
    await expect(page.locator('[data-resumo-total]')).toHaveText('12 min')
    await expect(page.locator('[data-linha-tempo]', { hasText: TAREFA_RELATORIO })).toContainText(
      '12 min',
    )
  })

  test('adiar para amanhã uma tarefa com tempo e ligar no dia seguinte soma os dois dias em Dados', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T10:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)
    await semearBase(page)
    await page.goto(`/dia/${HOJE}`)

    // Dia 1 (HOJE): 15 min em andamento e adia para amanhã (desliga o andamento sozinho)
    const linhaHoje = tarefaSolta(page, TAREFA_RELATORIO)
    await escolherNoMenu(page, linhaHoje, TAREFA_RELATORIO, 'Marcar como em andamento')
    await page.clock.fastForward(15 * 60_000)
    await escolherNoMenu(page, linhaHoje, TAREFA_RELATORIO, 'Adiar para amanhã')

    // Dia 2 (AMANHA): +25 min na mesma tarefa e para
    await page.clock.setSystemTime(new Date(`${AMANHA}T09:00:00-03:00`))
    await page.goto(`/dia/${AMANHA}`)
    const linhaAmanha = tarefaSolta(page, TAREFA_RELATORIO)
    await escolherNoMenu(page, linhaAmanha, TAREFA_RELATORIO, 'Marcar como em andamento')
    await page.clock.fastForward(25 * 60_000)
    await escolherNoMenu(page, linhaAmanha, TAREFA_RELATORIO, 'Parar andamento')

    // Também mede 30 min na outra tarefa para popular os gráficos
    await page.goto(`/dia/${HOJE}`)
    const linhaEstudo = tarefaSolta(page, TAREFA_ESTUDO)
    await escolherNoMenu(page, linhaEstudo, TAREFA_ESTUDO, 'Marcar como em andamento')
    await page.clock.fastForward(30 * 60_000)
    await escolherNoMenu(page, linhaEstudo, TAREFA_ESTUDO, 'Parar andamento')

    // Abre Dados (Esta semana): mostra a soma 15 + 25 = 40 min na tarefa adiada
    await page.getByRole('link', { name: 'Dados', exact: true }).click()
    const linhaRelatorio = page.locator('[data-linha-tempo]', { hasText: TAREFA_RELATORIO })
    await expect(linhaRelatorio).toContainText('40 min')
    await expect(linhaRelatorio).toContainText('03/11, 04/11')
    await expect(page.locator('[data-resumo-total]')).toHaveText('1h 10 min')
    await expect(page.locator('[data-resumo-tarefas]')).toHaveText('2 tarefas')

    // Gráfico por tarefa e gráfico por dia visíveis
    await expect(page.getByRole('region', { name: 'Tempo por tarefa' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Tempo por dia' })).toBeVisible()
    await page.locator(`[data-coluna-dia="${HOJE}"]`).hover()
    await expect(page.locator('[data-resumo-dia-grafico]')).toContainText('03/11')

    await capturar(page, 'com-dados-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'com-dados-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Barra lateral recolhida na tela Dados com dados
    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await page.getByRole('link', { name: 'Dados', exact: true }).hover()
    await expect(page.getByRole('tooltip', { name: 'Dados' })).toBeVisible()
    await capturar(page, 'com-dados-barra-recolhida-claro')
    await page.getByRole('button', { name: 'Expandir menu' }).click()

    // Filtros Hoje / Esta semana / Este mês
    await page.getByRole('button', { name: 'Hoje', exact: true }).click()
    // Gráfico por dia só aparece em semana/mês/intervalo
    await expect(page.getByRole('region', { name: 'Tempo por dia' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Este mês', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Tempo por dia' })).toBeVisible()
    await page.getByRole('button', { name: 'Esta semana', exact: true }).click()

    // Busca por título ou categoria
    const campoBusca = page.getByRole('searchbox', { name: 'Buscar por título ou categoria' })
    await campoBusca.fill('Estudos')
    await expect(page.locator('[data-linha-tempo]')).toHaveCount(1)
    await expect(page.locator('[data-linha-tempo]')).toContainText(TAREFA_ESTUDO)
    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(page.locator('[data-linha-tempo]')).toHaveCount(2)

    // Expandir tarefa, editar uma sessão e conferir atualização do tempo
    await linhaRelatorio.getByRole('button').first().click()
    const sessoes = linhaRelatorio.getByRole('list', {
      name: `Sessões de ${TAREFA_RELATORIO}`,
    })
    await expect(sessoes.getByRole('listitem')).toHaveCount(2)
    await sessoes
      .getByRole('button', { name: new RegExp(`Editar sessão de ${TAREFA_RELATORIO}`) })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: 'Editar sessão' })
    await dialog.getByLabel('Horário de fim').fill('09:35')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(linhaRelatorio).toContainText('50 min')
  })

  test('gráfico "Por tarefa": 3 tarefas com proporções 100%/67%/33% e 10 tarefas com 8 linhas + "+2 outras"', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T12:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)

    // Semeia 3 tarefas com categorias diferentes e tempos 30 min, 20 min e 10 min
    await page.evaluate(
      async ({ hoje }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const categorias = (await importar(
          '/src/db/repositories/category-repository.ts',
        )) as ModuloCategorias
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        const catTrabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#8B3DFF' })
        const catEstudos = await categorias.criarCategoria({ nome: 'Estudos', cor: '#10B981' })
        const catPessoal = await categorias.criarCategoria({ nome: 'Pessoal', cor: '#EC4899' })

        const t1 = await tarefas.criarTarefa({
          titulo: 'Tarefa 30 min',
          data: hoje,
          categoryId: catTrabalho.id,
        })
        const t2 = await tarefas.criarTarefa({
          titulo: 'Tarefa 20 min',
          data: hoje,
          categoryId: catEstudos.id,
        })
        const t3 = await tarefas.criarTarefa({
          titulo: 'Tarefa 10 min',
          data: hoje,
          categoryId: catPessoal.id,
        })

        await db.table('sessions').bulkAdd([
          {
            id: 's-t1',
            tarefaId: t1.id,
            categoryId: catTrabalho.id,
            inicio: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T10:30:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T10:30:00-03:00`).toISOString(),
          },
          {
            id: 's-t2',
            tarefaId: t2.id,
            categoryId: catEstudos.id,
            inicio: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T10:20:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T10:20:00-03:00`).toISOString(),
          },
          {
            id: 's-t3',
            tarefaId: t3.id,
            categoryId: catPessoal.id,
            inicio: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T10:10:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T10:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T10:10:00-03:00`).toISOString(),
          },
        ])
      },
      { hoje: HOJE },
    )

    await page.goto('/dados')
    const regiaoGrafico = page.getByRole('region', { name: 'Tempo por tarefa' })
    await expect(regiaoGrafico).toBeVisible()

    // Legenda exibe as 3 categorias
    const legenda = regiaoGrafico.locator('[data-legenda-categorias]')
    await expect(legenda.getByText('Trabalho')).toBeVisible()
    await expect(legenda.getByText('Estudos')).toBeVisible()
    await expect(legenda.getByText('Pessoal')).toBeVisible()

    // 3 barras na ordem 30 min, 20 min, 10 min com proporções 100%, 67%, 33%
    const barras = regiaoGrafico.locator('[data-barra-tarefa]')
    await expect(barras).toHaveCount(3)

    const barra1 = barras.nth(0)
    await expect(barra1).toContainText('Tarefa 30 min')
    await expect(barra1).toContainText('30 min')
    await expect(barra1).toHaveAttribute('data-proporcao', '100')

    const barra2 = barras.nth(1)
    await expect(barra2).toContainText('Tarefa 20 min')
    await expect(barra2).toContainText('20 min')
    await expect(barra2).toHaveAttribute('data-proporcao', '67')

    const barra3 = barras.nth(2)
    await expect(barra3).toContainText('Tarefa 10 min')
    await expect(barra3).toContainText('10 min')
    await expect(barra3).toHaveAttribute('data-proporcao', '33')

    // Capturas da tela Dados em Esta semana (claro e escuro)
    await capturar(page, 'esta-semana-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'esta-semana-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Filtro Hoje: ocupa a largura toda (sem gráfico por dia)
    await page.getByRole('button', { name: 'Hoje', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Tempo por dia' })).toHaveCount(0)
    await capturar(page, 'hoje-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'hoje-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Agora adiciona mais 7 tarefas (total 10 tarefas) para testar o limite de 8 + "+2 outras"
    await page.evaluate(
      async ({ hoje }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        for (let i = 4; i <= 10; i++) {
          const t = await tarefas.criarTarefa({
            titulo: `Tarefa extra ${i}`,
            data: hoje,
          })
          const minutos = 10 - i + 2 // 8, 7, 6, 5, 4, 3, 2 min
          await db.table('sessions').add({
            id: `s-extra-${i}`,
            tarefaId: t.id,
            inicio: new Date(`${hoje}T08:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T08:0${minutos}:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T08:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T08:0${minutos}:00-03:00`).toISOString(),
          })
        }
      },
      { hoje: HOJE },
    )

    // Recarrega em /dados e verifica 8 linhas individuais + "+2 outras"
    await page.goto('/dados')
    const novasBarras = page
      .getByRole('region', { name: 'Tempo por tarefa' })
      .locator('[data-barra-tarefa]')
    await expect(novasBarras).toHaveCount(9)
    await expect(novasBarras.nth(8)).toContainText('+2 outras')
  })

  test('ligar e avançar 5h mostra aviso de sessão longa ao reabrir; "Ajustar…" corrige o fim', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T08:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)
    await semearBase(page)
    await page.goto(`/dia/${HOJE}`)

    const linha = tarefaSolta(page, TAREFA_RELATORIO)
    await escolherNoMenu(page, linha, TAREFA_RELATORIO, 'Marcar como em andamento')

    // Avança 5 horas e reabre o app
    await page.clock.fastForward(5 * 60 * 60_000)
    await page.reload()

    const aviso = page.locator('[data-aviso-sessao-longa]')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText(`‘${TAREFA_RELATORIO}’ está em andamento há 5h`)
    await capturar(page, 'aviso-sessao-longa')

    await aviso.getByRole('button', { name: 'Ajustar…' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Ajustar horário de fim' })
    await dialogo.getByLabel('Horário de fim').fill('09:30')
    await dialogo.getByRole('button', { name: 'Salvar' }).click()

    await expect(aviso).toHaveCount(0)
    await expect(linha.locator('[data-em-andamento]')).toHaveCount(0)

    // Em Dados, a sessão ajustada tem 1h 30 min (08:00 -> 09:30)
    await page.getByRole('link', { name: 'Dados', exact: true }).click()
    await expect(page.locator('[data-resumo-total]')).toHaveText('1h 30 min')
  })
})
