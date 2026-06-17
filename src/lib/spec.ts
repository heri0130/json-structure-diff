// JSON 값으로부터 필드 명세서를 생성한다 (순수 함수).
// PRD 배경: Swagger 같은 도구가 없어 API 명세를 수기 정리 → JSON 구조에서 자동 추출.
//
// 표기 규칙:
//  - 객체: 키를 점(.)으로 잇는다.        예) user.name
//  - 배열: 경로 뒤에 [] 를 붙이고 첫 요소를 대표로 본다. 예) roles[], list[].id
//  - 컨테이너(object/array) 행도 타입과 함께 남겨 구조가 드러나게 한다.

import { valueType, type JsonType } from './valueType'

export interface SpecField {
  /** 필드 경로. 예) user.name, roles[], list[].id */
  path: string
  type: JsonType
  /** 원시값이면 예시값(문자열화), 컨테이너면 빈 문자열 */
  example: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exampleOf(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return '' // 객체/배열은 자식 행으로 펼쳐지므로 예시를 비운다
}

function collect(value: unknown, path: string, fields: SpecField[]): void {
  fields.push({ path, type: valueType(value), example: exampleOf(value) })

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      collect(value[key], path ? `${path}.${key}` : key, fields)
    }
  } else if (Array.isArray(value) && value.length > 0) {
    // 첫 요소를 배열의 대표 구조로 본다.
    collect(value[0], `${path}[]`, fields)
  }
}

export function generateSpec(value: unknown): SpecField[] {
  const fields: SpecField[] = []

  if (isPlainObject(value)) {
    // 루트 객체 자체는 행으로 두지 않고 필드부터 나열한다.
    for (const key of Object.keys(value)) {
      collect(value[key], key, fields)
    }
  } else if (Array.isArray(value)) {
    collect(value, '', fields)
    // 루트가 배열이면 빈 경로 행이 생기므로 '[]' 표기로 보정
    if (fields[0]) fields[0].path = '(루트 배열)'
  } else {
    fields.push({ path: '(루트)', type: valueType(value), example: exampleOf(value) })
  }

  return fields
}
