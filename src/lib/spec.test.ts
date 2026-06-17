import { describe, it, expect } from 'vitest'
import { generateSpec, type SpecField } from './spec'

function paths(fields: SpecField[]): string[] {
  return fields.map((f) => f.path)
}
function find(fields: SpecField[], path: string): SpecField | undefined {
  return fields.find((f) => f.path === path)
}

describe('generateSpec', () => {
  it('평면 객체의 각 필드를 경로·타입·예시로 만든다', () => {
    const fields = generateSpec({ a: 1, b: 'x' })
    expect(find(fields, 'a')).toEqual({ path: 'a', type: 'number', example: '1' })
    expect(find(fields, 'b')).toEqual({ path: 'b', type: 'string', example: '"x"' })
  })

  it('중첩 객체는 점 경로로 펼친다 (컨테이너 행도 남긴다)', () => {
    const fields = generateSpec({ user: { name: 'kim' } })
    expect(find(fields, 'user')?.type).toBe('object')
    expect(find(fields, 'user.name')).toEqual({ path: 'user.name', type: 'string', example: '"kim"' })
  })

  it('원시 배열은 [] 표기로 요소 타입을 보여준다', () => {
    const fields = generateSpec({ roles: ['user'] })
    expect(find(fields, 'roles')?.type).toBe('array')
    expect(find(fields, 'roles[]')?.type).toBe('string')
  })

  it('객체 배열은 첫 요소 기준으로 []. 하위 필드를 펼친다', () => {
    const fields = generateSpec({ list: [{ id: 1, name: '주문' }] })
    expect(paths(fields)).toContain('list')
    expect(find(fields, 'list[].id')?.type).toBe('number')
    expect(find(fields, 'list[].name')?.type).toBe('string')
  })

  it('빈 배열은 array 한 줄만 남긴다', () => {
    const fields = generateSpec({ tags: [] })
    expect(find(fields, 'tags')?.type).toBe('array')
    expect(find(fields, 'tags[]')).toBeUndefined()
  })
})
