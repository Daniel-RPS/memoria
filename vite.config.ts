/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  },
})
