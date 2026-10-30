import { describe, expect, it } from 'vitest'
import type { Procedure } from '@/db/types'
import {
  dadosDoFormulario,
  esquemaProcedimento,
  valoresDoFormulario,
} from '@/lib/esquema-procedimento'

const original: Procedure = {
  id: 'p',
  titulo: 'Backup',
  descricao: 'Mensal',
  versao: 3,
  criadoEm: '',
  atualizadoEm: '',
  camposVariaveis: [
    { id: 'c', nome: 'Senha', tipo: 'credencial', localCredencial: 'Cofre, item Backup' },
  ],
  secoes: [
    {
      id: 's',
      titulo: 'Rodar',
      passos: [{ id: 'a', texto: 'Executar', anexos: ['anexo-1'], subpassos: [] }],
    },
  ],
}

describe('esquema do formulário de procedimento', () => {
  it('ida e volta mantém o conteúdo e os anexos dos passos', () => {
    const dados = dadosDoFormulario(valoresDoFormulario(original), original)
    expect(dados.secoes[0].passos[0].anexos).toEqual(['anexo-1'])
    expect(dados.camposVariaveis[0].localCredencial).toBe('Cofre, item Backup')
    expect(dados.categoryId).toBeUndefined()
    expect(dados.secoes[0].passos[0].codigo).toBeUndefined()
  })

  it('exige título, seção com passo e texto em cada passo', () => {
    const vazio = valoresDoFormulario()
    const resultado = esquemaProcedimento.safeParse(vazio)
    expect(resultado.success).toBe(false)
    const mensagens = resultado.error!.issues.map((issue) => issue.message)
    expect(mensagens).toContain('Dê um título ao procedimento.')
    expect(mensagens).toContain('Escreva o que fazer neste passo.')
  })

  it('recusa campos com o mesmo nome (sem diferenciar acentos) e nomes com chaves', () => {
    const valores = valoresDoFormulario(original)
    valores.camposVariaveis = [
      { id: '1', nome: 'Usuário', tipo: 'texto', localCredencial: '' },
      { id: '2', nome: 'usuario', tipo: 'texto', localCredencial: '' },
      { id: '3', nome: '{{x}}', tipo: 'texto', localCredencial: '' },
    ]
    const resultado = esquemaProcedimento.safeParse(valores)
    const mensagens = resultado.error!.issues.map((issue) => issue.message)
    expect(mensagens).toContain('Já existe um campo com esse nome.')
    expect(mensagens).toContain('O nome não pode ter chaves { }.')
  })

  it('campo que não é credencial nunca guarda local de senha', () => {
    const valores = valoresDoFormulario(original)
    valores.camposVariaveis[0].tipo = 'texto'
    expect(dadosDoFormulario(valores).camposVariaveis[0].localCredencial).toBeUndefined()
  })
})
