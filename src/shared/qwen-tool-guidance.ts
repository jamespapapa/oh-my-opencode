/**
 * Qwen Tool Calling Guidance for Samsung Life Closed Network
 * 
 * Single source of truth for all tool calling format guidance.
 * Import from here instead of duplicating messages across hooks.
 */

export const TOOL_FORMAT_ERROR_HEADER = `[치명적 오류] 도구가 실행되지 않았습니다!`

export const TOOL_FORMAT_ERROR_BODY = `
당신이 출력한 텍스트:
⚙ delegate_task [...]
⚙ background_output [...]
✱ Glob "..."

이것들은 텍스트일 뿐입니다. 실행되지 않았습니다. 아무 일도 일어나지 않았습니다.

**문제**: ⚙, ✱ 기호를 텍스트로 출력하면 도구가 호출되지 않습니다.
**해결**: 네이티브 함수 호출을 사용해야 합니다.

지금 바로:
1. ⚙ 기호 사용 중단
2. ✱ 기호 사용 중단  
3. 네이티브 함수 호출 인터페이스 사용

절대로 다음과 같이 하지 마세요:
- ⚙ delegate_task [subagent_type=explore, ...]
- ⚙ background_output [task_id=...]
- ✱ Glob "**/*.java"

도구를 호출하려면 텍스트가 아닌 실제 함수 호출을 사용하세요.`

export const TOOL_FORMAT_ERROR_FULL = `${TOOL_FORMAT_ERROR_HEADER}
${TOOL_FORMAT_ERROR_BODY}`

export const TOOL_FORMAT_WARNING_TABLE = `
| 금지 패턴 (에러 발생) | 이유 |
|----------------------|------|
| \`⚙ delegate_task [...]\` | 텍스트일 뿐, 실행 안 됨 |
| \`✱ Glob "..."\` | 텍스트일 뿐, 실행 안 됨 |
| \`다음 행동 제안: ⚙ ...\` | 제안 NO, 바로 실행 YES |
| \`dir /S /B\` | Windows CMD 명령어, Git Bash에서 실패 |
`

export const TOOL_FORMAT_GUIDANCE_COMPACT = `
## [CRITICAL] 도구 호출 형식

**절대 텍스트로 도구를 호출하지 마세요. 제안하지 말고 바로 실행하세요.**
${TOOL_FORMAT_WARNING_TABLE}
**"Invalid" 에러 → ⚙ 기호를 썼기 때문. load_skills 문제가 아닙니다!**
**도구를 "제안"하지 마세요. 바로 실행하세요.**
`

export const DELEGATE_TASK_PARAMS_GUIDANCE = `
### delegate_task 필수 파라미터

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| run_in_background | **필수** | \`true\` 또는 \`false\` |
| load_skills | **필수** | 배열 \`[]\` (빈 배열 OK) |
| prompt | **필수** | 작업 설명 |
| subagent_type 또는 category | **필수** | 둘 중 하나 |

**예시**:
\`\`\`
delegate_task(subagent_type="explore", run_in_background=true, load_skills=[], prompt="...")
\`\`\`
`

export const ERROR_RECOVERY_GUIDANCE = `
### 에러 발생 시 즉시 조치

| 에러 메시지 | 원인 | 해결 |
|------------|------|------|
| "Invalid" 도구 에러 | ⚙, ✱ 기호 사용 | 네이티브 함수 호출 사용 |
| "run_in_background REQUIRED" | 파라미터 누락 | \`run_in_background=false\` 또는 \`true\` 추가 |
| "load_skills must be array" | 문자열 사용 | \`load_skills=[]\` 사용 |
| "No such file or directory" | Windows CMD 사용 | glob/grep/read 도구 사용 |

**같은 형식으로 재시도하지 마세요. 형식을 먼저 수정하세요.**
`

export const WINDOWS_CMD_WARNING = `
### Windows CMD 명령어 금지 (Git Bash 환경)

| 금지 (에러남) | 대신 사용 |
|--------------|----------|
| \`dir /S /B\` | \`glob(pattern="**/*")\` |
| \`findstr\` | \`grep(pattern="...")\` |
| \`type filename\` | \`read(filePath="...")\` |
`

/**
 * Post-compaction reminder - injected after summary to ensure continuing model
 * sees the tool format rules. Intentionally avoids literal examples to prevent
 * the model from mimicking bad patterns.
 */
export const POST_COMPACTION_TOOL_REMINDER = `[SYSTEM REMINDER - POST COMPACTION]

## 도구 호출 형식 (필수)

이 세션은 방금 컴팩션되었습니다. 도구 호출 규칙을 다시 확인하세요:

1. **네이티브 함수 호출만 사용** - 텍스트로 도구를 호출하지 마세요
2. **기호 사용 금지** - 특수 기호로 시작하는 텍스트 형식 도구 호출은 실행되지 않습니다
3. **"Invalid" 에러** - 텍스트 형식 도구 호출 시 발생, 네이티브 함수 호출로 전환하세요
4. **제안 금지** - 도구를 "제안"하지 말고 바로 실행하세요

**중요**: 이전 대화에서 본 도구 호출 형식을 모방하지 마세요. 오직 네이티브 함수 호출만 사용하세요.
`

/**
 * Section to add to compaction summary prompt - instructs summarizer to
 * include tool format rules and avoid literal examples.
 */
export const SUMMARIZE_TOOL_FORMAT_SECTION = `
## 8. Tool Calling Format Rules (MUST INCLUDE IN SUMMARY)

**You MUST include the following statement in your summary:**

"도구 호출은 반드시 네이티브 함수 호출을 사용해야 합니다. 텍스트 형식의 도구 호출은 실행되지 않습니다."

**You MUST NOT include in your summary:**
- Literal tool call examples with special symbols
- Any text that looks like a tool invocation pattern
- Quoted tool calls from the conversation history

This ensures the continuing model does not mimic incorrect patterns from the history.
`
