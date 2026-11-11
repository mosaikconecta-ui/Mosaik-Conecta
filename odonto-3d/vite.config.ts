import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the heavy 3D stack in its own chunks so routes without 3D never download it.
        manualChunks(id) {
          // helpers do Vite/Rollup ficam no chunk de entrada (senão arrastam a 3D para todas as rotas)
          if (id.includes('vite/preload-helper') || id.startsWith('\0')) return 'react'
          if (!id.includes('node_modules')) return
          if (id.includes('/three/')) return 'three-core'
          if (id.includes('@react-three/postprocessing') || id.includes('/postprocessing/')) return 'three-fx'
          if (id.includes('@react-three') || id.includes('three-stdlib') || id.includes('maath') || id.includes('meshoptimizer')) return 'three-r3f'
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
        },
      },
    },
  },
})
