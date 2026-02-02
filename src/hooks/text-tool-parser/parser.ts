import type { ParsedToolCall, SupportedToolName } from "./types"
import { SUPPORTED_TOOLS } from "./types"

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi
const NAME_REGEX = /<name>\s*([\s\S]*?)\s*<\/name>/i
const PARAMETERS_REGEX = /<parameters>\s*([\s\S]*?)\s*<\/parameters>/i
const PARAM_REGEX = /<(\w+)>([\s\S]*?)<\/\1>/gi

export function parseToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = []
  
  let match: RegExpExecArray | null
  TOOL_CALL_REGEX.lastIndex = 0
  
  while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
    const toolCallContent = match[1]
    const raw = match[0]
    
    const nameMatch = toolCallContent.match(NAME_REGEX)
    if (!nameMatch) continue
    
    const name = nameMatch[1].trim().toLowerCase()
    
    if (!SUPPORTED_TOOLS.includes(name as SupportedToolName)) continue
    
    const parametersMatch = toolCallContent.match(PARAMETERS_REGEX)
    const parameters: Record<string, string> = {}
    
    if (parametersMatch) {
      const paramsContent = parametersMatch[1]
      let paramMatch: RegExpExecArray | null
      PARAM_REGEX.lastIndex = 0
      
      while ((paramMatch = PARAM_REGEX.exec(paramsContent)) !== null) {
        const paramName = paramMatch[1]
        const paramValue = paramMatch[2]
        parameters[paramName] = decodeXmlEntities(paramValue)
      }
    }
    
    results.push({ name, parameters, raw })
  }
  
  return results
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

export function encodeXmlEntities(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function hasToolCalls(text: string): boolean {
  TOOL_CALL_REGEX.lastIndex = 0
  return TOOL_CALL_REGEX.test(text)
}

export function extractTextWithoutToolCalls(text: string): string {
  return text.replace(TOOL_CALL_REGEX, '').trim()
}
