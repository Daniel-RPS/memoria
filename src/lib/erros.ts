/** Erro com mensagem pronta para mostrar ao usuário (ex.: nome repetido). */
export class ErroDeValidacao extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeValidacao'
  }
}
