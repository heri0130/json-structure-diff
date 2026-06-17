// JSON 구조 비교 로직 (순수 함수 — UI/네트워크와 무관, TDD 대상)
//
// MVP 범위: 객체 중첩까지 키 단위로 비교. 배열은 통째로 값 비교(unchanged/changed)로
// 처리한다 — 배열 인덱스 단위 비교는 위험 요소가 커 다음 단계로 미룸(README 6.4 참고).

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffNode {
  /** 이 노드의 키. 루트는 빈 문자열. */
  key: string
  /** 루트부터의 경로. 예: "user.name" */
  path: string
  status: DiffStatus
  /** 변경 전 값 (added면 없음) */
  oldValue?: unknown
  /** 변경 후 값 (removed면 없음) */
  newValue?: unknown
  /** 객체일 때 하위 노드들 */
  children?: DiffNode[]
}

export interface DiffSummary {
  added: number
  removed: number
  changed: number
}

export interface DiffResult {
  root: DiffNode
  summary: DiffSummary
}

/** 일반 객체(배열·null 제외)인지 판별 — 배열은 MVP에서 값으로 통째 비교한다. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 원시값·배열의 동등 비교. 배열/객체는 직렬화로 비교(MVP 수준이면 충분). */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  return JSON.stringify(a) === JSON.stringify(b)
}

const SENTINEL = Symbol('absent') // 한쪽에만 키가 있는 경우를 구분하기 위한 표식

/**
 * 한쪽에만 존재하는 값(추가 또는 삭제)을 표시용 자식 트리로 펼친다.
 * 요약 카운트에는 포함하지 않는다 — 추가/삭제는 최상위 1건으로만 집계한다.
 */
function buildSubtree(value: unknown, path: string, status: 'added' | 'removed'): DiffNode[] | undefined {
  if (isPlainObject(value)) {
    return Object.keys(value).map((k) =>
      oneSidedNode(k, path ? `${path}.${k}` : k, value[k], status),
    )
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => oneSidedNode(`[${i}]`, `${path}[${i}]`, v, status))
  }
  return undefined
}

function oneSidedNode(
  key: string,
  path: string,
  value: unknown,
  status: 'added' | 'removed',
): DiffNode {
  const node: DiffNode = { key, path, status }
  if (status === 'added') node.newValue = value
  else node.oldValue = value
  const children = buildSubtree(value, path, status)
  if (children) node.children = children
  return node
}

function diffNode(
  key: string,
  path: string,
  oldValue: unknown,
  newValue: unknown,
  summary: DiffSummary,
): DiffNode {
  // 한쪽에만 존재 → added / removed. 값이 객체/배열이면 내부를 자식으로 펼친다.
  if (oldValue === SENTINEL) {
    summary.added++
    return oneSidedNode(key, path, newValue, 'added')
  }
  if (newValue === SENTINEL) {
    summary.removed++
    return oneSidedNode(key, path, oldValue, 'removed')
  }

  // 양쪽 다 배열 → 인덱스 단위로 재귀 비교. 길이가 다르면 남는 인덱스는 added/removed.
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const len = Math.max(oldValue.length, newValue.length)
    const children: DiffNode[] = []
    for (let i = 0; i < len; i++) {
      children.push(
        diffNode(
          `[${i}]`,
          `${path}[${i}]`,
          i < oldValue.length ? oldValue[i] : SENTINEL,
          i < newValue.length ? newValue[i] : SENTINEL,
          summary,
        ),
      )
    }
    const changed = children.some((c) => c.status !== 'unchanged')
    return { key, path, status: changed ? 'changed' : 'unchanged', oldValue, newValue, children }
  }

  // 양쪽 다 객체 → 재귀 비교, 자식 중 하나라도 변하면 부모도 changed
  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    const keys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)]))
    const children = keys.map((childKey) =>
      diffNode(
        childKey,
        path ? `${path}.${childKey}` : childKey,
        childKey in oldValue ? oldValue[childKey] : SENTINEL,
        childKey in newValue ? newValue[childKey] : SENTINEL,
        summary,
      ),
    )
    const changed = children.some((c) => c.status !== 'unchanged')
    return { key, path, status: changed ? 'changed' : 'unchanged', oldValue, newValue, children }
  }

  // 그 외(원시값·배열·타입 불일치) → 값 동등 비교
  if (isEqual(oldValue, newValue)) {
    return { key, path, status: 'unchanged', oldValue, newValue }
  }
  summary.changed++
  return { key, path, status: 'changed', oldValue, newValue }
}

/**
 * 두 JSON 값을 비교해 차이 트리와 요약을 돌려준다.
 * @param oldValue 변경 전 값
 * @param newValue 변경 후 값
 */
export function diffJson(oldValue: unknown, newValue: unknown): DiffResult {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0 }
  const root = diffNode('', '', oldValue, newValue, summary)
  return { root, summary }
}
