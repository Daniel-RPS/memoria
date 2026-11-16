import { describe, expect, it } from 'vitest'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  HardDriveDownload,
  ListOrdered,
  StickyNote,
  Sun,
  Tags,
} from 'lucide-react'
import { filtrarDestinos, type DestinoDaBarra } from './busca-da-barra'

const destinosTeste: DestinoDaBarra[] = [
  { nome: 'Dia', icone: Sun, para: '/dia/2026-11-15', isAtiva: false, grupo: 'Calendário' },
  { nome: 'Semana', icone: CalendarDays, para: '/semana/2026-11-15', isAtiva: false, grupo: 'Calendário' },
  { nome: 'Mês', icone: Calendar, para: '/mes/2026-11-15', isAtiva: false, grupo: 'Calendário' },
  { nome: 'Ano', icone: CalendarRange, para: '/ano/2026', isAtiva: false, grupo: 'Calendário' },
  { nome: 'Grupos', icone: FolderKanban, para: '/grupos', isAtiva: false, grupo: 'Organização' },
  { nome: 'Procedimentos', icone: ListOrdered, para: '/procedimentos', isAtiva: false, grupo: 'Organização' },
  { nome: 'Notas', icone: StickyNote, para: '/notas', isAtiva: false, grupo: 'Organização' },
  { nome: 'Categorias', icone: Tags, para: '/categorias', isAtiva: false, grupo: 'Organização' },
  { nome: 'Backup', icone: HardDriveDownload, para: '/backup', isAtiva: false, grupo: 'Ajustes' },
]

describe('filtrarDestinos', () => {
  it('"gru" → Grupos', () => {
    const res = filtrarDestinos(destinosTeste, 'gru')
    expect(res.map((d) => d.nome)).toEqual(['Grupos'])
  })

  it('"organizacao" (sem acento) → as 4 telas de Organização', () => {
    const res = filtrarDestinos(destinosTeste, 'organizacao')
    expect(res.map((d) => d.nome)).toEqual(['Grupos', 'Procedimentos', 'Notas', 'Categorias'])
  })

  it('"BACKUP" → Backup', () => {
    const res = filtrarDestinos(destinosTeste, 'BACKUP')
    expect(res.map((d) => d.nome)).toEqual(['Backup'])
  })

  it('"protocolos" → Procedimentos', () => {
    const res = filtrarDestinos(destinosTeste, 'protocolos')
    expect(res.map((d) => d.nome)).toEqual(['Procedimentos'])
  })

  it('"zzz" → nenhum', () => {
    const res = filtrarDestinos(destinosTeste, 'zzz')
    expect(res).toEqual([])
  })

  it('vazio → todos', () => {
    const res = filtrarDestinos(destinosTeste, '')
    expect(res).toEqual(destinosTeste)
  })
})
