export const KOREAN_RESPONSE_INSTRUCTION = `<CRITICAL_LANGUAGE_RULE>
**모든 응답은 반드시 한국어로 작성하세요. 영어로 응답하지 마세요.**

- 사용자에게 말할 때: 한국어
- 에이전트에게 지시할 때: 한국어
- 코드 주석: 한국어 (필수적인 경우만)
- 커밋 메시지: 한국어
- 에러 메시지 설명: 한국어

**예외**: 코드 자체, 변수명, 함수명, 영어 기술 용어는 영어 유지
</CRITICAL_LANGUAGE_RULE>
`

export function getKoreanInstruction(): string {
  return KOREAN_RESPONSE_INSTRUCTION
}
