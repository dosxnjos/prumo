import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // caminhos relativos no build: o app desktop (Pake) abre o dist/ via
  // file://, e caminhos absolutos ("/assets/...") resolvem contra a raiz
  // do disco nesse esquema, não contra a pasta do index.html.
  base: command === 'build' ? './' : '/',
}))
