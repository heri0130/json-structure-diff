// JSON 입력 유효성 검사 (순수 함수)
// 깨진/빈 입력에도 앱이 죽지 않도록, 예외를 던지지 않고 결과 객체로 돌려준다.

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string }

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
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (e) {
    // SyntaxError 메시지를 그대로 노출하면 위치 힌트(position 등)가 포함된다.
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, message: `${label} 파싱 오류: ${detail}` }
  }
}
