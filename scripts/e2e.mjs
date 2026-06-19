import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3001'
;(async () => {
  console.log('Launching browser...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', (msg) => {
    console.log('PAGE LOG>', msg.type(), msg.text())
  })
  page.on('pageerror', (err) => {
    console.error('PAGE ERROR>', err.message)
  })

  try {
    console.log('Navigating to Home')
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })

    // Click Generate Teams & Start
    const genBtn = await page.getByRole('button', { name: 'Generate Teams & Start' })
    await genBtn.click()

    // Fill team name dialog
    await page.fill('input[placeholder="My City Legends"]', 'Test City Heroes')
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Wait for draft route
    await page.waitForURL('**/draft', { timeout: 10000 })
    console.log('On Draft page')

    // Wait a bit for draft UI to render
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(process.cwd(), 'e2e-draft.png') })
    console.log('Saved e2e-draft.png')

    // Navigate to Season
    await page.goto(BASE + '/season', { waitUntil: 'domcontentloaded' })
    console.log('On Season page (navigated)')

    // Wait for Season UI (standings) — simulation may take longer, give generous timeout
    try {
      await page.waitForSelector('text=Standings', { timeout: 60000 })
    } catch (e) {
      // fallback: wait for Play Again button which appears after simulation
      await page.waitForSelector('text=Play Again', { timeout: 60000 })
    }
    await page.screenshot({ path: path.join(process.cwd(), 'e2e-season.png') })
    console.log('Saved e2e-season.png')

    console.log('E2E walkthrough completed')
  } catch (err) {
    console.error('E2E ERROR>', err)
    process.exitCode = 2
  } finally {
    await browser.close()
  }
})()
