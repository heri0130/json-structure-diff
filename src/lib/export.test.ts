import { describe, it, expect } from 'vitest'
import { diffJson } from './diff'
import { generateSpec } from './spec'
import { diffToMarkdown, specToMarkdown } from './export'

function tableRows(md: string): string[] {
  return md.split('\n').filter((l) => l.startsWith('|'))
}

describe('diffToMarkdown', () => {
  it('타입 변경 행을 담고 같은 타입(unchanged)은 제외한다', () => {
    const md = diffToMarkdown(diffJson({ a: 1, keep: 'x' }, { a: '1', keep: 'y', b: 3 }))
    expect(md).toContain('변경 요약')
    const aRow = tableRows(md).find((l) => /\| a /.test(l))
    expect(aRow).toContain('변경') // a: number → string
    expect(tableRows(md).some((l) => l.includes('추가') && /\| b /.test(l))).toBe(true)
    expect(md).not.toContain('keep') // 값만 다르고 타입 같음 → 제외
  })

  it('요약 카운트를 포함한다', () => {
    expect(diffToMarkdown(diffJson({ a: 1 }, { a: '1' }))).toContain('변경 1')
  })

  it('통째로 추가된 객체는 한 행으로만 나온다', () => {
    const md = diffToMarkdown(diffJson({}, { item: { id: 1 } }))
    expect(tableRows(md).some((l) => l.includes('추가') && l.includes('item'))).toBe(true)
    expect(md).not.toContain('item.id')
  })

  it('표준 마크다운 표 헤더를 포함한다', () => {
    const md = diffToMarkdown(diffJson({ a: 1 }, { a: 2 }))
    expect(md).toContain('| 상태 | 경로 | 변경 전 | 변경 후 |')
    expect(md).toContain('| --- | --- | --- | --- |')
  })
})

describe('specToMarkdown', () => {
  it('명세서를 마크다운 표로 만든다', () => {
    const md = specToMarkdown(generateSpec({ user: { name: 'kim' } }))
    expect(md).toContain('명세서')
    const row = tableRows(md).find((l) => l.includes('user.name'))
    expect(row).toContain('string')
    expect(row).toContain('"kim"')
  })
})
