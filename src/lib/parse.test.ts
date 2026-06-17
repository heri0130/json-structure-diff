import { describe, it, expect } from 'vitest'
import { parseJsonInput } from './parse'

describe('parseJsonInput', () => {
  it('유효한 JSON은 ok:true 와 파싱값을 돌려준다', () => {
    const r = parseJsonInput('{"a":1}')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ a: 1 })
  })

  it('빈 입력은 ok:false 와 안내 메시지를 돌려준다 (예외를 던지지 않음)', () => {
    const r = parseJsonInput('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('비어')
  })

  it('깨진 JSON은 ok:false 와 오류 메시지를 돌려준다', () => {
    const r = parseJsonInput('{"a":}', '변경 전')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('변경 전')
  })

  it('// 라인 주석을 무시하고 파싱한다', () => {
    const r = parseJsonInput('{\n  "a": 1, // 설명\n  "b": 2\n  //...\n}')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ a: 1, b: 2 })
  })

  it('/* */ 블록 주석을 무시한다', () => {
    const r = parseJsonInput('{ /* 메모 */ "a": 1 }')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ a: 1 })
  })

  it('문자열 안의 // 는 주석으로 보지 않고 보존한다', () => {
    const r = parseJsonInput('{ "url": "http://example.com/x" }')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ url: 'http://example.com/x' })
  })
})
