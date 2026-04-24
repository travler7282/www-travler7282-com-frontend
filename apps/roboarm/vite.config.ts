import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/roboarm/', // Crucial for deployment to a subdirectory
  plugins: [react()],
})
