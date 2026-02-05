/**
 * Closed Network Tool Guide Hook
 * 
 * Injects tool usage guidance for models with native function calling
 * in closed network environments (Samsung Life).
 */

import type { PluginInput } from "@opencode-ai/plugin"
import {
  TOOL_FORMAT_GUIDANCE_COMPACT,
  DELEGATE_TASK_PARAMS_GUIDANCE,
  WINDOWS_CMD_WARNING,
  ERROR_RECOVERY_GUIDANCE,
} from "../../shared/qwen-tool-guidance"

export const CLOSEDNET_TOOL_GUIDE = `
<STOP_AND_READ_THIS_FIRST>
## [최우선] 반드시 읽으세요
${TOOL_FORMAT_GUIDANCE_COMPACT}
${WINDOWS_CMD_WARNING}
${DELEGATE_TASK_PARAMS_GUIDANCE}
### question 도구 형식
\`\`\`
questions=[{...}, {...}]  ← 배열 (올바름)
questions="[{...}]"       ← 문자열 (잘못됨!)
\`\`\`
**questions는 JSON 배열이어야 함. 문자열로 감싸지 마세요.**

</STOP_AND_READ_THIS_FIRST>

<Environment_And_Constraints>
## Closed Network Environment

- **폐쇄망 환경** - 외부 인터넷 접근 불가
- 사용 금지: webfetch, websearch, codesearch (실패함)
- 외부 문서 필요 시 사용자에게 텍스트로 요청

</Environment_And_Constraints>

<Tool_Usage_Policy>
## Tool Usage Rules

### Workflow
1. glob/grep → 구조 파악
2. read → 파일 이해 (편집 전 필수!)
3. edit/write → 변경
4. bash → 테스트/빌드 검증

### Critical Rules
- **편집 전 읽기** - 읽지 않은 파일 편집 금지
- **네이티브 도구 호출** - 텍스트로 도구 호출 금지
- **반복 실패 시** - question 도구로 사용자에게 문의
- **forward slash** - 경로에 \`/\` 사용 (\`\\\` 아님)

### bash 도구
- description 파라미터 필수 (5-10 단어)
- 예: command="npm test", description="유닛 테스트 실행"

### edit 도구
- oldString 정확히 일치해야 함 (공백/들여쓰기 포함)
- "found multiple times" 에러 → 더 많은 컨텍스트 또는 replaceAll: true
${ERROR_RECOVERY_GUIDANCE}
### Response Language

**You MUST respond in Korean (한국어). Do not switch to English.**

</Tool_Usage_Policy>
`

export interface ClosednetToolGuideHook {
  "experimental.chat.system.transform": (
    input: { sessionID: string },
    output: { system: string[] }
  ) => Promise<void>
}

export interface ClosednetToolGuideConfig {
  enabled: boolean
}

export function createClosednetToolGuideHook(
  _ctx: PluginInput,
  config?: Partial<ClosednetToolGuideConfig>
): ClosednetToolGuideHook {
  const fullConfig: ClosednetToolGuideConfig = {
    enabled: true,
    ...config,
  }

  if (!fullConfig.enabled) {
    return {
      "experimental.chat.system.transform": async () => {},
    }
  }

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(CLOSEDNET_TOOL_GUIDE)
    },
  }
}

export type { ClosednetToolGuideConfig as Config }
