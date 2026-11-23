import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build landet direkt in ../static, damit das FastAPI-Backend es ohne Node
// im LXC ausliefern kann. base '/' weil die App unter http://<ip>:<port>/ läuft.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../static',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
})