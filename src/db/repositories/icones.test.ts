import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  criarCategoria,
  definirIconeDaCategoria,
  listarCategorias,
} from '@/db/repositories/category-repository'
import {
  criarProcedimento,
  obterProcedimento,
  salvarProcedimento,
} from '@/db/repositories/procedure-repository'
import { FORMATO_ATUAL, lerBackup } from '@/lib/backup'
import { buscarProcedimentos } from '@/lib/procedimentos'

const semEtapas = { categoryId: '', etapas: [] }

describe('ícone de procedimento e categoria', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('procedimento: cria com marca, troca por emoji e remove', async () => {
    const criado = await criarProcedimento({
      titulo: 'Github',
      icone: { tipo: 'marca', valor: 'github' },
      ...semEtapas,
    })
    expect((await obterProcedimento(criado.id))?.icone).toEqual({ tipo: 'marca', valor: 'github' })

    await salvarProcedimento(criado.id, {
      titulo: 'Github',
      icone: { tipo: 'emoji', valor: '🐙' },
      ...semEtapas,
    })
    expect((await obterProcedimento(criado.id))?.icone).toEqual({ tipo: 'emoji', valor: '🐙' })

    await salvarProcedimento(criado.id, { titulo: 'Github', ...semEtapas })
    expect(await obterProcedimento(criado.id)).not.toHaveProperty('icone')
  })

  it('procedimento sem ícone nasce sem o campo', async () => {
    const criado = await criarProcedimento({ titulo: 'Backup', ...semEtapas })
    expect(await obterProcedimento(criado.id)).not.toHaveProperty('icone')
  })

  it('categoria: define emoji, troca por marca, remove; ícone inválido é recusado', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    await definirIconeDaCategoria(casa.id, { tipo: 'emoji', valor: '🏠' })
    expect((await listarCategorias())[0].icone).toEqual({ tipo: 'emoji', valor: '🏠' })

    await definirIconeDaCategoria(casa.id, { tipo: 'marca', valor: 'github' })
    expect((await listarCategorias())[0].icone).toEqual({ tipo: 'marca', valor: 'github' })

    await expect(
      definirIconeDaCategoria(casa.id, { tipo: 'emoji', valor: 'casa' }),
    ).rejects.toThrow('Ícone inválido.')

    await definirIconeDaCategoria(casa.id, undefined)
    expect((await listarCategorias())[0]).not.toHaveProperty('icone')
  })

  it('busca de procedimentos acha pelo slug da marca do ícone', async () => {
    const github = await criarProcedimento({
      titulo: 'Publicar',
      icone: { tipo: 'marca', valor: 'github' },
      ...semEtapas,
    })
    await criarProcedimento({ titulo: 'Outro', ...semEtapas })
    const todos = await db.procedures.toArray()
    expect(buscarProcedimentos(todos, 'GitHub').map((item) => item.id)).toEqual([github.id])
  })

  it('backup leva e traz o ícone (formato atual)', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    await definirIconeDaCategoria(casa.id, { tipo: 'emoji', valor: '🏠' })
    await criarProcedimento({
      titulo: 'Github',
      icone: { tipo: 'marca', valor: 'github' },
      ...semEtapas,
    })
    await criarProcedimento({
      titulo: 'Loja',
      icone: { tipo: 'generico', valor: 'pacote' },
      ...semEtapas,
    })
    await criarProcedimento({
      titulo: 'App',
      icone: { tipo: 'marca', valor: 'memoria' },
      ...semEtapas,
    })

    const exportado = await exportarDados()
    expect(exportado.formato).toBe(FORMATO_ATUAL)
    const lido = lerBackup(JSON.stringify(exportado), versaoDoBanco())
    if (!lido.isValido) throw new Error(lido.mensagem)
    await importarDados(lido.backup)

    expect((await listarCategorias())[0].icone).toEqual({ tipo: 'emoji', valor: '🏠' })
    const icones = new Map((await db.procedures.toArray()).map((item) => [item.titulo, item.icone]))
    expect(icones.get('Github')).toEqual({ tipo: 'marca', valor: 'github' })
    expect(icones.get('Loja')).toEqual({ tipo: 'generico', valor: 'pacote' })
    expect(icones.get('App')).toEqual({ tipo: 'marca', valor: 'memoria' })
  })

  it('backup antigo (sem ícone) importa sem ícone; ícone quebrado é ignorado', async () => {
    await criarCategoria({ nome: 'Casa' })
    await criarProcedimento({ titulo: 'Github', ...semEtapas })
    const exportado = await exportarDados()
    const antigo = { ...exportado, formato: 7 }
    // Um ícone que não passa na validação (ex.: editado à mão) não impede a importação.
    antigo.tabelas.procedures[0] = {
      ...antigo.tabelas.procedures[0],
      icone: { tipo: 'marca', valor: 'Não É Slug' },
    }

    const lido = lerBackup(JSON.stringify(antigo), versaoDoBanco())
    if (!lido.isValido) throw new Error(lido.mensagem)
    await importarDados(lido.backup)

    expect((await listarCategorias())[0].icone).toBeUndefined()
    expect((await db.procedures.toArray())[0].icone).toBeUndefined()
  })
})
