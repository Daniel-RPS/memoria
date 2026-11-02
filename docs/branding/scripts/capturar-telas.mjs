#!/usr/bin/env node
/**
 * Sobe o Vite numa porta própria (5191: outra origem, os dados do usuário não são tocados),
 * semeia algumas tarefas e grupos, e tira capturas do Início e da Semana nos temas claro e
 * escuro (1680×1000, data fixa 02/11/2026) em docs/branding/capturas/. Também captura a
 * paleta.html nos dois temas para comparar. A medição por área é feita por medir-area.py.
 *
 * Uso (na raiz do projeto): node docs/branding/scripts/capturar-telas.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const PORTA = 5191
const URL_BASE = `http://localhost:${PORTA}`
const HOJE = '2026-11-02'
const PASTA = 'docs/branding/capturas'
mkdirSync(PASTA, { recursive: true })

const vite = spawn(`npx vite --port ${PORTA} --strictPort`, { shell: true, stdio: 'ignore' })

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      if ((await fetch(URL_BASE)).ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((pronto) => setTimeout(pronto, 500))
  }
  throw new Error('Vite não subiu')
}

async function semear(page) {
  await page.evaluate(async (hoje) => {
    const importar = (caminho) => import(/* @vite-ignore */ caminho)
    const grupos = await importar('/src/db/repositories/group-repository.ts')
    const tarefas = await importar('/src/db/repositories/task-repository.ts')
    const categorias = await importar('/src/db/repositories/category-repository.ts')
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#2f8a57' })
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho', cor: '#3366c2' })
    const somar = (dias) => {
      const [a, m, d] = hoje.split('-').map(Number)
      const data = new Date(a, m - 1, d + dias)
      return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    }
    const card = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: casa.id })
    const varrer = await grupos.criarItem(card.id, 'Varrer')
    await grupos.criarItem(card.id, 'Lavar a louça')
    await grupos.criarItem(card.id, 'Regar as plantas')
    await grupos.definirConclusaoItem(varrer.id, true)
    const reuniao = await grupos.criarGrupo({
      titulo: 'Projeto',
      data: somar(1),
      categoryId: trabalho.id,
    })
    await grupos.criarItem(reuniao.id, 'Revisar proposta')
    await grupos.criarItem(reuniao.id, 'Enviar relatório')
    await tarefas.criarTarefa({ titulo: 'Pagar a conta de luz', data: hoje })
    await tarefas.criarTarefa({ titulo: 'Ligar para o dentista', data: somar(2) })
    await tarefas.criarTarefa({ titulo: 'Renovar CNH', data: somar(-3) })
  }, HOJE)
}

try {
  await esperarServidor()
  const navegador = await chromium.launch()
  for (const tema of ['claro', 'escuro']) {
    const contexto = await navegador.newContext({
      viewport: { width: 1680, height: 1000 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    await contexto.addInitScript((escolha) => localStorage.setItem('memoria:tema', escolha), tema)
    const page = await contexto.newPage()
    await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
    await page.goto(`${URL_BASE}/inicio`)
    await page.waitForSelector('[data-logo]', { state: 'attached' })
    await semear(page)
    await page.goto(`${URL_BASE}/inicio`)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${PASTA}/app-inicio-${tema}.png` })
    await page.goto(`${URL_BASE}/semana/${HOJE}`)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${PASTA}/app-semana-${tema}.png` })

    // Para medir a área: fundo "liso" (sem as manchas da Aurora tingindo a névoa).
    await page.evaluate(() => localStorage.setItem('memoria:fundo', 'liso'))
    for (const [tela, caminho] of [
      ['inicio', '/inicio'],
      ['semana', `/semana/${HOJE}`],
    ]) {
      await page.goto(`${URL_BASE}${caminho}`)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${PASTA}/medir-${tela}-${tema}.png` })
    }

    if (existsSync('docs/branding/paleta.html')) {
      const paleta = await contexto.newPage()
      await paleta.goto(`${pathToFileURL(resolve('docs/branding/paleta.html')).href}?tema=${tema}`)
      await paleta.waitForTimeout(600)
      await paleta.screenshot({ path: `${PASTA}/paleta-${tema}.png`, fullPage: true })
    }
    await contexto.close()
  }
  await navegador.close()
  console.log(`Capturas em ${PASTA}/`)
} finally {
  vite.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'])
}
