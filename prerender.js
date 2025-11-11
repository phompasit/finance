import { renderPage } from 'vite-plugin-ssr'

async function prerender() {
  const html = await renderPage('/login')
  console.log(html) // HTML ของ login page
}
prerender()
