const ANTHROPIC_ACTUAL_LIMIT =
  process.env.ANTHROPIC_1M_CONTEXT === "true" ||
  process.env.VERTEX_ANTHROPIC_1M_CONTEXT === "true"
    ? 1_000_000
    : 200_000

// Internal provider (Qwen, GPT-OSS) context limit
// Qwen3-235b: actual context=65536, but we use conservative 50000 to avoid max_tokens errors
// 78% threshold = ~39,000 tokens trigger compaction
const INTERNAL_ACTUAL_LIMIT = parseInt(process.env.INTERNAL_CONTEXT_LIMIT ?? "50000", 10)

const PREEMPTIVE_COMPACTION_THRESHOLD = 0.78

// Supported providers for preemptive compaction
const SUPPORTED_PROVIDERS = new Set(["anthropic", "internal"])

interface AssistantMessageInfo {
  role: "assistant"
  providerID: string
  modelID?: string
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

interface MessageWrapper {
  info: { role: string } & Partial<AssistantMessageInfo>
}

type PluginInput = {
  client: {
    session: {
      messages: (...args: any[]) => any
      summarize: (...args: any[]) => any
    }
    tui: {
      showToast: (...args: any[]) => any
    }
  }
  directory: string
}

export function createPreemptiveCompactionHook(ctx: PluginInput) {
  const compactionInProgress = new Set<string>()
  const compactedSessions = new Set<string>()

  const toolExecuteAfter = async (
    input: { tool: string; sessionID: string; callID: string },
    _output: { title: string; output: string; metadata: unknown }
  ) => {
    const { sessionID } = input
    if (compactedSessions.has(sessionID) || compactionInProgress.has(sessionID)) return

    try {
      const response = await ctx.client.session.messages({
        path: { id: sessionID },
      })
      const payload = response as { data?: MessageWrapper[] } | MessageWrapper[]
      const messages = Array.isArray(payload) ? payload : (payload.data ?? [])
      const assistantMessages = messages
        .filter((m) => m.info.role === "assistant")
        .map((m) => m.info as AssistantMessageInfo)

      if (assistantMessages.length === 0) return

      const lastAssistant = assistantMessages[assistantMessages.length - 1]
      if (!SUPPORTED_PROVIDERS.has(lastAssistant.providerID)) return

      const contextLimit =
        lastAssistant.providerID === "anthropic" ? ANTHROPIC_ACTUAL_LIMIT : INTERNAL_ACTUAL_LIMIT

      const lastTokens = lastAssistant.tokens
      const totalInputTokens = (lastTokens?.input ?? 0) + (lastTokens?.cache?.read ?? 0)
      const usageRatio = totalInputTokens / contextLimit

      if (usageRatio < PREEMPTIVE_COMPACTION_THRESHOLD) return

      const modelID = lastAssistant.modelID ?? "default"

      compactionInProgress.add(sessionID)

      await ctx.client.session.summarize({
        path: { id: sessionID },
        body: { providerID: lastAssistant.providerID, modelID, auto: true } as never,
        query: { directory: ctx.directory },
      })

      compactedSessions.add(sessionID)
    } catch {
      // best-effort; do not disrupt tool execution
    } finally {
      compactionInProgress.delete(sessionID)
    }
  }

  const eventHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    if (event.type !== "session.deleted") return
    const props = event.properties as Record<string, unknown> | undefined
    const sessionInfo = props?.info as { id?: string } | undefined
    if (sessionInfo?.id) {
      compactionInProgress.delete(sessionInfo.id)
      compactedSessions.delete(sessionInfo.id)
    }
  }

  return {
    "tool.execute.after": toolExecuteAfter,
    event: eventHandler,
  }
}
