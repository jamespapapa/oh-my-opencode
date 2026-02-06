import type { SummarizeContext } from "../preemptive-compaction"
import { injectHookMessage } from "../../features/hook-message-injector"
import { log } from "../../shared/logger"

const SUMMARIZE_CONTEXT_PROMPT = `[COMPACTION CONTEXT INJECTION]

When summarizing this session, you MUST include the following sections in your summary:

## 1. User Requests (As-Is)
- List all original user requests exactly as they were stated
- Preserve the user's exact wording and intent

## 2. Final Goal
- What the user ultimately wanted to achieve
- The end result or deliverable expected

## 3. Work Completed
- What has been done so far
- Files created/modified
- Features implemented
- Problems solved

## 4. Remaining Tasks
- What still needs to be done
- Pending items from the original request
- Follow-up tasks identified during the work

## 5. MUST NOT Do (Critical Constraints)
- Things that were explicitly forbidden
- Approaches that failed and should not be retried
- User's explicit restrictions or preferences
- Anti-patterns identified during the session

This context is critical for maintaining continuity after compaction.

---
[POST-COMPACTION REMINDER - 컴팩션 후 필수 리마인드]

## Language Policy (언어 정책)
- 반드시 한국어로 응답할 것. ALWAYS respond in Korean.

## Agent Delegation (에이전트 위임)
- 혼자 작업하지 말고 서브에이전트 적극 활용
- explore: 코드베이스 탐색 (run_in_background=true로 병렬 실행)
- librarian: 문서/라이브러리 검색
- oracle: 아키텍처/디버깅 상담

## Tool Names (도구명)
- \`delegate_task\`: 에이전트 위임
- \`load_skills\` 파라미터: 스킬 배열
- 필수: \`run_in_background\`, \`load_skills\` (빈 배열이라도)

## Available Tools (사용 가능 도구)
| Category | Tools |
|----------|-------|
| Search | \`grep\`, \`glob\`, \`ast_grep_search\`, \`ast_grep_replace\` |
| LSP | \`lsp_diagnostics\`, \`lsp_goto_definition\`, \`lsp_find_references\`, \`lsp_symbols\`, \`lsp_hover\`, \`lsp_rename\`, \`lsp_prepare_rename\` |
| File | \`read\`, \`write\`, \`edit\`, \`batch\` |
| Agent | \`delegate_task\`, \`call_omo_agent\`, \`look_at\` |
| Session | \`session_list\`, \`session_read\`, \`session_search\`, \`session_info\` |
| Background | \`background_output\`, \`background_cancel\` |
| Skill | \`skill\`, \`skill_mcp\`, \`slashcommand\` |
| Terminal | \`interactive_bash\` |
`

export function createCompactionContextInjector() {
  return async (ctx: SummarizeContext): Promise<void> => {
    log("[compaction-context-injector] injecting context", { sessionID: ctx.sessionID })

    const success = injectHookMessage(ctx.sessionID, SUMMARIZE_CONTEXT_PROMPT, {
      agent: "general",
      model: { providerID: ctx.providerID, modelID: ctx.modelID },
      path: { cwd: ctx.directory },
    })

    if (success) {
      log("[compaction-context-injector] context injected", { sessionID: ctx.sessionID })
    } else {
      log("[compaction-context-injector] injection failed", { sessionID: ctx.sessionID })
    }
  }
}
