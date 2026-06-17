<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { parseJsonInput } from './lib/parse'
import { diffJson, type DiffResult } from './lib/diff'
import { generateSpec, type SpecField } from './lib/spec'
import { diffToMarkdown, specToMarkdown } from './lib/export'
import DiffTree from './components/DiffTree.vue'

type Theme = 'light' | 'dark' | 'princess' | 'prince'
type Tab = 'diff' | 'spec'

const oldText = ref('')
const newText = ref('')
const error = ref('')
const result = ref<DiffResult | null>(null)
const specFields = ref<SpecField[]>([])
const activeTab = ref<Tab>('diff')
const selectedExample = ref<number | null>(null) // 현재 불러온 예시 칩 강조용
const copied = ref(false) // 복사 완료 피드백
const changedOnly = ref(false) // 변경된 것만 보기 토글

// 테마 — localStorage 에 저장해 새로고침 후에도 유지
const theme = ref<Theme>('light')
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('jsd-theme') : null
if (stored === 'light' || stored === 'dark' || stored === 'princess') theme.value = stored
watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  try {
    localStorage.setItem('jsd-theme', theme.value)
  } catch {
    /* 비공개 모드 등에서 저장 실패해도 무시 */
  }
})

// 공주님(하트)·왕자님(별) 모드의 떨어지는 입자 — 위치/속도/크기를 결정적 값으로 분산
const HEART_ICONS = ['💖', '💕', '💗', '💓', '🩷']
// 🌠(별똥별)는 어두운 하늘 배경이 포함돼 까만 사각형처럼 보여 제외
const STAR_ICONS = ['⭐', '✨', '🌟', '💫']
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

// 다양한 도메인의 변경 전/후 예시 — 중첩·배열·객체배열·타입변경 등 서로 다른 특성
interface Example {
  label: string
  before: string
  after: string
}
const EXAMPLES: Example[] = [
  {
    // 키 추가/삭제 + 타입 변경 (값만 다른 name/roles 는 동일로 나옴)
    label: '👤 사용자 프로필',
    before: `{
  "user": { "name": "kim", "age": 30 },
  "roles": ["user"],
  "active": true
}`,
    after: `{
  "user": { "name": "lee", "age": "30", "grade": "A" },
  "roles": ["user", "admin"],
  "lastLogin": "2026-06-17"
}`,
  },
  {
    // 타입 변경 + 키 추가. 배열(tags) 요소 추가는 스키마 동일 → 동일로 나옴
    label: '🛒 상품',
    before: `{
  "id": 101,
  "name": "무선 이어폰",
  "price": 89000,
  "inStock": true,
  "tags": ["audio", "wireless"]
}`,
    after: `{
  "id": 101,
  "name": "무선 이어폰",
  "price": "79000",
  "inStock": true,
  "tags": ["audio", "wireless", "sale"],
  "rating": 4.5
}`,
  },
  {
    // 중첩 객체 키 추가 + 타입 변경
    label: '⚙️ 설정',
    before: `{
  "theme": "light",
  "notifications": { "email": true, "push": false },
  "maxItems": 20
}`,
    after: `{
  "theme": "dark",
  "notifications": { "email": true, "push": false, "sms": true },
  "maxItems": "20"
}`,
  },
  {
    // 타입 변경 + 키 추가 + 배열 요소 스키마에 키 추가(items[].price)
    label: '🧾 결제 내역',
    before: `{
  "orderId": "A-1001",
  "status": 0,
  "amount": 50000,
  "items": [
    { "name": "도서", "qty": 1 }
  ]
}`,
    after: `{
  "orderId": "A-1001",
  "status": "paid",
  "amount": 50000,
  "paidAt": "2026-06-17",
  "items": [
    { "name": "도서", "qty": 1, "price": 15000 },
    { "name": "배송비", "qty": 1, "price": 3000 }
  ]
}`,
  },
  {
    // 타입 변경 집중: number↔string, string↔boolean, null→object, number[]→string[]
    label: '🔀 타입 변경',
    before: `{
  "code": 200,
  "success": "true",
  "data": null,
  "scores": [10, 20]
}`,
    after: `{
  "code": "200",
  "success": true,
  "data": { "value": 1 },
  "scores": ["10", "20"]
}`,
  },
]

const totalChanges = computed(() => {
  if (!result.value) return 0
  const s = result.value.summary
  return s.added + s.removed + s.changed
})

function compare() {
  error.value = ''
  result.value = null
  specFields.value = []

  const oldParsed = parseJsonInput(oldText.value, '변경 전')
  if (!oldParsed.ok) {
    error.value = oldParsed.message
    return
  }
  const newParsed = parseJsonInput(newText.value, '변경 후')
  if (!newParsed.ok) {
    error.value = newParsed.message
    return
  }
  // 비교 결과와 명세서(변경 후 기준)를 함께 만들어, 결과 영역에서 탭으로 전환해 본다.
  result.value = diffJson(oldParsed.value, newParsed.value)
  specFields.value = generateSpec(newParsed.value)
  activeTab.value = 'diff'
}

function loadSample(index: number) {
  const ex = EXAMPLES[index]
  oldText.value = ex.before
  newText.value = ex.after
  selectedExample.value = index
  error.value = ''
  result.value = null
  specFields.value = []
  activeTab.value = 'diff'
}

async function copyResult() {
  if (!result.value) return
  // 활성 탭 기준으로 마크다운을 만든다.
  const md =
    activeTab.value === 'diff'
      ? diffToMarkdown(result.value)
      : specToMarkdown(specFields.value)
  try {
    await navigator.clipboard.writeText(md)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    error.value = '클립보드 복사에 실패했어요. 브라우저 권한(보안 컨텍스트)을 확인해주세요.'
  }
}

function reset() {
  oldText.value = ''
  newText.value = ''
  selectedExample.value = null
  error.value = ''
  result.value = null
  specFields.value = []
  activeTab.value = 'diff'
}
</script>

<template>
  <div class="app">
    <!-- 공주님: 하트 비 / 왕자님: 별 비 -->
    <div
      v-if="theme === 'princess' || theme === 'prince'"
      class="sky-rain"
      :class="theme === 'prince' ? 'rain-prince' : 'rain-princess'"
      aria-hidden="true"
    >
      <span v-for="(it, i) in rainItems" :key="i" class="rain-drop" :style="it.style">{{
        it.icon
      }}</span>
    </div>

    <header class="appbar">
      <div class="appbar-inner">
        <div class="brand">
          <span class="logo" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 4H6a2 2 0 0 0-2 2v3c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v3a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v3c0 1.1.9 2 2 2-1.1 0-2 .9-2 2v3a2 2 0 0 1-2 2h-2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="brand-text">
            <h1>JSON 구조 비교기</h1>
            <p>두 JSON의 구조 변경(키 추가·삭제·타입 변경)을 한눈에</p>
          </div>
        </div>

        <div class="appbar-right">
          <span class="secure-badge" title="모든 처리는 브라우저 안에서만 이뤄집니다">
            <span class="dot"></span> 로컬 처리 · 외부 전송 없음
          </span>
          <div class="theme-switch" role="group" aria-label="테마 선택">
            <button :class="{ active: theme === 'light' }" title="라이트" @click="theme = 'light'">
              ☀️
            </button>
            <button :class="{ active: theme === 'dark' }" title="다크" @click="theme = 'dark'">
              🌙
            </button>
            <button
              :class="{ active: theme === 'princess' }"
              title="공주님"
              @click="theme = 'princess'"
            >
              👸
            </button>
            <button :class="{ active: theme === 'prince' }" title="왕자님" @click="theme = 'prince'">
              🤴
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="container">
      <div class="examples">
        <span class="ex-label">예시 불러오기</span>
        <button
          v-for="(ex, i) in EXAMPLES"
          :key="i"
          class="ex-chip"
          :class="{ active: selectedExample === i }"
          @click="loadSample(i)"
        >
          {{ ex.label }}
        </button>
      </div>

      <section class="panels">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-label">변경 전 <span class="tag old">old</span></span>
            <span class="char-count">{{ oldText.length }}자</span>
          </div>
          <textarea v-model="oldText" placeholder='{ "key": "value" }' spellcheck="false"></textarea>
        </div>
        <div class="panel">
          <div class="panel-head">
            <span class="panel-label">변경 후 <span class="tag new">new</span></span>
            <span class="char-count">{{ newText.length }}자</span>
          </div>
          <textarea v-model="newText" placeholder='{ "key": "value" }' spellcheck="false"></textarea>
        </div>
      </section>

      <div class="actions">
        <button class="btn primary" @click="compare">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          분석하기
        </button>
        <button class="btn ghost" @click="reset">초기화</button>
      </div>

      <p v-if="error" class="error" role="alert"><strong>입력 오류</strong> {{ error }}</p>

      <!-- 결과: 차이 비교 / 명세서 탭 전환 -->
      <section v-if="result" class="result">
        <div class="tabs" role="tablist">
          <button
            class="tab"
            role="tab"
            :class="{ active: activeTab === 'diff' }"
            @click="activeTab = 'diff'"
          >
            변경 사항
          </button>
          <button
            class="tab"
            role="tab"
            :class="{ active: activeTab === 'spec' }"
            @click="activeTab = 'spec'"
          >
            명세서
          </button>
          <span class="tab-meta">
            <template v-if="activeTab === 'diff'">
              <span class="chip added">추가 {{ result.summary.added }}</span>
              <span class="chip removed">삭제 {{ result.summary.removed }}</span>
              <span class="chip changed">변경 {{ result.summary.changed }}</span>
            </template>
            <template v-else>필드 {{ specFields.length }}개 · 변경 후 기준</template>
          </span>
          <button
            class="copy-btn"
            :class="{ done: copied }"
            :title="activeTab === 'diff' ? '변경 사항을 마크다운으로 복사' : '명세서를 마크다운으로 복사'"
            @click="copyResult"
          >
            {{ copied ? '✓ 복사됨' : '⧉ 클립보드 복사' }}
          </button>
        </div>

        <!-- 차이 비교 -->
        <div v-show="activeTab === 'diff'" class="tab-panel">
          <p v-if="totalChanges === 0" class="no-diff">두 JSON이 동일합니다. 차이가 없어요.</p>
          <template v-else>
            <label class="filter-toggle" :class="{ active: changedOnly }">
              <input type="checkbox" v-model="changedOnly" />
              <span class="switch"><span class="knob"></span></span>
              <span class="filter-label">변경된 것만 보기</span>
            </label>
            <ul class="tree">
              <DiffTree :node="result.root" :changed-only="changedOnly" />
            </ul>
          </template>
        </div>

        <!-- 명세서 -->
        <div v-show="activeTab === 'spec'" class="tab-panel">
          <p v-if="specFields.length === 0" class="no-diff">표시할 필드가 없습니다.</p>
          <div v-else class="spec-wrap">
            <table class="spec">
              <thead>
                <tr>
                  <th>필드</th>
                  <th>타입</th>
                  <th>예시값</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in specFields" :key="f.path" :class="{ 'is-child': f.depth > 0 }">
                  <td class="spec-path">
                    <span
                      class="indent"
                      :style="{ width: f.depth * 18 + 'px' }"
                      aria-hidden="true"
                    ></span>
                    <span v-if="f.depth > 0" class="branch" aria-hidden="true">└</span>
                    <span class="field-name">{{ f.name }}</span>
                  </td>
                  <td><span class="type-chip">{{ f.type }}</span></td>
                  <td class="spec-ex">{{ f.example || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 빈 상태 -->
      <section v-else-if="!error" class="empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 3H5a2 2 0 0 0-2 2v4m0 6v4a2 2 0 0 0 2 2h4m6 0h4a2 2 0 0 0 2-2v-4m0-6V5a2 2 0 0 0-2-2h-4"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <p class="empty-title">아직 결과가 없어요</p>
        <p class="empty-sub">
          두 JSON을 넣고 <b>분석하기</b>를 누르면 변경 사항과 명세서를 함께 볼 수 있어요.
          <br />처음이라면 <b>예시 넣기</b>로 시작하면 쉬워요.
        </p>
      </section>
    </main>

    <footer class="foot">
      JSON Structure Diff · Vue 3 + TypeScript · 입력 데이터는 저장·전송되지 않습니다
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── 공주님(하트)·왕자님(별) 모드: 떨어지는 입자 ── */
.sky-rain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 55;
}
.rain-drop {
  position: absolute;
  top: -32px;
  will-change: transform, opacity;
  animation-name: sky-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.rain-princess .rain-drop {
  filter: drop-shadow(0 1px 1px rgba(219, 39, 119, 0.35));
}
.rain-prince .rain-drop {
  filter: drop-shadow(0 1px 2px rgba(37, 99, 235, 0.45));
}
@keyframes sky-fall {
  0% {
    transform: translateY(-32px) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(48vh) translateX(14px) rotate(20deg);
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(104vh) translateX(-6px) rotate(-12deg);
    opacity: 0;
  }
}
/* 접근성: 모션 최소화 설정 시 입자 비 끄기 */
@media (prefers-reduced-motion: reduce) {
  .rain-drop {
    animation: none;
    display: none;
  }
}

/* ── 상단 앱바 ── */
.appbar {
  background: var(--appbar-bg);
  color: #fff;
  box-shadow: var(--shadow);
}
.appbar-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
.brand-text h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #fff;
}
.brand-text p {
  margin: 1px 0 0;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.82);
}
.appbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.secure-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  white-space: nowrap;
}
.secure-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
}
.theme-switch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.theme-switch button {
  border: 0;
  background: transparent;
  width: 30px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  line-height: 1;
  transition: background 0.15s ease, transform 0.1s ease;
}
.theme-switch button:hover {
  transform: scale(1.12);
}
.theme-switch button.active {
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-sm);
}

/* ── 본문 ── */
.container {
  flex: 1;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}
.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}
.panel-label {
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tag.old {
  color: var(--removed);
  background: var(--removed-bg);
}
.tag.new {
  color: var(--added);
  background: var(--added-bg);
}
.char-count {
  font-size: 11.5px;
  color: var(--text-subtle);
  font-variant-numeric: tabular-nums;
}
textarea {
  border: 0;
  outline: 0;
  width: 100%;
  height: 230px;
  resize: vertical;
  padding: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  background: var(--surface);
}
textarea::placeholder {
  color: var(--text-subtle);
}
.panel:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
}

/* ── 액션 ── */
.actions {
  display: flex;
  gap: 10px;
  margin: 18px 0;
  flex-wrap: wrap;
}
.examples {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.ex-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-subtle);
  margin-right: 2px;
}
.ex-chip {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-muted);
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  transition: border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
}
.ex-chip:hover {
  border-color: var(--brand);
  color: var(--brand);
  box-shadow: var(--shadow-sm);
}
.ex-chip.active {
  border-color: transparent;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.ex-chip.active:hover {
  color: #fff;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.05s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.btn:hover {
  box-shadow: var(--shadow-sm);
}
.btn:active {
  transform: translateY(1px);
}
.btn.primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.32);
}
.btn.ghost {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-muted);
}
.btn.ghost:hover {
  background: var(--surface);
  color: var(--text);
}

/* ── 오류 ── */
.error {
  display: flex;
  gap: 8px;
  align-items: baseline;
  color: var(--removed);
  background: var(--removed-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
}
.error strong {
  flex-shrink: 0;
}

/* ── 결과 / 명세서 공통 카드 ── */
.result {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.tab {
  position: relative;
  border: 0;
  background: transparent;
  padding: 14px 16px;
  margin-bottom: -1px;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.12s ease, border-color 0.12s ease;
}
.tab:hover {
  color: var(--text);
  border-bottom-color: var(--border-strong);
}
.tab.active {
  color: var(--brand);
  border-bottom-color: var(--brand);
}
.tab-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.copy-btn {
  align-self: center;
  margin-left: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: border-color 0.12s ease, color 0.12s ease, background 0.12s ease;
}
.copy-btn:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.copy-btn.done {
  border-color: var(--added);
  color: var(--added);
  background: var(--added-bg);
}
.chip {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.chip.added {
  color: var(--added);
  background: var(--added-bg);
}
.chip.removed {
  color: var(--removed);
  background: var(--removed-bg);
}
.chip.changed {
  color: var(--changed);
  background: var(--changed-bg);
}
.no-diff {
  margin: 0;
  padding: 28px 18px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}
.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 12px 18px 0;
  padding: 6px 12px 6px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.filter-toggle:hover {
  border-color: var(--border-strong);
}
.filter-toggle.active {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--surface);
}
/* 화면에서 숨기되 접근성 유지 */
.filter-toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.switch {
  position: relative;
  flex: none;
  width: 34px;
  height: 19px;
  border-radius: 999px;
  background: var(--border-strong);
  transition: background 0.18s ease;
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  transition: transform 0.18s ease;
}
.filter-toggle.active .switch {
  background: var(--brand);
}
.filter-toggle.active .knob {
  transform: translateX(15px);
}
.tree {
  margin: 0;
  padding: 10px 18px 16px;
  list-style: none;
}

/* ── 명세서 표 ── */
.spec-wrap {
  overflow-x: auto;
}
.spec {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.spec th {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  white-space: nowrap;
}
.spec td {
  padding: 9px 18px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
.spec tbody tr:last-child td {
  border-bottom: 0;
}
.spec tbody tr:hover {
  background: var(--surface-2);
}
.spec-path {
  font-family: var(--mono);
  white-space: nowrap;
}
.spec-path .indent {
  display: inline-block;
  flex: none;
}
.spec-path .branch {
  color: var(--text-subtle);
  margin-right: 5px;
}
.spec-path .field-name {
  font-weight: 600;
  color: var(--text);
}
/* 하위 필드(자식)는 이름을 살짝 옅게 해 부모와 위계 구분 */
.is-child .field-name {
  font-weight: 500;
  color: var(--text-muted);
}
.spec-ex {
  font-family: var(--mono);
  color: var(--text-muted);
}
.type-chip {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--brand);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 7px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* ── 빈 상태 ── */
.empty {
  text-align: center;
  padding: 56px 24px;
  color: var(--text-subtle);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
}
.empty svg {
  color: var(--border-strong);
}
.empty-title {
  margin: 14px 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-muted);
}
.empty-sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}
.empty-sub b {
  color: var(--text-muted);
}

/* ── 푸터 ── */
.foot {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: var(--text-subtle);
  border-top: 1px solid var(--border);
}

/* ── 반응형 ── */
@media (max-width: 760px) {
  .panels {
    grid-template-columns: 1fr;
  }
  .appbar-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .appbar-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
