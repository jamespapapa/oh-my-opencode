import type { PluginInput } from "@opencode-ai/plugin"
import type { TextToolParserConfig } from "./types"
import type { DelegateTaskToolOptions } from "../../tools/delegate-task/types"
import { parseToolCalls, hasToolCalls } from "./parser"
import { executeToolCall, formatToolResult, type TextToolExecutorContext } from "./executors"
import { SUBAGENT_TOOL_INSTRUCTIONS } from "./prompt"
import { TOOL_FORMAT_ERROR_FULL } from "../../shared/qwen-tool-guidance"

export interface TextToolParserOptions {
  delegateTaskOptions?: DelegateTaskToolOptions
}

interface TextToolParserContext {
  ctx: PluginInput
  config: TextToolParserConfig
  executorOptions: TextToolParserOptions
}

interface MessageInfo {
  id?: string
  role?: string
  sessionID?: string
  agent?: string
  summary?: boolean
}

interface EventProperties {
  info?: MessageInfo
}

interface TextPart {
  type: "text"
  text: string
}

interface MessagePart {
  type: string
  text?: string
}

export interface TextToolParserHook {
  event: (input: { event: { type: string; properties: unknown } }) => Promise<void>
  "experimental.chat.system.transform": (
    input: { sessionID: string },
    output: { system: string[] }
  ) => Promise<void>
}

export function createTextToolParserHook(
  ctx: PluginInput,
  config?: Partial<TextToolParserConfig>,
  executorOptions?: TextToolParserOptions
): TextToolParserHook {
  const fullConfig: TextToolParserConfig = {
    enabled: true,
    autoContinue: true,
    workdir: ctx.directory,
    ...config,
  }

  if (!fullConfig.enabled) {
    return {
      event: async () => {},
      "experimental.chat.system.transform": async () => {},
    }
  }

  const context: TextToolParserContext = { ctx, config: fullConfig, executorOptions: executorOptions ?? {} }
  const processedMessages = new Set<string>()

  return {
    event: async (input) => {
      const { event } = input
      const props = event.properties as EventProperties | undefined

      if (event.type !== "message.updated") return

      const info = props?.info
      if (!info?.sessionID || info.role !== "assistant" || !info.id) return

      if (info.agent === "compaction" || info.summary === true) return

      const messageKey = `${info.sessionID}:${info.id}`
      if (processedMessages.has(messageKey)) return

      await processAssistantMessage(context, info.sessionID, info.id, processedMessages, messageKey)
    },

    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(SUBAGENT_TOOL_INSTRUCTIONS)
    },
  }
}



async function processAssistantMessage(
  context: TextToolParserContext,
  sessionID: string,
  messageID: string,
  processedMessages: Set<string>,
  messageKey: string
): Promise<void> {
  const { ctx, config, executorOptions } = context

  try {
    const messagesResp = await ctx.client.session.messages({
      path: { id: sessionID },
      query: { directory: ctx.directory },
    })

    const messages = (messagesResp as { data?: Array<{ info?: MessageInfo; parts?: MessagePart[] }> }).data
    if (!messages) return

    const targetMessage = messages.find((m) => m.info?.id === messageID)
    if (!targetMessage?.parts) return

    const textParts = targetMessage.parts.filter((p): p is TextPart => p.type === "text" && !!p.text)
    const fullText = textParts.map((p) => p.text).join("\n")

    if (!hasToolCalls(fullText)) return

    processedMessages.add(messageKey)

    const toolCalls = parseToolCalls(fullText)
    if (toolCalls.length === 0) return

    await ctx.client.session.abort({ path: { id: sessionID } }).catch(() => {})

    const messageInfo = targetMessage.parts.find(p => p.type === "text") as { agent?: string } | undefined
    const agent = (targetMessage as { info?: { agent?: string } }).info?.agent

    const executorContext: TextToolExecutorContext = {
      delegateTaskOptions: executorOptions.delegateTaskOptions,
      sessionID,
      messageID,
      agent,
    }

    const apiOnlyTools: string[] = []
    const executableResults: string[] = []
    
    for (const toolCall of toolCalls) {
      if (config.allowedTools?.length && !config.allowedTools.includes(toolCall.name)) {
        executableResults.push(formatToolResult(toolCall, {
          success: false,
          output: "",
          error: `Tool "${toolCall.name}" is not allowed`,
        }))
        continue
      }

      const result = await executeToolCall(toolCall, config.workdir || ctx.directory, executorContext)
      
      if (result.isApiOnlyTool) {
        apiOnlyTools.push(toolCall.name)
      } else {
        executableResults.push(formatToolResult(toolCall, result))
      }
    }

    if (!config.autoContinue) return

    if (apiOnlyTools.length > 0) {
      const failedToolsList = [...new Set(apiOnlyTools)].join(", ")
      const errorPrompt = `${TOOL_FORMAT_ERROR_FULL}

실행 시도된 도구: ${failedToolsList}
결과: 모두 실패 - 아무것도 실행되지 않음

다시 시도하려면 네이티브 함수 호출을 사용하세요.`

      await ctx.client.session.prompt({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text: errorPrompt }] },
        query: { directory: ctx.directory },
      })
      return
    }

    if (executableResults.length > 0) {
      const continuePrompt = `[TOOL EXECUTION RESULTS]

The following tools were executed based on your previous instructions:

${executableResults.join("\n\n")}

Continue your work based on these results. If all tasks are complete, summarize what was done.
If there were errors, address them and retry if appropriate.`

      await ctx.client.session.prompt({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text: continuePrompt }] },
        query: { directory: ctx.directory },
      })
    }
  } catch (error) {
    console.error("[text-tool-parser] Error processing message:", error)
  }
}

export type { TextToolParserConfig }
