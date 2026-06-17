import { describe, it, expect } from 'vitest'
import { generateSpec, type SpecField } from './spec'

function find(fields: SpecField[], path: string): SpecField | undefined {
  return fields.find((f) => f.path === path)
}

describe('generateSpec', () => {
  it('평면 객체의 각 필드를 경로·이름·깊이·타입·예시로 만든다', () => {
    const fields = generateSpec({ a: 1, b: 'x' })
    expect(find(fields, 'a')).toEqual({ path: 'a', name: 'a', depth: 0, type: 'number', example: '1' })
    expect(find(fields, 'b')).toEqual({ path: 'b', name: 'b', depth: 0, type: 'string', example: '"x"' })
  })

  it('중첩 객체는 깊이로 계층을 표현하고 이름은 키만 담는다', () => {
    const fields = generateSpec({ user: { name: 'kim' } })
    expect(find(fields, 'user')).toMatchObject({ name: 'user', depth: 0, type: 'object' })
    expect(find(fields, 'user.name')).toMatchObject({
      name: 'name',
      depth: 1,
      type: 'string',
      example: '"kim"',
    })
  })

  it('원시 배열은 요소타입[] 한 줄로 표기하고 하위 행을 만들지 않는다', () => {
    const fields = generateSpec({ roles: ['user'] })
    expect(find(fields, 'roles')).toMatchObject({ name: 'roles', depth: 0, type: 'string[]' })
    expect(find(fields, 'roles[]')).toBeUndefined()
  })

  it('객체 배열은 object[] 한 줄 + 하위 필드를 바로 펼친다 ([] 중간 행 없음)', () => {
    const fields = generateSpec({ list: [{ id: 1, name: '주문' }] })
    expect(find(fields, 'list')).toMatchObject({ name: 'list', depth: 0, type: 'object[]' })
    expect(find(fields, 'list[]')).toBeUndefined()
    expect(find(fields, 'list[].id')).toMatchObject({ name: 'id', depth: 1, type: 'number' })
    expect(find(fields, 'list[].name')).toMatchObject({ name: 'name', depth: 1, type: 'string' })
  })

  it('빈 배열은 array 한 줄만 남긴다', () => {
    const fields = generateSpec({ tags: [] })
    expect(find(fields, 'tags')).toMatchObject({ name: 'tags', depth: 0, type: 'array' })
    expect(find(fields, 'tags[]')).toBeUndefined()
  })
})
