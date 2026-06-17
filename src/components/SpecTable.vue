<script setup lang="ts">
// 필드 명세서 표 — 들여쓰기 트리 + 하위 펼치기/접기.
import { ref, computed, watch } from 'vue'
import type { SpecField } from '../lib/spec'

const props = defineProps<{ fields: SpecField[] }>()

// 접힌 경로의 하위(depth가 더 깊은) 행을 숨긴다.
const collapsed = ref<Set<string>>(new Set())

// 새 명세서가 들어오면 접힘 상태를 초기화한다.
watch(
  () => props.fields,
  () => {
    collapsed.value = new Set()
  },
)

const rows = computed(() => {
  const fields = props.fields
  const result: (SpecField & { hasChildren: boolean; isCollapsed: boolean })[] = []
  let hideDepth = Infinity
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    if (f.depth > hideDepth) continue // 접힌 조상의 하위 → 숨김
    hideDepth = Infinity
    const hasChildren = i + 1 < fields.length && fields[i + 1].depth > f.depth
    const isCollapsed = collapsed.value.has(f.path)
    result.push({ ...f, hasChildren, isCollapsed })
    if (isCollapsed) hideDepth = f.depth
  }
  return result
})

function toggle(path: string) {
  const next = new Set(collapsed.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  collapsed.value = next
}
</script>

<template>
  <div class="spec-wrap">
    <table class="spec">
      <thead>
        <tr>
          <th>필드</th>
          <th>타입</th>
          <th>예시값</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in rows" :key="f.path" :class="{ 'is-child': f.depth > 0 }">
          <td class="spec-path">
            <span class="indent" :style="{ width: f.depth * 18 + 'px' }" aria-hidden="true"></span>
            <button
              v-if="f.hasChildren"
              class="caret"
              :aria-label="f.isCollapsed ? '펼치기' : '접기'"
              @click="toggle(f.path)"
            >
              {{ f.isCollapsed ? '▶' : '▼' }}
            </button>
            <span v-else-if="f.depth > 0" class="branch" aria-hidden="true">└</span>
            <span v-else class="caret-ph" aria-hidden="true"></span>
            <span class="field-name">{{ f.name }}</span>
          </td>
          <td><span class="type-chip">{{ f.type }}</span></td>
          <td class="spec-ex">{{ f.example }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
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
.spec-path .caret {
  border: 0;
  background: transparent;
  color: var(--text-subtle);
  font-size: 9px;
  width: 16px;
  padding: 0;
  margin-right: 4px;
  cursor: pointer;
}
.spec-path .caret:hover {
  color: var(--brand);
}
.spec-path .caret-ph {
  display: inline-block;
  width: 16px;
  margin-right: 4px;
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
</style>
