/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { recursosDeIcones } from './vite-recursos-de-icones.ts'

/** Subcaminho do site no GitHub Pages (https://daniel-rps.github.io/memoria/). */
const BASE_DO_SITE = '/memoria/'

/**
 * O GitHub Pages não conhece as rotas do React Router: recarregar `/memoria/dia/...` cairia
 * num 404. Com um `404.html` igual ao `index.html`, o app abre e o roteador acha a tela.
 */
function paginaDe404(): Plugin {
  return {
    name: 'memoria-pagina-404',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opcoes, pacote) {
      const indice = pacote['index.html']
      if (indice?.type !== 'asset') return
      this.emitFile({ type: 'asset', fileName: '404.html', source: indice.source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Build e `npm run preview` usam o subcaminho; o dev continua na raiz de http://localhost:5173.
  base: command === 'build' || isPreview ? BASE_DO_SITE : '/',
  plugins: [react(), tailwindcss(), recursosDeIcones(), paginaDe404()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Os dados ficam presos ao endereço (origem) do app. Porta fixa: se estiver ocupada,
    // o Vite avisa em vez de abrir em outra porta, onde o app pareceria vazio.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    // e2e/ é do Playwright (`npm run e2e`).
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: { TZ: 'America/Sao_Paulo' },
    // Telas inteiras com digitação passam de 5 s quando a suíte roda em paralelo.
    testTimeout: 15_000,
    // Cada arquivo de tela sobe um jsdom inteiro: com um worker por núcleo eles disputam a CPU
    // e esperas que levam 1 s viram 5 s. Metade dos núcleos deixa a suíte estável.
    maxWorkers: '50%',
  },
}))
