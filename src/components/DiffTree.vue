<script setup lang="ts">
// 차이 노드 하나와 그 하위를 재귀로 렌더링한다.
import type { DiffNode } from '../lib/diff'
import { valueType } from '../lib/valueType'

defineProps<{ node: DiffNode }>()

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
    <span class="badge">{{ STATUS_LABEL[node.status] }}</span>
    <span class="key">{{ node.key || '(root)' }}</span>

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

    <ul v-if="node.children && node.children.length" class="children">
      <DiffTree v-for="child in node.children" :key="child.path" :node="child" />
    </ul>
  </li>
</template>

<style scoped>
.node {
  list-style: none;
  padding: 2px 0;
  font-family: 'Cascadia Code', 'D2Coding', Consolas, monospace;
  font-size: 13px;
}
.children {
  margin: 0;
  padding-left: 18px;
  border-left: 1px dashed #d0d7de;
}
.badge {
  display: inline-block;
  min-width: 34px;
  text-align: center;
  font-size: 11px;
  padding: 0 4px;
  border-radius: 4px;
  margin-right: 6px;
  color: #fff;
}
.added > .badge { background: #1a7f37; }
.removed > .badge { background: #cf222e; }
.changed > .badge { background: #bf8700; }
.unchanged > .badge { background: #6e7781; }

.key { font-weight: 600; }
.val { margin-left: 8px; }
.old { color: #cf222e; text-decoration: line-through; }
.new { color: #1a7f37; }
.arrow { color: #6e7781; }
.muted { color: #6e7781; }

/* 값 옆 타입 칩 */
.type {
  margin-left: 4px;
  font-size: 10px;
  color: #57606a;
  background: #eaeef2;
  border-radius: 4px;
  padding: 0 4px;
  vertical-align: middle;
}
/* 변경 전/후 타입이 다르면 강조 */
.type.typechanged {
  color: #9a6700;
  background: #fff8c5;
  font-weight: 600;
}
</style>
