import { renderPage } from 'vite-plugin-ssr'
import fs from 'fs'

const pages = ['/login', '/dashboard']

async function prerenderAll() {
  for (const page of pages) {
    const html = await renderPage(page)
    fs.writeFileSync(`dist${page}.html`, html)
    console.log(`Prerendered ${page}`)
  }
}

prerenderAll()
