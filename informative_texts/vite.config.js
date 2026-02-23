import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function subcategoryManifestPlugin() {
  const virtualId = 'virtual:subcategory-files'
  const resolvedId = '\0' + virtualId
  return {
    name: 'subcategory-manifest',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        const dir = resolve(__dirname, 'public/subcategories')
        const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
        return `export const files = ${JSON.stringify(files)}`
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), subcategoryManifestPlugin()],
})
