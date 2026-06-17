// JSON 구조(스키마) 비교 로직 (순수 함수 — UI/네트워크와 무관, TDD 대상)
//
// 비교 기준은 "값"이 아니라 "구조(키 + 타입)"다:
//  - added/removed : 키가 추가/삭제됨
//  - changed       : 같은 키인데 값의 타입이 바뀜 (예: number → string)
//  - unchanged     : 키가 있고 타입이 같음 (값이 달라도 동일로 본다)
// 객체는 키 단위로 재귀, 배열은 식별 키(있으면) 또는 인덱스 단위로 재귀 비교한다.

import { valueType } from './valueType'

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

/** 일반 객체(배열·null 제외)인지 판별. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const SENTINEL = Symbol('absent') // 한쪽에만 키가 있는 경우를 구분하기 위한 표식

/**
 * 배열 요소들을 하나의 대표 스키마로 병합한다 (구조 비교용).
 * 요소 개수·순서·값은 무시하고, 객체 요소면 키 합집합(첫 등장 값 대표), 원시 요소면 첫 요소를 쓴다.
 * 빈 배열은 SENTINEL(요소 없음).
 */
function mergeArrayElements(arr: unknown[]): unknown {
  if (arr.length === 0) return SENTINEL
  if (arr.every(isPlainObject)) {
    const merged: Record<string, unknown> = {}
    for (const el of arr as Record<string, unknown>[]) {
      for (const k of Object.keys(el)) {
        if (!(k in merged)) merged[k] = el[k]
      }
    }
    return merged
  }
  return arr[0]
}

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

  // 양쪽 다 배열 → 요소 "스키마"만 비교한다. 개수·순서·값은 무시하고,
  // 요소들을 병합한 대표 스키마(키 합집합 + 타입)가 같으면 unchanged.
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length === 0 && newValue.length === 0) {
      return { key, path, status: 'unchanged', oldValue, newValue, children: [] }
    }
    const child = diffNode(
      '[]',
      `${path}[]`,
      mergeArrayElements(oldValue),
      mergeArrayElements(newValue),
      summary,
    )
    return {
      key,
      path,
      status: child.status === 'unchanged' ? 'unchanged' : 'changed',
      oldValue,
      newValue,
      children: [child],
    }
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

  // 구조 비교: 타입이 같으면 (값이 달라도) unchanged, 타입이 다르면 changed
  if (valueType(oldValue) === valueType(newValue)) {
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
