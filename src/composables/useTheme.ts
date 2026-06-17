import { ref, computed, watchEffect } from 'vue'

export type Theme = 'light' | 'dark' | 'princess' | 'prince'

const STORAGE_KEY = 'jsd-theme'
const HEART_ICONS = ['💖', '💕', '💗', '💓', '🩷']
const STAR_ICONS = ['⭐', '✨', '🌟', '💫']

// 모듈 레벨 싱글톤 — 앱 어디서 useTheme()를 호출해도 같은 테마 상태를 공유한다.
const theme = ref<Theme>('light')

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
if (saved === 'light' || saved === 'dark' || saved === 'princess' || saved === 'prince') {
  theme.value = saved
}

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch {
    /* 비공개 모드 등 저장 실패는 무시 */
  }
})

// 공주님(하트)·왕자님(별) 모드에서 떨어지는 입자 — 위치/속도/크기를 결정적 값으로 분산
const rainItems = computed(() => {
  const icons = theme.value === 'prince' ? STAR_ICONS : HEART_ICONS
  return Array.from({ length: 18 }, (_, i) => ({
    icon: icons[i % icons.length],
    style: {
      left: `${(i * 5.5 + (i % 4) * 6) % 100}%`,
      animationDuration: `${5 + (i % 5)}s`,
      animationDelay: `${(i % 9) * 0.7}s`,
      fontSize: `${12 + (i % 5) * 3}px`,
    },
  }))
})

const showRain = computed(() => theme.value === 'princess' || theme.value === 'prince')

export function useTheme() {
  return { theme, rainItems, showRain }
}
