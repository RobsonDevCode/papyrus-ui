import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
  },
})
