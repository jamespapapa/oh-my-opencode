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
 * sees the tool format rules. This MUST be strong enough to override any
 * bad patterns the model may have seen in the summary.
 * 
 * v45: Made MUCH stronger - includes full tool guidance, not just reminders.
 */
export const POST_COMPACTION_TOOL_REMINDER = `[SYSTEM - CRITICAL - 컴팩션 후 필수 규칙]

#######################################################
##  경고: 요약에서 본 도구 패턴을 절대 따라하지 마세요  ##
#######################################################

이 세션은 방금 컴팩션되었습니다. 요약 내용에 도구 호출처럼 보이는 텍스트가 있을 수 있지만,
**그것들은 잘못된 형식입니다. 절대 모방하지 마세요.**

## 절대 금지 (위반 시 에러 발생):

| 금지 패턴 | 왜 금지? |
|----------|---------|
| ⚙ delegate_task [...] | 텍스트일 뿐, 실행 안 됨 |
| ✱ Glob "..." | 텍스트일 뿐, 실행 안 됨 |
| → Read filepath | 텍스트일 뿐, 실행 안 됨 |
| mcp_xxx(...) | 텍스트일 뿐, 실행 안 됨 |
| ~ Updating todos... | 텍스트일 뿐, 실행 안 됨 |

**위 기호들(⚙, ✱, →, ~)을 출력하면 "Invalid tool" 에러가 발생합니다.**

## 올바른 도구 호출 방법:

도구를 사용하려면:
1. 텍스트로 도구 이름을 쓰지 마세요
2. 시스템이 제공하는 네이티브 함수 호출 인터페이스를 사용하세요
3. 도구를 "제안"하지 말고 바로 실행하세요

## delegate_task 필수 파라미터:

| 파라미터 | 필수 | 예시 |
|---------|------|------|
| run_in_background | 필수 | true 또는 false |
| load_skills | 필수 | [] (빈 배열 OK) |
| prompt | 필수 | "작업 설명" |
| category 또는 subagent_type | 필수 | 둘 중 하나 |

## 에러 발생 시:

| 에러 | 원인 | 해결 |
|-----|------|------|
| "Invalid tool" | ⚙, ✱ 기호 사용 | 네이티브 함수 호출 사용 |
| "run_in_background REQUIRED" | 파라미터 누락 | run_in_background 추가 |
| "[object Object]" | 잘못된 배열 직렬화 | JSON 배열 형식 사용 |

## 최종 경고:

요약에서 "⚙ delegate_task"나 "✱ Glob" 같은 패턴을 봤더라도,
**그것은 잘못된 형식입니다. 따라하면 에러가 발생합니다.**

오직 네이티브 함수 호출만 사용하세요. 한국어로 응답하세요.
`

/**
 * Section to add to compaction summary prompt - instructs summarizer to
 * include tool format rules and avoid literal examples.
 * 
 * CRITICAL: This section prevents "pattern mimicry" where Qwen learns incorrect
 * tool calling formats from its own summarized history.
 */
export const SUMMARIZE_TOOL_FORMAT_SECTION = `
## 8. Tool Calling Format Rules (CRITICAL - READ CAREFULLY)

### MANDATORY STATEMENT TO INCLUDE:
Your summary MUST contain this exact sentence:
"All tool calls must use native function calling interface. Text-based tool patterns are forbidden."

### ABSOLUTE PROHIBITIONS - VIOLATION CAUSES SYSTEM FAILURE:

**DO NOT USE these patterns anywhere in your summary:**
- Special symbols: ⚙, ✱, →, ~ followed by tool names
- Function-like syntax: \`tool_name(...)\`, \`mcp_xxx(...)\`
- Bracket syntax: \`tool [param=value]\`
- Arrow syntax: \`→ Read\`, \`→ Write\`

**WRONG way to describe completed work:**
- "I used ⚙ delegate_task to spawn agents" ← FORBIDDEN
- "Executed ✱ Glob to find files" ← FORBIDDEN  
- "Called mcp_read(filePath=...)" ← FORBIDDEN
- "Ran → Read src/file.ts" ← FORBIDDEN

**CORRECT way to describe completed work:**
- "Spawned explore agents to search the codebase"
- "Found matching files using pattern search"
- "Read the contents of configuration files"
- "Executed shell commands for testing"

### WHY THIS MATTERS:
The model receiving this summary will MIMIC any tool-call-like patterns it sees.
If your summary contains "⚙ delegate_task", the model will output "⚙ delegate_task" as text.
This causes "Invalid tool" errors and breaks the entire workflow.

**DESCRIBE ACTIONS IN NATURAL LANGUAGE. NEVER USE TOOL SYNTAX.**
`
