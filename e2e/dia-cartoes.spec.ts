import { expect, test, type Page } from '@playwright/test'
import { expandirGrupos } from './expandir-grupos.ts'

const HOJE = '2026-11-03'
const AMANHA = '2026-11-04'

interface ModuloGrupos {
  criarGrupo: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
  criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
  definirConclusaoItem: (id: string, concluido: boolean) => Promise<unknown>
  definirPrioridadeItem: (id: string, prioridade: boolean) => Promise<unknown>
  definirEmAndamentoItem: (id: string, emAndamento: boolean) => Promise<unknown>
}

interface ModuloTarefas {
  criarTarefa: (dados: {
    titulo: string
    data: string
    categoryId?: string
  }) => Promise<{ id: string }>
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

async function semearDiaCartoes(page: Page) {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const tarefas = (await importar('/src/db/repositories/task-repository.ts')) as ModuloTarefas
      const categorias = (await importar(
        '/src/db/repositories/category-repository.ts',
      )) as ModuloCategorias
      const pessoal = await categorias.criarCategoria({ nome: 'Pessoal', cor: '#2f8a57' })
      const estudos = await categorias.criarCategoria({ nome: 'Estudos', cor: '#5b4fbf' })

      // 2 grupos: Casa e Livros
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: pessoal.id })
      await grupos.criarItem(casa.id, 'Lavar louça')
      await grupos.criarItem(casa.id, 'Regar plantas')

      const livros = await grupos.criarGrupo({
        titulo: 'Livros',
        data: hoje,
        categoryId: estudos.id,
      })
      await grupos.criarItem(livros.id, 'Ler capítulo 3')

      // 2 tarefas soltas pendentes
      await tarefas.criarTarefa({ titulo: 'Fazer compras', data: hoje })
      await tarefas.criarTarefa({ titulo: 'Ligar para o dentista', data: hoje })
    },
    { hoje: HOJE },
  )
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${AMANHA}`)
})

test('Dia com 2 grupos e 2 tarefas soltas mostra seções Grupos e Tarefas soltas, 2 caixas de grupo e persiste modo Cartões', async ({
  page,
}) => {
  await semearDiaCartoes(page)
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByText('Fazer compras')).toBeVisible()

  // Alternar para modo Cartões
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  // Seções com cabeçalho
  await expect(page.getByRole('button', { name: 'Grupos, 2 grupos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tarefas soltas, 2 pendentes' })).toBeVisible()

  // 2 caixas de grupo
  await expect(page.getByRole('article', { name: 'Grupo Casa' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Grupo Livros' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo grupo' })).toBeVisible()

  // Recarregar e conferir se continua em Cartões
  await page.reload()
  await expect(page.getByRole('button', { name: 'Grupos, 2 grupos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tarefas soltas, 2 pendentes' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Grupo Casa' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Grupo Livros' })).toBeVisible()
})

test('Hierarquia visual: seções Grupos e Tarefas soltas, pasta no grupo, item do grupo sem categoria e solta com categoria', async ({
  page,
}) => {
  await semearDiaCartoes(page)
  await page.goto(`/dia/${HOJE}`)

  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  await expandirGrupos(page)

  // 1. Cabeçalhos de seção
  await expect(page.getByRole('button', { name: 'Grupos, 2 grupos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tarefas soltas, 2 pendentes' })).toBeVisible()

  // 2. Grupo Casa tem ícone de pasta e não envolve tarefas soltas
  const grupoCasa = page.getByRole('article', { name: 'Grupo Casa' })
  await expect(grupoCasa).toBeVisible()
  // Possui ícone Lucide folder (svg com class lucide-folder)
  await expect(grupoCasa.locator('svg.lucide-folder')).toBeVisible()

  // 3. Tarefa do grupo Casa NÃO mostra categoria no seu cartão de item
  // Casa tem categoria Pessoal, mas o item 'Lavar louça' não exibe a tag 'Pessoal'
  await expect(grupoCasa.getByText('Lavar louça')).toBeVisible()
  const itemLouca = grupoCasa.locator('.group\\/linha').filter({ hasText: 'Lavar louça' })
  await expect(itemLouca.getByText('Pessoal')).toBeHidden()

  // 4. Tarefa solta fica fora de caixas de grupo (direto na seção Tarefas soltas)
  const secaoSoltas = page.getByRole('region', { name: 'Tarefas soltas' })
  await expect(secaoSoltas.getByText('Fazer compras')).toBeVisible()
  // Não está dentro de um article
  await expect(secaoSoltas.locator('article')).toHaveCount(0)
})

test('Cartão com 1 item prioritário e 1 em andamento mostra os dois no topo; concluído vai para Concluídas', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const prioridadeRepo = (await importar('/src/db/repositories/prioridade-repository.ts')) as {
        definirPrioridade: (alvos: { tarefas?: string[]; itens?: string[] }, prioridade: boolean) => Promise<unknown>
      }
      const andamentoRepo = (await importar('/src/db/repositories/andamento-repository.ts')) as {
        definirAndamento: (alvos: { tarefas?: string[]; itens?: string[] }, emAndamento: boolean) => Promise<unknown>
      }
      const projeto = await grupos.criarGrupo({ titulo: 'Projeto', data: hoje })
      await grupos.criarItem(projeto.id, 'Item Normal')
      const itemPrioritario = await grupos.criarItem(projeto.id, 'Item Prioritário')
      const itemAndamento = await grupos.criarItem(projeto.id, 'Item Em Andamento')

      await prioridadeRepo.definirPrioridade({ itens: [itemPrioritario.id] }, true)
      await andamentoRepo.definirAndamento({ itens: [itemAndamento.id] }, true)
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  await expandirGrupos(page)

  const cartaoProjeto = page.getByRole('article', { name: 'Grupo Projeto' })
  await expect(cartaoProjeto).toBeVisible()

  // No modo Cartões em grade, cada item é um cartão na grade
  // Ordem esperada: bloco 1 (andamento), bloco 2 (prioridade), bloco 3 (demais)
  await expect(cartaoProjeto.getByText('Item Em Andamento')).toBeVisible()
  await expect(cartaoProjeto.getByText('Item Prioritário')).toBeVisible()
  await expect(cartaoProjeto.getByText('Item Normal')).toBeVisible()

  // Concluir um item
  await cartaoProjeto.getByRole('checkbox', { name: 'Concluir Item Normal' }).click()

  // Concluído vai para o bloco Concluídas
  const botaoConcluidas = cartaoProjeto.getByRole('button', { name: /Concluídas/ })
  await expect(botaoConcluidas).toBeVisible()
  await botaoConcluidas.click()
  await expect(cartaoProjeto.getByText('Item Normal')).toBeVisible()
})

test('Itens do grupo aparecem em grade lado a lado e mostram todas as pendentes', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const casa = await grupos.criarGrupo({ titulo: 'Grande', data: hoje })
      for (let i = 1; i <= 8; i++) {
        await grupos.criarItem(casa.id, `Tarefa ${i}`)
      }
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  await expandirGrupos(page)

  const cartao = page.getByRole('article', { name: 'Grupo Grande' })
  await expect(cartao).toBeVisible()

  // Todas as 8 pendentes aparecem na grade (sem limite de 6)
  for (let i = 1; i <= 8; i++) {
    await expect(cartao.getByText(`Tarefa ${i}`)).toBeVisible()
  }

  // Conferir que os cartões ficam lado a lado (mesmo y ou próximos na grade)
  const box1 = await cartao.getByText('Tarefa 1').boundingBox()
  const box2 = await cartao.getByText('Tarefa 2').boundingBox()
  expect(box1).not.toBeNull()
  expect(box2).not.toBeNull()
  if (box1 && box2) {
    expect(Math.abs(box1.y - box2.y)).toBeLessThan(10)
    expect(box2.x).toBeGreaterThan(box1.x)
  }
})

test('Marcar um item no cartão atualiza a contagem do cabeçalho; menu Levar pendentes duplica como no modo Lista', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje })
      await grupos.criarItem(casa.id, 'Lavar louça')
      await grupos.criarItem(casa.id, 'Regar plantas')
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  await expandirGrupos(page)

  const cartaoCasa = page.getByRole('article', { name: 'Grupo Casa' })
  await expect(cartaoCasa).toBeVisible()
  await expect(cartaoCasa.getByText('0/2')).toBeVisible()

  // Marcar um item
  await cartaoCasa.getByRole('checkbox', { name: 'Concluir Lavar louça' }).click()
  // Contagem atualiza
  await expect(cartaoCasa.getByText('1/2')).toBeVisible()

  // Levar pendentes para amanhã pelo menu ⋯ do grupo
  await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
  await page.getByRole('menuitem', { name: 'Levar pendentes para amanhã' }).click()

  // Lê no banco se duplicou
  const lerCasa = async () => {
    return page.evaluate(async () => {
      const caminho = '/src/db/database.ts'
      const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
      const marca: Record<string, string> = {
        pendente: '[ ]',
        concluido: '[x]',
        transferido: '[→]',
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

  await expect
    .poll(lerCasa)
    .toEqual([
      { data: HOJE, itens: ['[x] Lavar louça', '[→] Regar plantas'] },
      { data: AMANHA, itens: ['[ ] Regar plantas'] },
    ])

  await expect(cartaoCasa.getByText('encerrado')).toBeVisible()
})

test('Subetapas no cartão: digitar texto não inicia arrasto, Enter cria próxima e Esc sai', async ({
  page,
}) => {
  await semearDiaCartoes(page)
  await page.goto(`/dia/${HOJE}`)

  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  // Tarefa solta "Fazer compras"
  const cartaoCompra = page.locator('.group\\/linha').filter({ hasText: 'Fazer compras' })
  await expect(cartaoCompra).toBeVisible()

  // Abrir menu da tarefa e clicar em Adicionar subetapa
  await cartaoCompra.getByRole('button', { name: 'Mais ações para Fazer compras' }).click()
  await page.getByRole('menuitem', { name: 'Adicionar subetapa' }).click()

  // Campo de nova subetapa deve estar focado
  const campoNovaSubetapa = cartaoCompra.getByPlaceholder('Nova subetapa')
  await expect(campoNovaSubetapa).toBeFocused()

  // Digitar texto longo com acentos, espaços e barras
  const textoSubetapa = 'Fazer macarrão com alho na sexta 13/11/2026'
  await campoNovaSubetapa.fill(textoSubetapa)

  // Conferir que nenhum overlay de arrasto está ativo (DragOverlay rotacionado)
  await expect(page.locator('.rotate-1.shadow-lg')).toHaveCount(0)

  // Apertar Enter para criar a primeira subetapa
  await campoNovaSubetapa.press('Enter')
  await expect(cartaoCompra.getByText(textoSubetapa)).toBeVisible()

  // Digitar segunda subetapa
  await campoNovaSubetapa.fill('Comprar alho e azeite')
  await campoNovaSubetapa.press('Enter')
  await expect(cartaoCompra.getByText('Comprar alho e azeite')).toBeVisible()

  // Pressionar Esc no campo vazio para sair (fecha o campo)
  await campoNovaSubetapa.press('Escape')

  // Contador no cartão deve mostrar "0/2"
  await expect(cartaoCompra.getByText('0/2')).toBeVisible()

  // Reabrir o painel clicando no botão "0/2" para ver as subetapas
  await cartaoCompra.getByRole('button', { name: /Subetapas de Fazer compras/ }).click()

  // As subetapas continuam visíveis dentro do painel
  await expect(cartaoCompra.getByText(textoSubetapa)).toBeVisible()
  await expect(cartaoCompra.getByText('Comprar alho e azeite')).toBeVisible()

  // Clicar/selecionar texto dentro de uma subetapa não inicia arrasto
  await cartaoCompra.getByText('Comprar alho e azeite').click({ clickCount: 2 })
  await expect(page.locator('.rotate-1.shadow-lg')).toHaveCount(0)
})

test('Lista: Adicionar item aparece antes do primeiro item e criar tarefa não a coloca no topo', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje })
      await grupos.criarItem(casa.id, 'Item 1 Existente')
      await grupos.criarItem(casa.id, 'Item 2 Existente')
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Lista' })
    .click()

  const cardGrupo = page.getByRole('region', { name: 'Grupo Casa' })
  await expect(cardGrupo).toBeVisible()

  // Grupo começa recolhido: abrir o grupo
  await cardGrupo.getByRole('button', { name: 'Abrir Casa' }).click()

  // O campo 'Adicionar item' está antes do 'Item 1 Existente'
  const campoAdicionar = cardGrupo.getByRole('textbox', { name: 'Adicionar item em Casa' })
  const textoItem1 = cardGrupo.getByText('Item 1 Existente')
  await expect(campoAdicionar).toBeVisible()
  await expect(textoItem1).toBeVisible()

  const boxCampo = await campoAdicionar.boundingBox()
  const boxItem1 = await textoItem1.boundingBox()
  expect(boxCampo).not.toBeNull()
  expect(boxItem1).not.toBeNull()
  if (boxCampo && boxItem1) {
    expect(boxCampo.y).toBeLessThan(boxItem1.y)
  }

  // Criar uma nova tarefa no grupo
  await campoAdicionar.fill('Item 3 Novo')
  await campoAdicionar.press('Enter')

  const textoItem3 = cardGrupo.getByText('Item 3 Novo')
  await expect(textoItem3).toBeVisible()

  // Conferir que o novo item NÃO foi para o topo (está depois do Item 1 e do Item 2)
  const boxItem2 = await cardGrupo.getByText('Item 2 Existente').boundingBox()
  const boxItem3 = await textoItem3.boundingBox()
  expect(boxItem2).not.toBeNull()
  expect(boxItem3).not.toBeNull()
  if (boxItem2 && boxItem3) {
    expect(boxItem3.y).toBeGreaterThan(boxItem2.y)
  }

  // Capturas
  await page.screenshot({ path: 'e2e/capturas/dia-lista-grupo-aberto.png' })
  await cardGrupo.getByRole('button', { name: 'Recolher Casa' }).click()
  await page.screenshot({ path: 'e2e/capturas/dia-lista-grupo-recolhido.png' })
})

test('Cartões: Novo item é o primeiro cartão e criar item funciona igual a antes', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje })
      await grupos.criarItem(casa.id, 'Primeira Tarefa')
      await grupos.criarItem(casa.id, 'Segunda Tarefa')
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  const cardGrupo = page.getByRole('article', { name: 'Grupo Casa' })
  await expect(cardGrupo).toBeVisible()

  // Abrir o grupo
  await cardGrupo.getByRole('button', { name: 'Abrir Casa' }).click()

  const botaoNovoItem = cardGrupo.getByRole('button', { name: 'Adicionar item em Casa' })
  const textoPrimeira = cardGrupo.getByText('Primeira Tarefa')
  await expect(botaoNovoItem).toBeVisible()
  await expect(textoPrimeira).toBeVisible()

  // 'Novo item' é o primeiro cartão na grade (y menor ou igual e x menor)
  const boxNovo = await botaoNovoItem.boundingBox()
  const boxPrimeira = await textoPrimeira.boundingBox()
  expect(boxNovo).not.toBeNull()
  expect(boxPrimeira).not.toBeNull()
  if (boxNovo && boxPrimeira) {
    expect(boxNovo.x).toBeLessThan(boxPrimeira.x)
  }

  // Clicar e criar um novo item
  await botaoNovoItem.click()
  const inputNovo = cardGrupo.getByRole('textbox', { name: 'Adicionar item em Casa' })
  await expect(inputNovo).toBeFocused()
  await inputNovo.fill('Terceira Tarefa')
  await inputNovo.press('Enter')

  await expect(cardGrupo.getByText('Terceira Tarefa')).toBeVisible()
})

test('Cartões: cabeçalho recolhe e expande, progresso continua visível e Enter/Espaço funcionam', async ({
  page,
}) => {
  await page.evaluate(
    async ({ hoje }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const grupos = (await importar('/src/db/repositories/group-repository.ts')) as ModuloGrupos
      const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje })
      await grupos.criarItem(casa.id, 'Item A')
      await grupos.criarItem(casa.id, 'Item B')
    },
    { hoje: HOJE },
  )

  await page.goto(`/dia/${HOJE}`)
  await page
    .getByRole('group', { name: 'Visualização do dia' })
    .getByRole('button', { name: 'Cartões' })
    .click()

  const cardGrupo = page.getByRole('article', { name: 'Grupo Casa' })
  await expect(cardGrupo).toBeVisible()

  const botaoAlternar = cardGrupo.getByRole('button', { name: 'Abrir Casa' })
  await expect(botaoAlternar).toHaveAttribute('aria-expanded', 'false')
  // aria-controls presente
  const idControle = await botaoAlternar.getAttribute('aria-controls')
  expect(idControle).toBeTruthy()

  // Progresso visível recolhido
  await expect(cardGrupo.getByText('0/2')).toBeVisible()
  // Grade de cartões escondida
  await expect(cardGrupo.getByText('Item A')).toBeHidden()

  // Captura Cartões recolhido
  await page.screenshot({ path: 'e2e/capturas/dia-cartoes-grupo-recolhido.png' })

  // Clicar no cabeçalho expande
  await botaoAlternar.click()
  await expect(cardGrupo.getByRole('button', { name: 'Recolher Casa' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(cardGrupo.getByText('Item A')).toBeVisible()

  // Captura Cartões aberto
  await page.screenshot({ path: 'e2e/capturas/dia-cartoes-grupo-aberto.png' })

  // Teclado: focar no botão e pressionar Enter para recolher
  const botaoRecolher = cardGrupo.getByRole('button', { name: 'Recolher Casa' })
  await botaoRecolher.focus()
  await page.keyboard.press('Enter')
  await expect(cardGrupo.getByRole('button', { name: 'Abrir Casa' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(cardGrupo.getByText('Item A')).toBeHidden()
  await expect(cardGrupo.getByText('0/2')).toBeVisible()

  // Teclado: pressionar Espaço para expandir
  await page.keyboard.press('Space')
  await expect(cardGrupo.getByRole('button', { name: 'Recolher Casa' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(cardGrupo.getByText('Item A')).toBeVisible()
})
