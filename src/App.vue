<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseJsonInput } from './lib/parse'
import { diffJson, type DiffResult } from './lib/diff'
import DiffTree from './components/DiffTree.vue'

const oldText = ref('')
const newText = ref('')
const error = ref('')
const result = ref<DiffResult | null>(null)

const SAMPLE_OLD = `{
  "user": { "name": "kim", "age": 30 },
  "roles": ["user"],
  "list": [
    { "id": 1, "name": "주문" },
    { "id": 2, "name": "결제" }
  ],
  "active": true
}`
const SAMPLE_NEW = `{
  "user": { "name": "lee", "age": 30, "grade": "A" },
  "roles": ["user", "admin"],
  "list": [
    { "id": 1, "name": "주문" },
    { "id": 2, "name": "환불" },
    { "id": 3, "name": "배송" }
  ],
  "active": false
}`

// 변경 건수 합계 — 결과 헤더에서 "차이 없음" 안내를 띄울지 판단
const totalChanges = computed(() => {
  if (!result.value) return 0
  const s = result.value.summary
  return s.added + s.removed + s.changed
})

function compare() {
  error.value = ''
  result.value = null

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
  result.value = diffJson(oldParsed.value, newParsed.value)
}

function loadSample() {
  oldText.value = SAMPLE_OLD
  newText.value = SAMPLE_NEW
  error.value = ''
  result.value = null
}

function reset() {
  oldText.value = ''
  newText.value = ''
  error.value = ''
  result.value = null
}
</script>

<template>
  <div class="app">
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
            <p>두 JSON의 추가·삭제·변경을 한눈에</p>
          </div>
        </div>
        <span class="secure-badge" title="모든 처리는 브라우저 안에서만 이뤄집니다">
          <span class="dot"></span> 로컬 처리 · 외부 전송 없음
        </span>
      </div>
    </header>

    <main class="container">
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
          비교하기
        </button>
        <button class="btn ghost" @click="loadSample">예시 넣기</button>
        <button class="btn ghost" @click="reset">초기화</button>
      </div>

      <p v-if="error" class="error" role="alert">
        <strong>입력 오류</strong> {{ error }}
      </p>

      <section v-if="result" class="result">
        <div class="result-head">
          <h2>변경 요약</h2>
          <div class="summary">
            <span class="chip added">+{{ result.summary.added }} 추가</span>
            <span class="chip removed">−{{ result.summary.removed }} 삭제</span>
            <span class="chip changed">~{{ result.summary.changed }} 변경</span>
          </div>
        </div>
        <p v-if="totalChanges === 0" class="no-diff">두 JSON이 동일합니다. 차이가 없어요.</p>
        <ul v-else class="tree">
          <DiffTree :node="result.root" />
        </ul>
      </section>

      <section v-else-if="!error" class="empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 3H5a2 2 0 0 0-2 2v4m0 6v4a2 2 0 0 0 2 2h4m6 0h4a2 2 0 0 0 2-2v-4m0-6V5a2 2 0 0 0-2-2h-4"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <p class="empty-title">아직 비교 결과가 없어요</p>
        <p class="empty-sub">두 JSON을 붙여넣고 <b>비교하기</b>를 누르거나, <b>예시 넣기</b>로 시작해 보세요.</p>
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

/* ── 상단 앱바 ── */
.appbar {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
  color: #e0e7ff;
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
  background: rgba(255, 255, 255, 0.12);
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
  color: #c7d2fe;
}
.secure-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  white-space: nowrap;
}
.secure-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
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
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

/* ── 액션 ── */
.actions {
  display: flex;
  gap: 10px;
  margin: 18px 0;
  flex-wrap: wrap;
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
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.32);
}
.btn.primary:hover {
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.42);
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
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
}
.error strong {
  flex-shrink: 0;
}

/* ── 결과 ── */
.result {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-wrap: wrap;
}
.result-head h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
.summary {
  display: flex;
  gap: 8px;
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
.tree {
  margin: 0;
  padding: 12px 18px 16px;
  list-style: none;
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
@media (max-width: 720px) {
  .panels {
    grid-template-columns: 1fr;
  }
  .appbar-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
