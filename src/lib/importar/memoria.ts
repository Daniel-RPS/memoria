import { anexoDoArquivo, type Backup } from '@/lib/backup'
import { isMesmoNome } from '@/lib/categorias'
import {
  rascunhoVazio,
  type AnexoImportado,
  type RascunhoDeImportacao,
} from '@/lib/importar/rascunho'

/**
 * Backup do MemorIA (o .json da aba Backup, já validado por `lerBackup`), escolhendo só partes:
 * tarefas, grupos, procedimentos e/ou notas, e opcionalmente só o que é de uma categoria
 * (pelo nome). Nada é substituído: o que vier entra como conteúdo novo. Arquivadas, itens
 * transferidos e cards vazios ficam de fora; notas chegam avulsas (o alvo é de outro banco).
 */

export const PARTES_DO_BACKUP = ['tarefas', 'grupos', 'procedimentos', 'notas'] as const
export type ParteDoBackup = (typeof PARTES_DO_BACKUP)[number]

export const ROTULO_DA_PARTE: Record<ParteDoBackup, string> = {
  tarefas: 'Tarefas',
  grupos: 'Grupos',
  procedimentos: 'Procedimentos',
  notas: 'Notas',
}

export interface EscolhaDoBackup {
  partes: ParteDoBackup[]
  /** Só o que tem esta categoria (nome, qualquer tipo); notas não têm categoria e saem. */
  categoria?: string
}

/** Nomes das categorias do backup (sem repetir entre os tipos), na ordem de cada tipo. */
export function categoriasDoBackup(backup: Backup) {
  const nomes: string[] = []
  for (const categoria of [...backup.tabelas.categories].sort((a, b) => a.ordem - b.ordem)) {
    if (!nomes.some((nome) => isMesmoNome(nome, categoria.nome))) nomes.push(categoria.nome)
  }
  return nomes
}

export function lerPartesDoBackup(backup: Backup, escolha: EscolhaDoBackup): RascunhoDeImportacao {
  const rascunho = rascunhoVazio()
  const { tabelas } = backup
  const nomeDaCategoria = new Map(
    tabelas.categories.map((categoria) => [categoria.id, categoria.nome]),
  )
  const categoriaDe = (id?: string) => (id ? nomeDaCategoria.get(id) : undefined)
  const isDaCategoria = (id?: string) =>
    !escolha.categoria ||
    (categoriaDe(id) !== undefined && isMesmoNome(categoriaDe(id) ?? '', escolha.categoria))
  const quer = (parte: ParteDoBackup) => escolha.partes.includes(parte)

  if (quer('tarefas')) {
    for (const tarefa of tabelas.tasks) {
      if (tarefa.status === 'arquivada' || !isDaCategoria(tarefa.categoryId)) continue
      rascunho.tarefas.push({
        chave: `backup:t:${tarefa.id}`,
        titulo: tarefa.titulo,
        data: tarefa.data,
        isConcluida: tarefa.status === 'concluida',
        subtarefas: tabelas.subtasks
          .filter((subtarefa) => subtarefa.taskId === tarefa.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((subtarefa) => ({ titulo: subtarefa.titulo, isConcluida: subtarefa.concluida })),
        categoria: categoriaDe(tarefa.categoryId),
      })
    }
  }

  if (quer('grupos')) {
    const seriePorId = new Map(tabelas.groupSeries.map((serie) => [serie.id, serie]))
    for (const card of tabelas.groupCards) {
      const serie = seriePorId.get(card.seriesId)
      if (!serie || card.arquivado || !isDaCategoria(serie.categoryId)) continue
      const itens = tabelas.groupItems
        .filter((item) => item.cardId === card.id)
        .filter((item) => item.status === 'pendente' || item.status === 'concluido')
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({ titulo: item.titulo, isConcluido: item.status === 'concluido' }))
      if (itens.length === 0) continue
      rascunho.grupos.push({
        chave: `backup:g:${card.id}`,
        titulo: serie.titulo,
        data: card.data,
        itens,
        categoria: categoriaDe(serie.categoryId),
      })
    }
  }

  if (quer('procedimentos')) {
    for (const procedimento of tabelas.procedures) {
      if (!isDaCategoria(procedimento.categoryId)) continue
      rascunho.procedimentos.push({
        chave: `backup:p:${procedimento.id}`,
        titulo: procedimento.titulo,
        etapas: [...procedimento.etapas]
          .sort((a, b) => a.ordem - b.ordem)
          .map((etapa) => etapa.texto),
        categoria: categoriaDe(procedimento.categoryId),
      })
    }
  }

  if (quer('notas') && !escolha.categoria) {
    let ligadas = 0
    for (const nota of tabelas.notes) {
      if (nota.vinculo) ligadas++
      const anexos: AnexoImportado[] = tabelas.attachments
        .filter((anexo) => anexo.dono.tipo === 'note' && anexo.dono.id === nota.id)
        .map((anexoDoBackup) => {
          const anexo = anexoDoArquivo(anexoDoBackup)
          return { nome: anexo.nome, tipo: anexo.tipo, blob: anexo.blob, url: anexo.url }
        })
      rascunho.notas.push({
        chave: `backup:n:${nota.id}`,
        titulo: nota.titulo,
        conteudo: nota.conteudo,
        editadaEm: nota.atualizadoEm,
        anexos,
      })
    }
    if (ligadas > 0) {
      rascunho.ignorados.push(
        ligadas === 1
          ? '1 nota estava ligada a algo do outro banco: chega avulsa.'
          : `${ligadas} notas estavam ligadas a algo do outro banco: chegam avulsas.`,
      )
    }
  } else if (quer('notas')) {
    rascunho.ignorados.push(
      'Notas não têm categoria própria: com uma categoria escolhida, ficam de fora.',
    )
  }
  return rascunho
}
