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

describe('diffJson — 구조(키/타입) 비교', () => {
  it('완전히 동일한 객체는 unchanged 로 본다', () => {
    const { root, summary } = diffJson({ a: 1, b: 'x' }, { a: 1, b: 'x' })
    expect(root.status).toBe('unchanged')
    expect(summary).toEqual({ added: 0, removed: 0, changed: 0 })
  })

  it('같은 타입이면 값이 달라도 unchanged 로 본다', () => {
    const { root, summary } = diffJson({ a: 1 }, { a: 999 })
    expect(root.status).toBe('unchanged')
    expect(summary.changed).toBe(0)
  })

  it('타입이 바뀐 키는 changed (number → string)', () => {
    const { root, summary } = diffJson({ a: 1 }, { a: '1' })
    const node = findByPath(root, 'a')
    expect(node?.status).toBe('changed')
    expect(node?.oldValue).toBe(1)
    expect(node?.newValue).toBe('1')
    expect(summary.changed).toBe(1)
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

  it('중첩 객체: 자식 타입 변경은 부모로 changed 전파', () => {
    const { root } = diffJson({ user: { age: 30 } }, { user: { age: '30' } })
    expect(findByPath(root, 'user')?.status).toBe('changed')
    expect(findByPath(root, 'user.age')?.status).toBe('changed')
  })

  it('중첩 객체: 값만 다르면 unchanged', () => {
    const { root } = diffJson({ user: { name: 'kim' } }, { user: { name: 'lee' } })
    expect(findByPath(root, 'user')?.status).toBe('unchanged')
  })

  it('null → object 는 타입 변경(changed)', () => {
    expect(findByPath(diffJson({ a: null }, { a: { x: 1 } }).root, 'a')?.status).toBe('changed')
  })

  it('객체가 통째로 추가되면 내부를 자식으로 펼친다 (요약은 1건)', () => {
    const { root, summary } = diffJson({}, { item: { id: 3, name: '배송' } })
    const item = findByPath(root, 'item')
    expect(item?.status).toBe('added')
    expect(item?.children?.length).toBe(2)
    expect(findByPath(root, 'item.id')?.status).toBe('added')
    expect(summary.added).toBe(1)
  })

  it('배열이 통째로 삭제되면 요소를 자식으로 펼친다', () => {
    const { root } = diffJson({ list: [{ id: 1 }] }, {})
    expect(findByPath(root, 'list')?.status).toBe('removed')
    expect(findByPath(root, 'list[0].id')?.status).toBe('removed')
  })
})

describe('diffJson — 배열 (요소 스키마 비교)', () => {
  it('같은 스키마면 요소가 추가돼도 unchanged', () => {
    const { root } = diffJson(
      { list: [{ id: 1, name: 'a' }] },
      { list: [{ id: 1, name: 'a' }, { id: 3, name: '배송' }] },
    )
    expect(findByPath(root, 'list')?.status).toBe('unchanged')
  })

  it('순서가 바뀌어도 unchanged', () => {
    const { root } = diffJson({ list: [{ id: 1 }, { id: 2 }] }, { list: [{ id: 2 }, { id: 1 }] })
    expect(findByPath(root, 'list')?.status).toBe('unchanged')
  })

  it('원시 배열은 길이가 달라도 타입 같으면 unchanged', () => {
    expect(diffJson({ list: [1] }, { list: [1, 2, 3] }).root.status).toBe('unchanged')
  })

  it('요소 스키마에 새 키가 생기면 changed', () => {
    const { root } = diffJson({ list: [{ id: 1 }] }, { list: [{ id: 1, grade: 'A' }] })
    expect(findByPath(root, 'list')?.status).toBe('changed')
    expect(findByPath(root, 'list[].grade')?.status).toBe('added')
  })

  it('요소 키의 타입이 바뀌면 changed', () => {
    const { root } = diffJson({ list: [{ v: 1 }] }, { list: [{ v: '1' }] })
    expect(findByPath(root, 'list[].v')?.status).toBe('changed')
  })

  it('원시 배열 요소 타입이 바뀌면 changed', () => {
    expect(findByPath(diffJson({ list: [1] }, { list: ['1'] }).root, 'list')?.status).toBe('changed')
  })

  it('서로 다른 요소들의 키를 합쳐 스키마로 본다', () => {
    // old 요소엔 grade 없음, new 요소 중 하나에만 grade → 스키마상 grade 추가
    const { root } = diffJson(
      { list: [{ id: 1 }, { id: 2 }] },
      { list: [{ id: 1 }, { id: 2, grade: 'A' }] },
    )
    expect(findByPath(root, 'list[].grade')?.status).toBe('added')
  })

  it('빈 배열 양쪽은 unchanged', () => {
    expect(diffJson({ list: [] }, { list: [] }).root.status).toBe('unchanged')
  })

  it('배열 ↔ 비배열 타입 변경은 changed', () => {
    expect(findByPath(diffJson({ a: [1] }, { a: 'x' }).root, 'a')?.status).toBe('changed')
  })
})
