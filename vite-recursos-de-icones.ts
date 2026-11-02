import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Serve pelo próprio app (sem internet e fora do bundle principal):
 * - `/marcas/indice.json`: índice leve das marcas do Simple Icons (nome, slug, cor, apelidos);
 * - `/marcas/<slug>.svg`: o desenho de cada marca, baixado só quando aparece na tela;
 * - `/emojibase/pt/{data,messages}.json`: emojis em português para o seletor (frimousse).
 * No `npm run dev` responde direto do node_modules; no build, copia para o `dist/`.
 */

// Os pacotes não exportam o `package.json`: as pastas vêm do node_modules do projeto.
const NODE_MODULES = fileURLToPath(new URL('./node_modules/', import.meta.url))
const PASTA_SIMPLE_ICONS = join(NODE_MODULES, 'simple-icons')
const PASTA_EMOJIBASE = join(NODE_MODULES, 'emojibase-data')
const ARQUIVOS_EMOJI = ['data.json', 'messages.json'] as const
const SLUG_VALIDO = /^[a-z0-9]+$/

interface MarcaDoSimpleIcons {
  title: string
  slug: string
  hex: string
  aliases?: { aka?: string[] }
}

/** Uma entrada do índice: `t` nome, `s` slug, `h` cor sem #, `a` outros nomes. */
interface MarcaDoIndice {
  t: string
  s: string
  h: string
  a?: string[]
}

function montarIndice() {
  const dados = JSON.parse(
    readFileSync(join(PASTA_SIMPLE_ICONS, 'data', 'simple-icons.json'), 'utf8'),
  ) as MarcaDoSimpleIcons[]
  const indice: MarcaDoIndice[] = dados.map((marca) => ({
    t: marca.title,
    s: marca.slug,
    h: marca.hex,
    ...(marca.aliases?.aka?.length ? { a: marca.aliases.aka } : {}),
  }))
  return JSON.stringify(indice)
}

function lerEmoji(arquivo: string) {
  return readFileSync(join(PASTA_EMOJIBASE, 'pt', arquivo), 'utf8')
}

export function recursosDeIcones(): Plugin {
  return {
    name: 'memoria-recursos-de-icones',
    configureServer(servidor) {
      let indice: string | undefined
      servidor.middlewares.use((pedido, resposta, seguir) => {
        const caminho = (pedido.url ?? '').split('?')[0]
        const enviar = (conteudo: string | Buffer, tipo: string) => {
          resposta.setHeader('Content-Type', tipo)
          resposta.setHeader('Cache-Control', 'max-age=86400')
          resposta.end(conteudo)
        }
        if (caminho === '/marcas/indice.json') {
          indice ??= montarIndice()
          return enviar(indice, 'application/json')
        }
        const marca = /^\/marcas\/([^/]+)\.svg$/.exec(caminho)
        if (marca && SLUG_VALIDO.test(marca[1])) {
          try {
            return enviar(
              readFileSync(join(PASTA_SIMPLE_ICONS, 'icons', `${marca[1]}.svg`)),
              'image/svg+xml',
            )
          } catch {
            resposta.statusCode = 404
            return resposta.end()
          }
        }
        const emoji = /^\/emojibase\/pt\/(data|messages)\.json$/.exec(caminho)
        if (emoji) return enviar(lerEmoji(`${emoji[1]}.json`), 'application/json')
        seguir()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'marcas/indice.json', source: montarIndice() })
      const pastaIcones = join(PASTA_SIMPLE_ICONS, 'icons')
      for (const arquivo of readdirSync(pastaIcones)) {
        if (!arquivo.endsWith('.svg')) continue
        this.emitFile({
          type: 'asset',
          fileName: `marcas/${arquivo}`,
          source: readFileSync(join(pastaIcones, arquivo)),
        })
      }
      for (const arquivo of ARQUIVOS_EMOJI) {
        this.emitFile({
          type: 'asset',
          fileName: `emojibase/pt/${arquivo}`,
          source: lerEmoji(arquivo),
        })
      }
    },
  }
}
