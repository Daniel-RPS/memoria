import { describe, expect, it } from 'vitest'
import {
  DOCUMENTO_EXTENSOES,
  DOCUMENTO_FORMATOS_ROTULO,
  DOCUMENTO_LIMITE_FORMATADO,
  DOCUMENTO_MAX_BYTES,
  formatarTamanhoBytes,
  siglaDoDocumento,
  tratarNomeArquivo,
  validarArquivoDocumento,
} from '@/domain/attachments'

describe('Validação de anexos de documentos', () => {
  it('todas as extensões aceitas passam, inclusive em maiúsculas', () => {
    for (const ext of DOCUMENTO_EXTENSOES) {
      const res = validarArquivoDocumento({ name: `teste${ext}`, size: 1024 })
      expect(res.isValido).toBe(true)
      expect(res.extensao).toBe(ext)

      const resUpper = validarArquivoDocumento({ name: `teste${ext.toUpperCase()}`, size: 1024 })
      expect(resUpper.isValido).toBe(true)
      expect(resUpper.extensao).toBe(ext)
    }
  })

  it('extensões recusadas (.exe, .zip, .jpg, etc)', () => {
    for (const ext of ['.exe', '.zip', '.jpg', '.png', '.txt', '.mp4']) {
      const res = validarArquivoDocumento({ name: `arquivo${ext}`, size: 1024 })
      expect(res.isValido).toBe(false)
      expect(res.motivo).toBe(`Formato não aceito. Use ${DOCUMENTO_FORMATOS_ROTULO}.`)
    }
  })

  it('arquivo sem extensão é recusado', () => {
    const res = validarArquivoDocumento({ name: 'arquivoSemExtensao', size: 1024 })
    expect(res.isValido).toBe(false)
    expect(res.motivo).toBe(`Formato não aceito. Use ${DOCUMENTO_FORMATOS_ROTULO}.`)
  })

  it('arquivo vazio (0 bytes) é recusado', () => {
    const res = validarArquivoDocumento({ name: 'relatorio.pdf', size: 0 })
    expect(res.isValido).toBe(false)
    expect(res.motivo).toContain('está vazio')
  })

  it('exatamente 20 MB passa; 20 MB + 1 byte é recusado', () => {
    const exatamenteLimite = validarArquivoDocumento({
      name: 'projeto.dwg',
      size: DOCUMENTO_MAX_BYTES,
    })
    expect(exatamenteLimite.isValido).toBe(true)

    const acimaDoLimite = validarArquivoDocumento({
      name: 'projeto.dwg',
      size: DOCUMENTO_MAX_BYTES + 1,
    })
    expect(acimaDoLimite.isValido).toBe(false)
    expect(acimaDoLimite.motivo).toContain(`O limite é ${DOCUMENTO_LIMITE_FORMATADO}.`)
  })

  it('extensão dupla suspeita vale pela ÚLTIMA extensão (relatorio.pdf.exe recusado)', () => {
    const res = validarArquivoDocumento({ name: 'relatorio.pdf.exe', size: 1024 })
    expect(res.isValido).toBe(false)
    expect(res.motivo).toBe(`Formato não aceito. Use ${DOCUMENTO_FORMATOS_ROTULO}.`)
  })

  it('extensão dupla com última válida passa (relatorio.antigo.docx)', () => {
    const res = validarArquivoDocumento({ name: 'relatorio.antigo.docx', size: 1024 })
    expect(res.isValido).toBe(true)
    expect(res.extensao).toBe('.docx')
  })

  it('formatação de tamanho de bytes legível', () => {
    expect(formatarTamanhoBytes(500)).toBe('500 B')
    expect(formatarTamanhoBytes(1024)).toBe('1 KB')
    expect(formatarTamanhoBytes(1500)).toBe('1,5 KB')
    expect(formatarTamanhoBytes(1024 * 1024)).toBe('1 MB')
    expect(formatarTamanhoBytes(1.3 * 1024 * 1024)).toBe('1,3 MB')
    expect(formatarTamanhoBytes(34.2 * 1024 * 1024)).toBe('34,2 MB')
    expect(formatarTamanhoBytes(DOCUMENTO_MAX_BYTES)).toBe('20 MB')
  })

  it('mensagens de erro claras e com valores esperados', () => {
    const res = validarArquivoDocumento({
      name: 'Orçamento.dwg',
      size: Math.round(34.2 * 1024 * 1024),
    })
    expect(res.isValido).toBe(false)
    expect(res.motivo).toBe('Orçamento.dwg tem 34,2 MB. O limite é 20 MB.')
  })

  it('tratarNomeArquivo remove caracteres ilegais preservando nome seguro', () => {
    expect(tratarNomeArquivo('planta/final:v1*teste?.dwg')).toBe('planta_final_v1_teste_.dwg')
    expect(tratarNomeArquivo('documento <importante> | "novo".pdf')).toBe('documento _importante_ _ _novo_.pdf')
  })

  it('família e sigla do documento', () => {
    expect(siglaDoDocumento('teste.pdf')).toBe('PDF')
    expect(siglaDoDocumento('.PDF')).toBe('PDF')
    expect(siglaDoDocumento('planilha.xlsx')).toBe('XLS')
    expect(siglaDoDocumento('texto.doc')).toBe('DOC')
    expect(siglaDoDocumento('desenho.DWG')).toBe('DWG')
  })
})
