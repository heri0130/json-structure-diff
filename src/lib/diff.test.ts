import { describe, it, expect } from 'vitest'
import { diffJson, type DiffNode } from './diff'

// 트리에서 특정 경로의 노드를 찾는 테스트 헬퍼
function findByPath(node: DiffNode, path: string): DiffNode | undefined {
  if (node.path === path) return node
  for (const child of node.children ?? []) {
    const found = findByPath(child, path)
    if (found) return found
  }
  return undefined
}

describe('diffJson', () => {
  it('완전히 동일한 객체는 unchanged 로 본다', () => {
    const { root, summary } = diffJson({ a: 1, b: 'x' }, { a: 1, b: 'x' })
    expect(root.status).toBe('unchanged')
    expect(summary).toEqual({ added: 0, removed: 0, changed: 0 })
  })

  it('새로 생긴 키는 added 로 표시한다', () => {
    const { root, summary } = diffJson({ a: 1 }, { a: 1, b: 2 })
    const node = findByPath(root, 'b')
    expect(node?.status).toBe('added')
    expect(node?.newValue).toBe(2)
    expect(summary.added).toBe(1)
  })

  it('사라진 키는 removed 로 표시한다', () => {
    const { root, summary } = diffJson({ a: 1, b: 2 }, { a: 1 })
    const node = findByPath(root, 'b')
    expect(node?.status).toBe('removed')
    expect(node?.oldValue).toBe(2)
    expect(summary.removed).toBe(1)
  })

  it('값이 바뀐 키는 changed 로 표시하고 전/후 값을 담는다', () => {
    const { root, summary } = diffJson({ a: 1 }, { a: 2 })
    const node = findByPath(root, 'a')
    expect(node?.status).toBe('changed')
    expect(node?.oldValue).toBe(1)
    expect(node?.newValue).toBe(2)
    expect(summary.changed).toBe(1)
  })

  it('중첩 객체의 변경은 자식은 changed, 부모도 changed 로 전파된다', () => {
    const { root } = diffJson({ user: { name: 'kim', age: 30 } }, { user: { name: 'lee', age: 30 } })
    expect(findByPath(root, 'user')?.status).toBe('changed')
    expect(findByPath(root, 'user.name')?.status).toBe('changed')
    expect(findByPath(root, 'user.age')?.status).toBe('unchanged')
  })

  it('타입이 바뀌어도 changed 로 본다 (숫자 → 문자열)', () => {
    const node = findByPath(diffJson({ a: 1 }, { a: '1' }).root, 'a')
    expect(node?.status).toBe('changed')
  })

  it('배열은 MVP에서 통째 값 비교한다 (내용 같으면 unchanged)', () => {
    expect(diffJson({ list: [1, 2] }, { list: [1, 2] }).root.status).toBe('unchanged')
    expect(findByPath(diffJson({ list: [1, 2] }, { list: [1, 3] }).root, 'list')?.status).toBe(
      'changed',
    )
  })
})
