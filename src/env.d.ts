/// <reference types="vite/client" />

// .vue 단일 파일 컴포넌트의 타입 선언 (TS가 import 시 인식하도록)
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
