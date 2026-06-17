// JSON 값으로부터 필드 명세서를 생성한다 (순수 함수).
// PRD 배경: Swagger 같은 도구가 없어 API 명세를 수기 정리 → JSON 구조에서 자동 추출.
//
// 표기 규칙:
//  - 객체: 키를 점(.)으로 잇는다.        예) user.name
//  - 배열: 경로 뒤에 [] 를 붙이고 첫 요소를 대표로 본다. 예) roles[], list[].id
//  - 컨테이너(object/array) 행도 타입과 함께 남겨 구조가 드러나게 한다.

import { valueType } from './valueType'

export interface SpecField {
  /** 필드 경로(고유 식별·정렬용). 예) user.name, list[].id */
  path: string
  /** 표시용 이름 — 해당 레벨의 키만. 예) user, name, roles */
  name: string
  /** 들여쓰기 깊이 (0부터) */
  depth: number
  /** 표시용 타입 라벨. 예) string, object, string[], object[], array */
  type: string
  /** 원시값/원시배열이면 예시값(문자열화), 객체/객체배열이면 빈 문자열 */
  example: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exampleOf(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return JSON.stringify(value) // 원시 배열은 한 줄 예시로
  return '' // 객체는 자식 행으로 펼쳐지므로 예시를 비운다
}

function collect(
  value: unknown,
  name: string,
  path: string,
  depth: number,
  fields: SpecField[],
): void {
  if (Array.isArray(value)) {
    const first = value.length > 0 ? value[0] : undefined
    if (first !== undefined && isPlainObject(first)) {
      // 객체 배열: object[] 한 줄 + 첫 요소의 필드를 바로 하위로 펼친다 ([] 중간 행 없음)
      fields.push({ path, name, depth, type: 'object[]', example: '' })
      for (const key of Object.keys(first)) {
        collect(first[key], key, `${path}[].${key}`, depth + 1, fields)
      }
    } else if (value.length > 0) {
      // 원시(또는 중첩 배열) 요소: 요소타입[] 한 줄, 하위 없음
      fields.push({ path, name, depth, type: `${valueType(first)}[]`, example: exampleOf(value) })
    } else {
      // 빈 배열
      fields.push({ path, name, depth, type: 'array', example: '[]' })
    }
    return
  }

  fields.push({ path, name, depth, type: valueType(value), example: exampleOf(value) })

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      collect(value[key], key, path ? `${path}.${key}` : key, depth + 1, fields)
    }
  }
}

export function generateSpec(value: unknown): SpecField[] {
  const fields: SpecField[] = []

  if (isPlainObject(value)) {
    // 루트 객체 자체는 행으로 두지 않고 필드부터 나열한다.
    for (const key of Object.keys(value)) {
      collect(value[key], key, key, 0, fields)
    }
  } else if (Array.isArray(value)) {
    collect(value, '(루트 배열)', '', 0, fields)
  } else {
    fields.push({ path: '(루트)', name: '(루트)', depth: 0, type: valueType(value), example: exampleOf(value) })
  }

  return fields
}
