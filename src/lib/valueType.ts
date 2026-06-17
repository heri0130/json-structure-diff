// JSON 값의 표시용 타입 이름을 돌려준다.
// typeof만으로는 null/배열이 모두 'object'라 구분되지 않으므로 보정한다.

export type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object'

export function valueType(value: unknown): JsonType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return t
  return 'object'
}
