import { defineConfig, devices } from '@playwright/test'

/** Porta própria: outra origem, então os testes nunca tocam nos dados do app (5173). */
const PORTA = 5190

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/resultados',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    timezoneId: 'America/Sao_Paulo',
    locale: 'pt-BR',
    // Largura em que a semana mostra as 7 colunas lado a lado.
    viewport: { width: 1680, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1680, height: 1000 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
  },
})
