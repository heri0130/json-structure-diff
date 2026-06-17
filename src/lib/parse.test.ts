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
})
