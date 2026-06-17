<script setup lang="ts">
import { ref } from 'vue'
import { parseJsonInput } from './lib/parse'
import { diffJson, type DiffResult } from './lib/diff'
import DiffTree from './components/DiffTree.vue'

const oldText = ref('')
const newText = ref('')
const error = ref('')
const result = ref<DiffResult | null>(null)

const SAMPLE_OLD =
  '{\n  "user": { "name": "kim", "age": 30 },\n  "roles": ["user"],\n  "active": true\n}'
const SAMPLE_NEW =
  '{\n  "user": { "name": "lee", "age": 30, "grade": "A" },\n  "roles": ["user", "admin"],\n  "active": false\n}'

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
}
</script>

<template>
  <main class="page">
    <header>
      <h1>JSON 구조 비교기</h1>
      <p class="sub">
        두 JSON의 추가·삭제·변경을 찾아 보여줍니다. 입력값은 이 브라우저 안에서만 처리되며
        외부로 전송되지 않습니다.
      </p>
    </header>

    <section class="inputs">
      <div class="col">
        <label>변경 전 (old)</label>
        <textarea v-model="oldText" placeholder='{ "a": 1 }' spellcheck="false"></textarea>
      </div>
      <div class="col">
        <label>변경 후 (new)</label>
        <textarea v-model="newText" placeholder='{ "a": 2 }' spellcheck="false"></textarea>
      </div>
    </section>

    <div class="actions">
      <button class="primary" @click="compare">비교하기</button>
      <button @click="loadSample">예시 넣기</button>
    </div>

    <p v-if="error" class="error">⚠ {{ error }}</p>

    <section v-if="result" class="result">
      <div class="summary">
        <span class="s added">추가 {{ result.summary.added }}</span>
        <span class="s removed">삭제 {{ result.summary.removed }}</span>
        <span class="s changed">변경 {{ result.summary.changed }}</span>
      </div>
      <ul class="tree">
        <DiffTree :node="result.root" />
      </ul>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}
h1 {
  margin: 0 0 4px;
  font-size: 22px;
}
.sub {
  margin: 0 0 20px;
  color: #57606a;
  font-size: 13px;
}
.inputs {
  display: flex;
  gap: 12px;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
textarea {
  width: 100%;
  height: 200px;
  resize: vertical;
  padding: 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-family: 'Cascadia Code', 'D2Coding', Consolas, monospace;
  font-size: 13px;
}
.actions {
  margin: 14px 0;
  display: flex;
  gap: 8px;
}
button {
  padding: 8px 16px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
}
button.primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
  font-weight: 600;
}
.error {
  color: #cf222e;
  background: #ffebe9;
  border: 1px solid #ffcecb;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
}
.result {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 14px 16px;
}
.summary {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.s {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}
.s.added { background: #dafbe1; color: #1a7f37; }
.s.removed { background: #ffebe9; color: #cf222e; }
.s.changed { background: #fff8c5; color: #9a6700; }
.tree {
  margin: 0;
  padding-left: 0;
}
</style>
