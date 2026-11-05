import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: Estado aberto/recolhido de grupos na visão Semana.
 * - Só o card de hoje abre aberto por padrão.
 * - Abrir um card de outro dia não afeta os outros dias da mesma série.
 * - Fechar o card de hoje afeta apenas hoje.
 * - Sair para Notas e voltar reseta para o padrão (hoje aberto, resto recolhido).
 * - Navegar para outra semana e voltar mantém o padrão.
 * - Visão Dia continua lembrando o estado do grupo pelo localStorage normalmente.
 */

const HOJE = '2026-11-05' // quinta-feira
const TERCA = '2026-11-03'
const QUARTA = '2026-11-04'
const QUINTA = '2026-11-05'
const SEGUNDA_SEMANA_SEGUINTE = '2026-11-10'

interface ModuloGrupos {
  criarGrupo: (dados: { titulo: string; data: string }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<unknown>
}

interface ModuloBanco {
  db: {
    groupCards: {
      get: (id: string) => Promise<{ seriesId: string } | undefined>
      add: (card: Record<string, unknown>) => Promise<string>
    }
  }
}

async function semearSimuladorPoose(page: Page) {
  await page.evaluate(
    async ({ terca, quarta, quinta, semanaSeguinte }) => {
      const caminhoGrupos = '/src/db/repositories/group-repository.ts'
      const caminhoBanco = '/src/db/database.ts'
      const grupos = (await import(/* @vite-ignore */ caminhoGrupos)) as ModuloGrupos
      const { db } = (await import(/* @vite-ignore */ caminhoBanco)) as ModuloBanco

      // Cria a série e o primeiro card na terça
      const cardTerca = await grupos.criarGrupo({ titulo: 'Simulador POOSE', data: terca })
      await grupos.criarItem(cardTerca.id, 'Item de terça')

      const seriesId = (await db.groupCards.get(cardTerca.id))!.seriesId

      // Cria os cards da mesma série na quarta e na quinta (hoje)
      const idQuarta = crypto.randomUUID()
      await db.groupCards.add({
        id: idQuarta,
        seriesId,
        data: quarta,
        ordem: 1,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      })
      await grupos.criarItem(idQuarta, 'Item de quarta')

      const idQuinta = crypto.randomUUID()
      await db.groupCards.add({
        id: idQuinta,
        seriesId,
        data: quinta,
        ordem: 1,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      })
      await grupos.criarItem(idQuinta, 'Item de quinta')

      // Card na semana seguinte para validar navegação
      const idSeguinte = crypto.randomUUID()
      await db.groupCards.add({
        id: idSeguinte,
        seriesId,
        data: semanaSeguinte,
        ordem: 1,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      })
      await grupos.criarItem(idSeguinte, 'Item da próxima semana')
    },
    { terca: TERCA, quarta: QUARTA, quinta: QUINTA, semanaSeguinte: SEGUNDA_SEMANA_SEGUINTE },
  )
}

function coluna(page: Page, nomeCompleto: string) {
  return page.getByRole('region', { name: nomeCompleto })
}

test.describe('Estado de grupos na visão Semana', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-03:00'))
    await page.goto(`/semana/${HOJE}`)
    await semearSimuladorPoose(page)
    await page.goto(`/semana/${HOJE}`)
  })

  test('comportamento de grupos abertos/recolhidos por card na Semana e persistência no Dia', async ({
    page,
  }) => {
    const colTerca = coluna(page, 'terça-feira, 3 de novembro')
    const colQuarta = coluna(page, 'quarta-feira, 4 de novembro')
    const colQuinta = coluna(page, 'quinta-feira, 5 de novembro')

    // 1. Ao abrir a Semana: só o de quinta (hoje) aberto; terça e quarta recolhidos
    await expect(colQuinta.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colQuinta.getByText('Item de quinta')).toBeVisible()

    await expect(colTerca.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colTerca.getByText('Item de terça')).not.toBeVisible()

    await expect(colQuarta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colQuarta.getByText('Item de quarta')).not.toBeVisible()

    // 2. Abrir o card de terça → só terça abre; quarta continua recolhida; quinta continua aberta
    await colTerca.getByRole('button', { name: 'Expandir Simulador POOSE' }).click()

    await expect(colTerca.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colTerca.getByText('Item de terça')).toBeVisible()

    await expect(colQuarta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colQuarta.getByText('Item de quarta')).not.toBeVisible()

    await expect(colQuinta.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colQuinta.getByText('Item de quinta')).toBeVisible()

    // 3. Fechar o card de quinta → terça continua aberta; quinta e quarta recolhidas
    await colQuinta.getByRole('button', { name: 'Recolher Simulador POOSE' }).click()

    await expect(colQuinta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colQuinta.getByText('Item de quinta')).not.toBeVisible()

    await expect(colTerca.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colTerca.getByText('Item de terça')).toBeVisible()

    await expect(colQuarta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()

    // 4. Sair para Notas e voltar → volta a só quinta aberta
    await page.getByRole('link', { name: 'Notas' }).click()
    await expect(page.getByRole('heading', { name: 'Notas', level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Semana' }).click()
    await expect(colQuinta.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colQuinta.getByText('Item de quinta')).toBeVisible()
    await expect(colTerca.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colQuarta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()

    // 5. Ir para a semana seguinte (›) → tudo recolhido; voltar ("Esta semana") → só hoje aberto
    await page.getByRole('link', { name: 'Próxima semana' }).click()
    const colTercaSeguinte = coluna(page, 'terça-feira, 10 de novembro')
    // Na semana seguinte, o card cadastrado começa recolhido
    await expect(
      colTercaSeguinte.getByRole('button', { name: 'Expandir Simulador POOSE' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recolher Simulador POOSE' })).toHaveCount(0)

    // Voltar para a semana atual usando o botão "Esta semana"
    await page.getByRole('link', { name: 'Esta semana' }).click()
    await expect(colQuinta.getByRole('button', { name: 'Recolher Simulador POOSE' })).toBeVisible()
    await expect(colQuinta.getByText('Item de quinta')).toBeVisible()
    await expect(colTerca.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()
    await expect(colQuarta.getByRole('button', { name: 'Expandir Simulador POOSE' })).toBeVisible()

    // 6. Visão Dia continua lembrando o estado do grupo como antes
    await page.goto(`/dia/${HOJE}`)
    // No dia, grupo começa recolhido se não estiver salvo em memoria:dia-layout
    const botaoGrupoDia = page.getByRole('button', { name: /Abrir Simulador POOSE/ })
    await expect(botaoGrupoDia).toBeVisible()
    // Abre o grupo no Dia
    await botaoGrupoDia.click()
    await expect(page.getByRole('button', { name: /Recolher Simulador POOSE/ })).toBeVisible()
    await expect(page.getByText('Item de quinta')).toBeVisible()

    // Ao navegar para outro dia e voltar, o estado continua lembrado pelo localStorage (memoria:dia-layout)
    await page.goto('/dia/2026-11-04')
    await page.goto(`/dia/${HOJE}`)
    await expect(page.getByRole('button', { name: /Recolher Simulador POOSE/ })).toBeVisible()
    await expect(page.getByText('Item de quinta')).toBeVisible()
  })
})
