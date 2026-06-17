// 비교 결과 / 명세서를 마크다운 표로 변환한다 (순수 함수).
// 엑셀·메신저·PR 등에 그대로 붙여넣어 공유하기 위함.

import type { DiffNode, DiffResult } from './diff'
import type { SpecField } from './spec'

const STATUS_KR: Record<DiffNode['status'], string> = {
  added: '추가',
  removed: '삭제',
  changed: '변경',
  unchanged: '동일',
}

/** 표 구분자(|)·줄바꿈을 이스케이프 */
function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

/** 마크다운 표 셀용 값 포맷 — 직렬화 후 이스케이프 */
function cell(value: unknown): string {
  if (value === undefined) return ''
  const s = JSON.stringify(value)
  if (s === undefined) return ''
  return escapeCell(s)
}

/** 실질 변경 지점만 평탄화 — unchanged는 건너뛰고, changed 컨테이너는 자식으로 내려간다. */
function flattenChanges(node: DiffNode, rows: DiffNode[]): void {
  if (node.status === 'unchanged') {
    node.children?.forEach((c) => flattenChanges(c, rows))
    return
  }
  if (node.status === 'changed' && node.children) {
    node.children.forEach((c) => flattenChanges(c, rows))
    return
  }
  // added/removed(통째) 또는 changed 리프
  rows.push(node)
}

export function diffToMarkdown(result: DiffResult): string {
  const { summary } = result
  const changes: DiffNode[] = []
  flattenChanges(result.root, changes)

  const lines: string[] = [
    '## 변경 요약',
    '',
    `추가 ${summary.added} · 삭제 ${summary.removed} · 변경 ${summary.changed}`,
    '',
    '| 상태 | 경로 | 변경 전 | 변경 후 |',
    '| --- | --- | --- | --- |',
  ]
  for (const n of changes) {
    lines.push(
      `| ${STATUS_KR[n.status]} | ${n.path || '(root)'} | ${cell(n.oldValue)} | ${cell(n.newValue)} |`,
    )
  }
  return lines.join('\n')
}

export function specToMarkdown(fields: SpecField[]): string {
  const lines: string[] = [
    '## 명세서 (변경 후 구조)',
    '',
    '| 필드 | 타입 | 예시값 |',
    '| --- | --- | --- |',
  ]
  for (const f of fields) {
    lines.push(`| ${f.path || '(root)'} | ${f.type} | ${escapeCell(f.example)} |`)
  }
  return lines.join('\n')
}

export type { DiffNode }
