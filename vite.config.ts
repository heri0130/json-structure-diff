/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vitest 설정을 Vite 설정에 합쳐 둔다. 별도 vitest.config 파일을 두지 않아
// 폐쇄망/공유 환경에서 설정 파일 수를 줄이고 한곳에서 관리하기 위함.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
