import { renderPage } from 'vite-plugin-ssr/server'

async function prerender() {
  const pageContext = await renderPage({ urlOriginal: '/login' })
  console.log(pageContext.html) // HTML ของ login page
}

prerender()
