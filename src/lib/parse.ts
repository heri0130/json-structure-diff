// JSON 입력 유효성 검사 (순수 함수)
// 깨진/빈 입력에도 앱이 죽지 않도록, 예외를 던지지 않고 결과 객체로 돌려준다.

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string }

/**
 * JSON 텍스트에서 주석(// 라인, /* *​/ 블록)을 제거한다 (JSONC 허용).
 * 문자열 리터럴 안의 //, /* 는 주석으로 보지 않도록 문자열·이스케이프를 추적한다.
 */
function stripJsonComments(input: string): string {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]

    if (inLine) {
      if (ch === '\n') {
        inLine = false
        out += ch
      }
      continue
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false
        i++
      }
      continue
    }
    if (inString) {
      out += ch
      if (ch === '\\') {
        // 이스케이프된 다음 문자는 그대로 보존
        out += next ?? ''
        i++
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    // 문자열·주석 밖
    if (ch === '"') {
      inString = true
      out += ch
    } else if (ch === '/' && next === '/') {
      inLine = true
      i++
    } else if (ch === '/' && next === '*') {
      inBlock = true
      i++
    } else {
      out += ch
    }
  }
  return out
}

/**
 * 입력 텍스트를 JSON으로 파싱한다.
 * @param text 사용자가 붙여넣은 원문
 * @param label 에러 메시지에 쓸 이름 (예: "변경 전")
 */
export function parseJsonInput(text: string, label = 'JSON'): ParseResult {
  const trimmed = text.trim()
  if (trimmed === '') {
    return { ok: false, message: `${label}이(가) 비어 있습니다.` }
  }
  try {
    // 주석(JSONC)을 허용한다 — 제거 후 표준 JSON으로 파싱.
    return { ok: true, value: JSON.parse(stripJsonComments(trimmed)) }
  } catch (e) {
    // SyntaxError 메시지를 그대로 노출하면 위치 힌트(position 등)가 포함된다.
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, message: `${label} 파싱 오류: ${detail}` }
  }
}
