import { injectHookMessage } from "../../features/hook-message-injector"
import { log } from "../../shared/logger"
import { createSystemDirective, SystemDirectiveTypes } from "../../shared/system-directive"
import { 
  TOOL_FORMAT_GUIDANCE_COMPACT, 
  SUMMARIZE_TOOL_FORMAT_SECTION,
  POST_COMPACTION_TOOL_REMINDER 
} from "../../shared/qwen-tool-guidance"

export interface SummarizeContext {
  sessionID: string
  providerID: string
  modelID: string
  usageRatio: number
  directory: string
}

const SUMMARIZE_CONTEXT_PROMPT = `${createSystemDirective(SystemDirectiveTypes.COMPACTION_CONTEXT)}

**CRITICAL: You MUST generate the summary in English, regardless of the conversation language.**

**NOTE FOR AGENT RECEIVING THIS SUMMARY**: This summary is in English for technical consistency, but you MUST continue responding in Korean (한국어). Do not switch to English just because this context is in English.
${TOOL_FORMAT_GUIDANCE_COMPACT}
---

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

## 5. Active Working Context (For Seamless Continuation)
- **Files**: Paths of files currently being edited or frequently referenced
- **Code in Progress**: Key code snippets, function signatures, or data structures under active development
- **External References**: Documentation URLs, library APIs, or external resources being consulted
- **State & Variables**: Important variable names, configuration values, or runtime state relevant to ongoing work

## 6. MUST NOT Do (Critical Constraints)
- Things that were explicitly forbidden
- Approaches that failed and should not be retried
- User's explicit restrictions or preferences
- Anti-patterns identified during the session

## 7. Agent Verification State (Critical for Reviewers)
- **Current Agent**: What agent is running (momus, oracle, etc.)
- **Verification Progress**: Files already verified/validated
- **Pending Verifications**: Files still needing verification
- **Previous Rejections**: If reviewer agent, what was rejected and why
- **Acceptance Status**: Current state of review process

This section is CRITICAL for reviewer agents (momus, oracle) to maintain continuity.
${SUMMARIZE_TOOL_FORMAT_SECTION}
This context is critical for maintaining continuity after compaction.
`

interface SessionCompactedEvent {
  type: "session.compacted"
  properties: {
    sessionID: string
    directory?: string
  }
}

export interface CompactionContextInjectorHook {
  onSummarize: (ctx: SummarizeContext) => Promise<void>
  event: (input: { event: { type: string; properties: unknown } }) => Promise<void>
}

export function createCompactionContextInjector(): CompactionContextInjectorHook {
  return {
    onSummarize: async (ctx: SummarizeContext): Promise<void> => {
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
    },

    event: async (input): Promise<void> => {
      const { event } = input
      if (event.type !== "session.compacted") return

      const props = event.properties as SessionCompactedEvent["properties"]
      if (!props?.sessionID) return

      log("[compaction-context-injector] post-compaction reminder", { sessionID: props.sessionID })

      const success = injectHookMessage(props.sessionID, POST_COMPACTION_TOOL_REMINDER, {
        agent: "general",
        path: props.directory ? { cwd: props.directory } : undefined,
      })

      if (success) {
        log("[compaction-context-injector] post-compaction reminder injected", { sessionID: props.sessionID })
      } else {
        log("[compaction-context-injector] post-compaction reminder failed", { sessionID: props.sessionID })
      }
    },
  }
}
