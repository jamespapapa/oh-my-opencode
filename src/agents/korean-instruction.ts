/**
 * Korean Response Instruction for SLI (Samsung Life Insurance) Closed Network
 * All responses must be in Korean.
 */

export const KOREAN_RESPONSE_INSTRUCTION = `
## Language Response Policy (언어 정책)
- 반드시 한국어로 응답할 것. ALWAYS respond in Korean.
- 기술 용어는 영어 유지 가능.
`

export function getKoreanInstruction(): string {
  return KOREAN_RESPONSE_INSTRUCTION
}
