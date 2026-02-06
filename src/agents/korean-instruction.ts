/**
 * Korean Response Instruction for SLI (Samsung Life Insurance) Closed Network
 * Ensures agents respond in Korean when users communicate in Korean.
 */

export const KOREAN_RESPONSE_INSTRUCTION = `
## Language Response Policy
- If the user communicates in Korean, respond in Korean.
- Technical terms may remain in English for clarity.
`

export function getKoreanInstruction(): string {
  return KOREAN_RESPONSE_INSTRUCTION
}
