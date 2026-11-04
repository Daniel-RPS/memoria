import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * E2E da aba "Dados" › "Tempo nas tarefas" e do timer automático de "Em andamento".
 * Capturas salvas em `e2e/capturas/dados-*.png`.
 */

const HOJE = '2026-11-04'
const ONTEM = '2026-11-03'
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

    // Aparece na aba Dados com média e realizadas
    await page.getByRole('link', { name: 'Dados', exact: true }).click()
    await expect(page.locator('[data-resumo-media]')).toHaveText('12 min')
    await expect(page.locator('[data-resumo-realizadas]')).toHaveText('1')
    await expect(page.locator('[data-categoria-tempo="Trabalho"]')).toContainText('12 min')
  })

  test('Hoje com 4 tarefas (2h 10, 1h 45, 1h 45, 17 min): resumo com média 1h 29 min, 4 realizadas, mais tempo "Fazer curso", menos tempo "Fazer o resumo do livro abc", sem pizza, lista por categoria abre', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T18:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)

    // Semeia 4 tarefas com tempos: 2h 10 min, 1h 45 min, 1h 45 min, 17 min
    await page.evaluate(
      async ({ hoje }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const categorias = (await importar(
          '/src/db/repositories/category-repository.ts',
        )) as ModuloCategorias
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        const catCursos = await categorias.criarCategoria({ nome: 'Cursos', cor: '#8B3DFF' })
        const catTrabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#3B82F6' })
        const catLeitura = await categorias.criarCategoria({ nome: 'Leitura', cor: '#10B981' })

        // 1. "Fazer curso" (2h 10 min = 130 min): 09:00 às 11:10
        const t1 = await tarefas.criarTarefa({
          titulo: 'Fazer curso',
          data: hoje,
          categoryId: catCursos.id,
        })
        // 2. "Revisar PR" (1h 45 min = 105 min): 11:30 às 13:15
        const t2 = await tarefas.criarTarefa({
          titulo: 'Revisar PR',
          data: hoje,
          categoryId: catTrabalho.id,
        })
        // 3. "Organizar notas" (1h 45 min = 105 min): 14:00 às 15:45
        const t3 = await tarefas.criarTarefa({
          titulo: 'Organizar notas',
          data: hoje,
          categoryId: catTrabalho.id,
        })
        // 4. "Fazer o resumo do livro abc" (17 min): 16:00 às 16:17
        const t4 = await tarefas.criarTarefa({
          titulo: 'Fazer o resumo do livro abc',
          data: hoje,
          categoryId: catLeitura.id,
        })

        // Também inclui uma sessão de 30s para garantir que sessões < 1 min sejam ignoradas no menos tempo
        const tExtraCurta = await tarefas.criarTarefa({
          titulo: 'Olhar relógio',
          data: hoje,
        })

        await db.table('sessions').bulkAdd([
          {
            id: 's-t1',
            tarefaId: t1.id,
            categoryId: catCursos.id,
            inicio: new Date(`${hoje}T09:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T11:10:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T09:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T11:10:00-03:00`).toISOString(),
          },
          {
            id: 's-t2',
            tarefaId: t2.id,
            categoryId: catTrabalho.id,
            inicio: new Date(`${hoje}T11:30:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T13:15:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T11:30:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T13:15:00-03:00`).toISOString(),
          },
          {
            id: 's-t3',
            tarefaId: t3.id,
            categoryId: catTrabalho.id,
            inicio: new Date(`${hoje}T14:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T15:45:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T14:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T15:45:00-03:00`).toISOString(),
          },
          {
            id: 's-t4',
            tarefaId: t4.id,
            categoryId: catLeitura.id,
            inicio: new Date(`${hoje}T16:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T16:17:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T16:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T16:17:00-03:00`).toISOString(),
          },
          {
            id: 's-extra',
            tarefaId: tExtraCurta.id,
            inicio: new Date(`${hoje}T17:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T17:00:30-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T17:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T17:00:30-03:00`).toISOString(),
          },
        ])
      },
      { hoje: HOJE },
    )

    await page.goto('/dados')

    // Ativa o filtro Hoje
    await page.getByRole('button', { name: 'Hoje', exact: true }).click()

    // 1. Linha de resumo: 4 métricas, sem total no período
    await expect(page.locator('[data-resumo-total]')).toHaveCount(0)
    await expect(page.locator('[data-resumo-media]')).toHaveText('1h 11 min') // (357 min + 30s) / 5 tarefas = 71 min = 1h 11 min
    await expect(page.locator('[data-resumo-realizadas]')).toHaveText('5')
    await expect(page.locator('[data-resumo-maior]')).toContainText('Fazer curso')
    await expect(page.locator('[data-resumo-maior]')).toContainText('(2h 10 min)')
    // Menos tempo ignora a tarefa de 30s (<1 min) e escolhe "Fazer o resumo do livro abc (17 min)"
    await expect(page.locator('[data-resumo-menor]')).toContainText('Fazer o resumo do livro abc')
    await expect(page.locator('[data-resumo-menor]')).toContainText('(17 min)')

    // 2. Gráfico por tarefa: título "Por tarefa", sem pizza
    await expect(page.locator('[data-grafico-por-tarefa]')).toBeVisible()
    await expect(page.locator('[data-grafico-por-tarefa] h3')).toHaveText('Por tarefa')
    await expect(page.locator('[data-grafico-pizza]')).toHaveCount(0)

    // 3. Lista por categoria: expande categoria Cursos e confere horário da sessão
    const catCursos = page.locator('[data-categoria-tempo="Cursos"]')
    await expect(catCursos).toBeVisible()
    await catCursos.getByRole('button').first().click()

    const linhaCurso = page.locator('[data-linha-tempo="Fazer curso"]')
    await expect(linhaCurso).toBeVisible()
    await expect(linhaCurso).toContainText('09:00 – 11:10')
    await expect(linhaCurso).toContainText('2h 10 min')

    // Capturas Hoje (claro e escuro)
    await capturar(page, 'hoje-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'hoje-escuro')
    await page.keyboard.press('Control+Shift+L')
  })

  test('Esta semana e Este mês: top 5 tarefas nas barras, pizza por categoria com % somando 100%, sem gráfico por dia', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T12:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)

    // Semeia 7 categorias e tarefas com tempos variados
    await page.evaluate(
      async ({ hoje }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const categorias = (await importar(
          '/src/db/repositories/category-repository.ts',
        )) as ModuloCategorias
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        const cores = ['#8B3DFF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4']
        const nomes = ['Trabalho', 'Estudos', 'Saúde', 'Finanças', 'Casa', 'Projetos', 'Lazer']

        for (let i = 0; i < nomes.length; i++) {
          const cat = await categorias.criarCategoria({ nome: nomes[i], cor: cores[i] })
          const t = await tarefas.criarTarefa({
            titulo: `Tarefa ${nomes[i]}`,
            data: hoje,
            categoryId: cat.id,
          })
          const minutos = (nomes.length - i) * 20 // 140, 120, 100, 80, 60, 40, 20 min
          await db.table('sessions').add({
            id: `s-cat-${i}`,
            tarefaId: t.id,
            categoryId: cat.id,
            inicio: new Date(`${hoje}T08:00:00-03:00`).toISOString(),
            fim: new Date(
              new Date(`${hoje}T08:00:00-03:00`).getTime() + minutos * 60_000,
            ).toISOString(),
            criadoEm: new Date(`${hoje}T08:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T08:00:00-03:00`).toISOString(),
          })
        }
      },
      { hoje: HOJE },
    )

    await page.goto('/dados')

    // Filtro Esta semana
    await page.getByRole('button', { name: 'Esta semana', exact: true }).click()

    // 1. Gráfico de barras: título "Top 5 tarefas", exatamente 5 barras (sem +N outras)
    const regiaoBarras = page.locator('[data-grafico-por-tarefa]')
    await expect(regiaoBarras).toBeVisible()
    await expect(regiaoBarras.locator('h3')).toHaveText('Top 5 tarefas')
    await expect(regiaoBarras.locator('[data-barra-tarefa]')).toHaveCount(5)

    // 2. Gráfico de pizza por categoria ao lado das barras
    const regiaoPizza = page.locator('[data-grafico-pizza]')
    await expect(regiaoPizza).toBeVisible()
    // Sem gráfico por dia
    await expect(page.locator('[data-coluna-dia]')).toHaveCount(0)

    // 7 categorias -> 6 fatias (Top 5 + "Outras")
    const fatias = regiaoPizza.locator('[data-fatia-pizza]')
    await expect(fatias).toHaveCount(6)
    await expect(regiaoPizza.locator('[data-legenda-pizza="Outras"]')).toBeVisible()

    // Centro da rosca mostra 6 categorias
    await expect(regiaoPizza).toContainText('6')
    await expect(regiaoPizza).toContainText('categorias')

    // Hover na legenda de Trabalho destaca fatia e atualiza centro
    const legendaTrabalho = regiaoPizza.locator('[data-legenda-pizza="Trabalho"]')
    await legendaTrabalho.hover()
    await expect(regiaoPizza).toContainText('Trabalho')

    // Capturas Esta semana (claro e escuro)
    await capturar(page, 'semana-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'semana-escuro')
    await page.keyboard.press('Control+Shift+L')

    // Filtro Este mês
    await page.getByRole('button', { name: 'Este mês', exact: true }).click()
    await expect(regiaoBarras.locator('h3')).toHaveText('Top 5 tarefas')
    await expect(regiaoPizza).toBeVisible()
    await expect(page.locator('[data-coluna-dia]')).toHaveCount(0)

    // Capturas Este mês (claro e escuro)
    await capturar(page, 'mes-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'mes-escuro')
    await page.keyboard.press('Control+Shift+L')
  })

  test('Escolher… seleciona dia passado e fecha; dia futuro desabilitado; dia com tempo tem pontinho; conteúdo idêntico a Hoje', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T12:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)

    // Semeia uma sessão no dia anterior (ONTEM = 2026-11-03) das 09:00 às 11:55 (2h 55 min)
    await page.evaluate(
      async ({ ontem }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const categorias = (await importar(
          '/src/db/repositories/category-repository.ts',
        )) as ModuloCategorias
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        const catTrabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#8B3DFF' })
        const tPassada = await tarefas.criarTarefa({
          titulo: 'Finalizar relatório do projeto',
          data: ontem,
          categoryId: catTrabalho.id,
        })

        await db.table('sessions').add({
          id: 's-passada-1',
          tarefaId: tPassada.id,
          categoryId: catTrabalho.id,
          inicio: new Date(`${ontem}T09:00:00-03:00`).toISOString(),
          fim: new Date(`${ontem}T11:55:00-03:00`).toISOString(),
          criadoEm: new Date(`${ontem}T09:00:00-03:00`).toISOString(),
          atualizadoEm: new Date(`${ontem}T11:55:00-03:00`).toISOString(),
        })
      },
      { ontem: ONTEM },
    )

    await page.goto('/dados')

    // Abre o popover "Escolher…"
    const botaoEscolher = page.getByRole('button', { name: 'Escolher um dia' })
    await botaoEscolher.click()

    // 1. Texto de ajuda "Escolha um dia"
    await expect(page.getByText('Escolha um dia')).toBeVisible()

    // 2. Dia com tempo tem pontinho discreto [data-ponto-tempo]
    const diaComTempo = page.locator('[data-ponto-tempo]')
    await expect(diaComTempo).toBeVisible()

    // 3. Dia futuro (amanhã 05/11) está desabilitado
    const diaFuturo = page.getByRole('button', { name: /5 de novembro|05\/11/i }).first()
    await expect(diaFuturo).toBeDisabled()

    // Captura com calendário aberto (claro e escuro)
    await capturar(page, 'calendario-aberto-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'calendario-aberto-escuro')
    await page.keyboard.press('Control+Shift+L')

    // 4. Clicar no dia ontem (03/11) seleciona e fecha o calendário imediatamente
    const botaoDiaOntem = page.getByRole('button', { name: /3 de novembro|03\/11/i }).first()
    await botaoDiaOntem.click()

    // O popover fecha
    await expect(page.getByText('Escolha um dia')).toHaveCount(0)

    // O botão mostra o dia escolhido ("ter, 03/11"), destacado
    const botaoDiaAtivo = page.getByRole('button', { name: /Dia selecionado: ter, 03\/11/ })
    await expect(botaoDiaAtivo).toBeVisible()
    await expect(botaoDiaAtivo).toHaveAttribute('aria-pressed', 'true')

    // 5. Conteúdo é exatamente o mesmo de Hoje (sem pizza, barras com título "Por tarefa")
    await expect(page.locator('[data-grafico-pizza]')).toHaveCount(0)
    await expect(page.locator('[data-grafico-por-tarefa] h3')).toHaveText('Por tarefa')

    // Abre a categoria e confere a sessão "09:00 – 11:55" e duração "2h 55 min"
    const catTrabalho = page.locator('[data-categoria-tempo="Trabalho"]')
    await expect(catTrabalho).toBeVisible()
    await catTrabalho.getByRole('button').first().click()

    const linhaTarefa = page.locator('[data-linha-tempo="Finalizar relatório do projeto"]')
    await expect(linhaTarefa).toBeVisible()
    await expect(linhaTarefa).toContainText('09:00 – 11:55')
    await expect(linhaTarefa).toContainText('2h 55 min')

    // Capturas Dia Escolhido (claro e escuro)
    await capturar(page, 'dia-escolhido-claro')
    await page.keyboard.press('Control+Shift+L')
    await capturar(page, 'dia-escolhido-escuro')
    await page.keyboard.press('Control+Shift+L')

    // 6. Clicar no dia de hoje no calendário equivale a clicar em "Hoje"
    await botaoDiaAtivo.click()
    const botaoDiaHoje = page.getByRole('button', { name: /4 de novembro|04\/11/i }).first()
    await botaoDiaHoje.click()
    await expect(page.getByRole('button', { name: 'Hoje', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('barras nítidas: altura fixa 7px, cantos arredondados, sem blur em zoom 100% e 150%', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(`${HOJE}T12:00:00-03:00`) })
    await page.goto(`/dia/${HOJE}`)

    // Semeia 2 tarefas com tempo para renderizar barras
    await page.evaluate(
      async ({ hoje }) => {
        const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
        const categorias = (await importar(
          '/src/db/repositories/category-repository.ts',
        )) as ModuloCategorias
        const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
        const database = (await importar('/src/db/database.ts')) as { db: import('dexie').Dexie }
        const db = database.db

        const cat = await categorias.criarCategoria({ nome: 'Design', cor: '#8B3DFF' })
        const t1 = await tarefas.criarTarefa({
          titulo: 'Criar protótipo',
          data: hoje,
          categoryId: cat.id,
        })
        const t2 = await tarefas.criarTarefa({
          titulo: 'Revisar cores',
          data: hoje,
          categoryId: cat.id,
        })

        await db.table('sessions').bulkAdd([
          {
            id: 's-b1',
            tarefaId: t1.id,
            categoryId: cat.id,
            inicio: new Date(`${hoje}T09:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T10:30:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T09:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T10:30:00-03:00`).toISOString(),
          },
          {
            id: 's-b2',
            tarefaId: t2.id,
            categoryId: cat.id,
            inicio: new Date(`${hoje}T11:00:00-03:00`).toISOString(),
            fim: new Date(`${hoje}T11:45:00-03:00`).toISOString(),
            criadoEm: new Date(`${hoje}T11:00:00-03:00`).toISOString(),
            atualizadoEm: new Date(`${hoje}T11:45:00-03:00`).toISOString(),
          },
        ])
      },
      { hoje: HOJE },
    )

    await page.goto('/dados')

    const barra = page.locator('[data-barra-retangulo]').first()
    await expect(barra).toBeVisible()

    // Verifica que a barra é um elemento div com altura 7px e cantos arredondados
    const tagName = await barra.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe('div')
    await expect(barra).toHaveClass(/h-\[7px\]/)
    await expect(barra).toHaveClass(/rounded-full/)

    // Captura em zoom 100%
    await capturar(page, 'barras-zoom-100')

    // Aplica zoom de 150% e captura para inspeção de nitidez
    await page.evaluate(() => {
      document.body.style.zoom = '1.5'
    })
    await capturar(page, 'barras-zoom-150')
  })
})
