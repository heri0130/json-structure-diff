<script setup lang="ts">
// 차이 노드 하나와 그 하위를 재귀로 렌더링한다.
import { ref, computed } from 'vue'
import type { DiffNode } from '../lib/diff'
import { valueType } from '../lib/valueType'

const props = defineProps<{ node: DiffNode; changedOnly?: boolean }>()

const expanded = ref(true) // 하위 트리 펼침 상태

// 변경된 것만 보기: unchanged 노드(=하위까지 변화 없는 서브트리)는 숨긴다.
const visibleChildren = computed(() => {
  const children = props.node.children ?? []
  return props.changedOnly ? children.filter((c) => c.status !== 'unchanged') : children
})
const hasChildren = computed(() => visibleChildren.value.length > 0)

const STATUS_LABEL: Record<DiffNode['status'], string> = {
  added: '추가',
  removed: '삭제',
  changed: '변경',
  unchanged: '동일',
}

// 값이 객체/배열이면 한 줄 직렬화해서 보여준다 (긴 값 대비).
function preview(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`
  return JSON.stringify(value)
}
</script>

<template>
  <li :class="['node', node.status]">
    <button
      v-if="hasChildren"
      class="caret"
      :aria-label="expanded ? '접기' : '펼치기'"
      @click="expanded = !expanded"
    >
      {{ expanded ? '▼' : '▶' }}
    </button>
    <span v-else class="caret-ph" aria-hidden="true"></span>
    <span class="badge">{{ STATUS_LABEL[node.status] }}</span>
    <span class="key">{{ node.key || 'data' }}</span>

    <!-- 잎 노드(자식 없음)일 때만 값을 보여준다 -->
    <template v-if="!node.children">
      <span v-if="node.status === 'added'" class="val new">
        {{ preview(node.newValue) }}<span class="type">{{ valueType(node.newValue) }}</span>
      </span>
      <span v-else-if="node.status === 'removed'" class="val old">
        {{ preview(node.oldValue) }}<span class="type">{{ valueType(node.oldValue) }}</span>
      </span>
      <span v-else-if="node.status === 'changed'" class="val">
        <span class="old">{{ preview(node.oldValue) }}</span
        ><span class="type">{{ valueType(node.oldValue) }}</span>
        <span class="arrow"> → </span>
        <span class="new">{{ preview(node.newValue) }}</span
        ><span
          class="type"
          :class="{ typechanged: valueType(node.oldValue) !== valueType(node.newValue) }"
          >{{ valueType(node.newValue) }}</span
        >
      </span>
      <span v-else class="val muted">
        {{ preview(node.newValue) }}<span class="type">{{ valueType(node.newValue) }}</span>
      </span>
    </template>

    <ul v-if="hasChildren && expanded" class="children">
      <DiffTree
        v-for="child in visibleChildren"
        :key="child.path"
        :node="child"
        :changed-only="changedOnly"
      />
    </ul>
  </li>
</template>

<style scoped>
.node {
  list-style: none;
  padding: 3px 8px;
  margin: 1px 0;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  transition: background 0.1s ease;
}
.node:hover {
  background: var(--surface-2);
}
/* 변경된 행은 좌측에 상태색 띠 */
.node.added { box-shadow: inset 3px 0 0 var(--added); }
.node.removed { box-shadow: inset 3px 0 0 var(--removed); }
.node.changed { box-shadow: inset 3px 0 0 var(--changed); }

.children {
  margin: 0;
  padding-left: 18px;
  border-left: 1px solid var(--border);
}
.caret {
  border: 0;
  background: transparent;
  color: var(--text-subtle);
  font-size: 9px;
  width: 16px;
  padding: 0;
  margin-right: 2px;
  vertical-align: middle;
}
.caret:hover {
  color: var(--brand);
}
.caret-ph {
  display: inline-block;
  width: 18px;
}
.badge {
  display: inline-block;
  min-width: 36px;
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  margin-right: 8px;
  vertical-align: middle;
}
.added > .badge { color: var(--added); background: var(--added-bg); }
.removed > .badge { color: var(--removed); background: var(--removed-bg); }
.changed > .badge { color: var(--changed); background: var(--changed-bg); }
.unchanged > .badge { color: var(--text-subtle); background: var(--surface-2); }

.key { font-weight: 600; color: var(--text); }
.val { margin-left: 8px; }
.old { color: var(--removed); text-decoration: line-through; opacity: 0.85; }
.new { color: var(--added); }
.arrow { color: var(--text-subtle); margin: 0 2px; }
.muted { color: var(--text-muted); }

/* 값 옆 타입 칩 */
.type {
  margin-left: 5px;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 5px;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
/* 변경 전/후 타입이 다르면 강조 */
.type.typechanged {
  color: var(--changed);
  background: var(--changed-bg);
  border-color: transparent;
}
</style>
