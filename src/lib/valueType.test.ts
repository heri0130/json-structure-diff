import { describe, it, expect } from 'vitest'
import { valueType } from './valueType'

describe('valueType', () => {
  it('원시 타입을 구분한다', () => {
    expect(valueType('hi')).toBe('string')
    expect(valueType(42)).toBe('number')
    expect(valueType(true)).toBe('boolean')
  })

  it('null 과 배열을 object 와 구분한다', () => {
    expect(valueType(null)).toBe('null')
    expect(valueType([1, 2])).toBe('array')
    expect(valueType({ a: 1 })).toBe('object')
  })
})
