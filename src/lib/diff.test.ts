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

  it('같은 배열은 unchanged 로 본다', () => {
    expect(diffJson({ list: [1, 2] }, { list: [1, 2] }).root.status).toBe('unchanged')
  })

  it('배열을 인덱스 단위로 비교한다 (요소 변경)', () => {
    const { root } = diffJson({ list: [1, 2] }, { list: [1, 3] })
    expect(findByPath(root, 'list')?.status).toBe('changed')
    expect(findByPath(root, 'list[0]')?.status).toBe('unchanged')
    const changed = findByPath(root, 'list[1]')
    expect(changed?.status).toBe('changed')
    expect(changed?.oldValue).toBe(2)
    expect(changed?.newValue).toBe(3)
  })

  it('배열 길이가 늘면 추가된 요소는 added', () => {
    const { root, summary } = diffJson({ list: [1] }, { list: [1, 2] })
    const added = findByPath(root, 'list[1]')
    expect(added?.status).toBe('added')
    expect(added?.newValue).toBe(2)
    expect(summary.added).toBe(1)
  })

  it('배열 길이가 줄면 사라진 요소는 removed', () => {
    const { root, summary } = diffJson({ list: [1, 2] }, { list: [1] })
    expect(findByPath(root, 'list[1]')?.status).toBe('removed')
    expect(summary.removed).toBe(1)
  })

  it('배열 안의 객체도 재귀로 비교한다', () => {
    const { root } = diffJson({ list: [{ a: 1 }] }, { list: [{ a: 2 }] })
    expect(findByPath(root, 'list[0].a')?.status).toBe('changed')
  })

  it('배열 ↔ 비배열 타입 변경은 changed', () => {
    expect(findByPath(diffJson({ a: [1] }, { a: 'x' }).root, 'a')?.status).toBe('changed')
  })

  it('객체가 통째로 추가되면 내부를 자식으로 펼친다 (요약은 1건)', () => {
    const { root, summary } = diffJson({}, { item: { id: 3, name: '배송' } })
    const item = findByPath(root, 'item')
    expect(item?.status).toBe('added')
    expect(item?.children?.length).toBe(2)
    expect(findByPath(root, 'item.id')?.status).toBe('added')
    expect(findByPath(root, 'item.id')?.newValue).toBe(3)
    expect(summary.added).toBe(1) // 펼쳐도 추가는 1건으로 집계
  })

  it('배열이 통째로 삭제되면 요소를 자식으로 펼친다', () => {
    const { root } = diffJson({ list: [{ id: 1 }] }, {})
    const list = findByPath(root, 'list')
    expect(list?.status).toBe('removed')
    expect(findByPath(root, 'list[0]')?.status).toBe('removed')
    expect(findByPath(root, 'list[0].id')?.status).toBe('removed')
  })
})
