import type { Page } from '@playwright/test'

/**
 * Dados das abas Notas, Procedimentos e Categorias para os testes de recolher, filtrar por dia e
 * ícones. Hoje = 02/11/2026 (segunda). Notas editadas hoje, ontem, há 3 dias e em 30/10/2025;
 * procedimentos criados hoje, ontem, em 20/10 e em 15/09.
 */

export const HOJE = '2026-11-02'
export const AGORA = new Date('2026-11-02T10:00:00-03:00')

export interface Semeado {
  casa: { categoriaId: string; seriesId: string }
  github: { categoriaId: string; procedimentoId: string }
}

interface Modulos {
  categorias: {
    criarCategoria: (dados: {
      nome: string
      cor?: string
      tipo?: 'grupo' | 'procedimento'
    }) => Promise<{ id: string }>
  }
  grupos: {
    criarGrupo: (dados: {
      titulo: string
      data: string
      categoryId?: string
    }) => Promise<{ id: string; seriesId: string }>
    criarItem: (cardId: string, titulo: string) => Promise<{ id: string; cadeiaId: string }>
  }
  tarefas: {
    criarTarefa: (dados: {
      titulo: string
      data: string
      categoryId?: string
    }) => Promise<{ id: string }>
  }
  notas: {
    criarNota: (dados: {
      titulo?: string
      conteudo?: string
      vinculo?: { tipo: 'tarefa' | 'grupo' | 'item'; id: string }
    }) => Promise<{ id: string }>
  }
  procedimentos: {
    criarProcedimento: (dados: {
      titulo: string
      categoryId?: string
      etapas: { id: string; texto: string; ordem: number }[]
    }) => Promise<{ id: string }>
  }
  banco: {
    db: {
      notes: { update: (id: string, mudancas: Record<string, string>) => Promise<number> }
      procedures: { update: (id: string, mudancas: Record<string, string>) => Promise<number> }
    }
  }
}

export async function semearAjustes(page: Page): Promise<Semeado> {
  return page.evaluate(async (hoje) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
    const m = {
      categorias: await importar('/src/db/repositories/category-repository.ts'),
      grupos: await importar('/src/db/repositories/group-repository.ts'),
      tarefas: await importar('/src/db/repositories/task-repository.ts'),
      notas: await importar('/src/db/repositories/note-repository.ts'),
      procedimentos: await importar('/src/db/repositories/procedure-repository.ts'),
      banco: await importar('/src/db/database.ts'),
    } as Modulos

    const casa = await m.categorias.criarCategoria({ nome: 'Casa', cor: '#2f8a57' })
    const hostinger = await m.categorias.criarCategoria({ nome: 'Hostinger', cor: '#5b4fbf' })
    const catGithub = await m.categorias.criarCategoria({
      nome: 'Github',
      cor: '#3b82f6',
      tipo: 'procedimento',
    })
    const catServidor = await m.categorias.criarCategoria({
      nome: 'Servidor',
      cor: '#c2410c',
      tipo: 'procedimento',
    })

    const grupoCasa = await m.grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: casa.id })
    await m.grupos.criarItem(grupoCasa.id, 'Varrer')
    const grupoHost = await m.grupos.criarGrupo({
      titulo: 'Hostinger',
      data: hoje,
      categoryId: hostinger.id,
    })
    const deploy = await m.grupos.criarItem(grupoHost.id, 'Fazer Deploy')
    const mandar = await m.tarefas.criarTarefa({
      titulo: 'Mandar tal coisa às 09:00 para o pessoal do escritório',
      data: hoje,
      categoryId: casa.id,
    })

    const notas: [string, Parameters<Modulos['notas']['criarNota']>[0]][] = [
      [
        '2026-11-02T09:30:00-03:00',
        {
          titulo: 'Lembrete do envio',
          conteudo: 'Conferir anexos',
          vinculo: { tipo: 'tarefa', id: mandar.id },
        },
      ],
      [
        '2026-11-02T00:01:00-03:00',
        { conteudo: 'Rodar build antes', vinculo: { tipo: 'item', id: deploy.cadeiaId } },
      ],
      [
        '2026-11-01T23:59:00-03:00',
        { titulo: 'Acesso ao painel', vinculo: { tipo: 'grupo', id: grupoHost.seriesId } },
      ],
      [
        '2026-10-30T15:00:00-03:00',
        {
          conteudo: 'Ver se o aspirador carregou',
          vinculo: { tipo: 'grupo', id: grupoCasa.seriesId },
        },
      ],
      ['2026-10-30T11:00:00-03:00', { titulo: 'Ideias para o fim de semana', conteudo: 'Feira' }],
      ['2025-10-30T08:00:00-03:00', { titulo: 'Senha do roteador antigo', conteudo: 'Na caixa' }],
    ]
    for (const [momento, dados] of notas) {
      const nota = await m.notas.criarNota(dados)
      const iso = new Date(momento).toISOString()
      await m.banco.db.notes.update(nota.id, { criadoEm: iso, atualizadoEm: iso })
    }

    const etapas = (textos: string[]) =>
      textos.map((texto, ordem) => ({ id: crypto.randomUUID(), texto, ordem }))
    const procedimentos: [
      string,
      string,
      Parameters<Modulos['procedimentos']['criarProcedimento']>[0],
    ][] = [
      [
        '2026-11-02T08:00:00-03:00',
        '2026-11-02T08:00:00-03:00',
        {
          titulo: 'Github',
          categoryId: catGithub.id,
          etapas: etapas(['Abrir PR', 'Revisar', 'Mesclar']),
        },
      ],
      [
        '2026-11-01T20:00:00-03:00',
        '2026-11-02T07:00:00-03:00',
        {
          titulo: 'Publicar release',
          categoryId: catGithub.id,
          etapas: etapas(['Gerar tag', 'Escrever notas']),
        },
      ],
      [
        '2026-10-20T10:00:00-03:00',
        '2026-10-28T10:00:00-03:00',
        {
          titulo: 'Renovar SSL',
          categoryId: catServidor.id,
          etapas: etapas(['Entrar no painel', 'Gerar certificado', 'Instalar', 'Testar']),
        },
      ],
      [
        '2026-09-15T10:00:00-03:00',
        '2026-09-15T10:00:00-03:00',
        { titulo: 'Backup do banco', etapas: etapas(['Exportar', 'Guardar no disco']) },
      ],
    ]
    let idGithub = ''
    for (const [criado, editado, dados] of procedimentos) {
      const procedimento = await m.procedimentos.criarProcedimento(dados)
      if (dados.titulo === 'Github') idGithub = procedimento.id
      await m.banco.db.procedures.update(procedimento.id, {
        criadoEm: new Date(criado).toISOString(),
        atualizadoEm: new Date(editado).toISOString(),
      })
    }

    return {
      casa: { categoriaId: casa.id, seriesId: grupoCasa.seriesId },
      github: { categoriaId: catGithub.id, procedimentoId: idGithub },
    }
  }, HOJE)
}

/** Tema fixo antes de o app abrir (mesma chave do index.html). */
export async function fixarTema(page: Page, tema: 'claro' | 'escuro') {
  await page.addInitScript((escolha) => {
    try {
      localStorage.setItem('memoria:tema', escolha)
    } catch {
      // sem armazenamento
    }
  }, tema)
}
