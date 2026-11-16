import { expect, test } from '@playwright/test'

const HOJE = '2026-11-03'
const AMANHA = '2026-11-04'

test('arrasto sustentado no modo Cartoes', async ({ page }) => {
  test.setTimeout(60000)

  const erros: string[] = []
  page.on('pageerror', (err) => {
    console.log('[PAGEERROR]', err.message)
    erros.push(err.message)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[CONSOLE.ERROR]', msg.text())
    }
  })

  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${AMANHA}`)

  // Semear: 1 grupo recolhido (padrão) com 3 itens, 1 grupo aberto com 3 itens, 3 tarefas soltas
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts'))
      const tarefas = (await importar('/src/db/repositories/task-repository.ts'))

      // Grupo 1: recolhido (padrão) com 3 itens
      const g1 = await grupos.criarGrupo({ titulo: 'Grupo Recolhido', data: hoje })
      await grupos.criarItem(g1.id, 'Item Rec 1')
      await grupos.criarItem(g1.id, 'Item Rec 2')
      await grupos.criarItem(g1.id, 'Item Rec 3')

      // Grupo 2: aberto com 3 itens
      const g2 = await grupos.criarGrupo({ titulo: 'Grupo Aberto', data: hoje })
      await grupos.criarItem(g2.id, 'Item Aberto 1')
      await grupos.criarItem(g2.id, 'Item Aberto 2')
      await grupos.criarItem(g2.id, 'Item Aberto 3')

      // 3 tarefas soltas
      await tarefas.criarTarefa({ titulo: 'Tarefa Solta 1', data: hoje })
      await tarefas.criarTarefa({ titulo: 'Tarefa Solta 2', data: hoje })
      await tarefas.criarTarefa({ titulo: 'Tarefa Solta 3', data: hoje })
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByText('Tarefa Solta 1')).toBeVisible()

  // Alternar para modo Cartões
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  // Expandir o Grupo Aberto: clica no botão de abrir do grupo
  await page.getByRole('button', { name: 'Abrir Grupo Aberto' }).click()
  await expect(page.getByText('Item Aberto 1')).toBeVisible()

  // 1. Arrastar Tarefa Solta 1 por pelo menos 80 passos pequenos (~2s) sobre outros cartões e grupos
  console.log('--- TESTANDO ARRASTO TAREFA SOLTA ---')
  const solta = page.getByText('Tarefa Solta 1')
  const boxSolta = await solta.boundingBox()
  if (!boxSolta) throw new Error('boxSolta não encontrada')

  await page.mouse.move(boxSolta.x + boxSolta.width / 2, boxSolta.y + boxSolta.height / 2)
  await page.mouse.down()
  for (let i = 0; i < 85; i++) {
    const deltaY = Math.sin(i / 5) * 120
    const deltaX = Math.cos(i / 5) * 120
    await page.mouse.move(boxSolta.x + boxSolta.width / 2 + deltaX, boxSolta.y + boxSolta.height / 2 + deltaY)
    await page.waitForTimeout(20)
  }
  await page.mouse.up()

  console.log('Erros apos solta:', erros)
  expect(erros).toHaveLength(0)

  // 2. Arrastar Grupo Aberto (pela alça no cabeçalho)
  console.log('--- TESTANDO ARRASTO GRUPO ABERTO ---')
  const alcaGrupo = page.getByRole('article', { name: 'Grupo Aberto' }).getByRole('button', { name: /Mover grupo/ })
  const boxGrupo = await alcaGrupo.boundingBox()
  if (!boxGrupo) throw new Error('boxGrupo não encontrada')

  await page.mouse.move(boxGrupo.x + boxGrupo.width / 2, boxGrupo.y + boxGrupo.height / 2)
  await page.mouse.down()
  for (let i = 0; i < 85; i++) {
    const deltaY = Math.sin(i / 5) * 120
    const deltaX = Math.cos(i / 5) * 120
    await page.mouse.move(boxGrupo.x + boxGrupo.width / 2 + deltaX, boxGrupo.y + boxGrupo.height / 2 + deltaY)
    await page.waitForTimeout(20)
  }
  await page.mouse.up()

  console.log('Erros apos grupo:', erros)
  expect(erros).toHaveLength(0)

  // 3. Arrastar item de dentro do grupo aberto
  console.log('--- TESTANDO ARRASTO ITEM ---')
  const itemAberto = page.getByText('Item Aberto 1')
  const boxItem = await itemAberto.boundingBox()
  if (!boxItem) throw new Error('boxItem não encontrada')

  await page.mouse.move(boxItem.x + boxItem.width / 2, boxItem.y + boxItem.height / 2)
  await page.mouse.down()
  for (let i = 0; i < 85; i++) {
    const deltaY = Math.sin(i / 5) * 120
    const deltaX = Math.cos(i / 5) * 120
    await page.mouse.move(boxItem.x + boxItem.width / 2 + deltaX, boxItem.y + boxItem.height / 2 + deltaY)
    await page.waitForTimeout(20)
  }
  await page.mouse.up()

  console.log('Erros apos item:', erros)
  expect(erros).toHaveLength(0)

  await expect(page.getByText('Unexpected Application Error')).not.toBeVisible()
})
