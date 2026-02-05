import type { ParsedToolCall, SupportedToolName } from "./types"
import { SUPPORTED_TOOLS } from "./types"

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi
const NAME_REGEX = /<name>\s*([\s\S]*?)\s*<\/name>/i
const PARAMETERS_REGEX = /<parameters>\s*([\s\S]*?)\s*<\/parameters>/i
const PARAM_REGEX = /<(\w+)>([\s\S]*?)<\/\1>/gi

// Qwen outputs: ⚙ tool_name [key=value, ...]
const QWEN_GEAR_REGEX = /⚙\s*(\w+)\s*\[([^\]]*)\]/g
// Qwen outputs: ✱ Glob "pattern", ✱ Grep "pattern" in path, ✱ Read "path"
const QWEN_STAR_GLOB_REGEX = /✱\s*Glob\s*"([^"]+)"/gi
const QWEN_STAR_GREP_REGEX = /✱\s*Grep\s*"([^"]+)"\s+in\s+(\S+)/gi
const QWEN_STAR_READ_REGEX = /✱\s*Read\s*"([^"]+)"/gi
const QWEN_TILDE_REGEX = /~\s*([\w\s]+?)(?:\.\.\.|$)/gm
// Qwen outputs: mcp_question(questions=[...]) or tool_name(param=value)
const FUNCTION_CALL_REGEX = /\b(mcp_\w+|delegate_task|question|askuserquestion)\s*\(/gi

export function parseToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = []
  parseXmlToolCalls(text, results)
  parseQwenToolCalls(text, results)
  return results
}

function parseXmlToolCalls(text: string, results: ParsedToolCall[]): void {
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
}

function parseQwenToolCalls(text: string, results: ParsedToolCall[]): void {
  QWEN_GEAR_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  
  while ((match = QWEN_GEAR_REGEX.exec(text)) !== null) {
    const toolName = match[1].toLowerCase()
    const paramsStr = match[2]
    const raw = match[0]
    const normalizedName = normalizeToolName(toolName)
    
    if (!SUPPORTED_TOOLS.includes(normalizedName as SupportedToolName)) continue
    
    const parameters = parseQwenParams(paramsStr)
    results.push({ name: normalizedName, parameters, raw })
  }
  
  QWEN_STAR_GLOB_REGEX.lastIndex = 0
  while ((match = QWEN_STAR_GLOB_REGEX.exec(text)) !== null) {
    results.push({ 
      name: "glob", 
      parameters: { pattern: match[1] }, 
      raw: match[0] 
    })
  }
  
  QWEN_STAR_GREP_REGEX.lastIndex = 0
  while ((match = QWEN_STAR_GREP_REGEX.exec(text)) !== null) {
    results.push({ 
      name: "grep", 
      parameters: { pattern: match[1], path: match[2] === "." ? "" : match[2] }, 
      raw: match[0] 
    })
  }
  
  QWEN_STAR_READ_REGEX.lastIndex = 0
  while ((match = QWEN_STAR_READ_REGEX.exec(text)) !== null) {
    results.push({ 
      name: "read", 
      parameters: { filePath: match[1] }, 
      raw: match[0] 
    })
  }
  
  FUNCTION_CALL_REGEX.lastIndex = 0
  while ((match = FUNCTION_CALL_REGEX.exec(text)) !== null) {
    const toolName = match[1].toLowerCase()
    const normalizedName = normalizeToolName(toolName)
    results.push({ 
      name: normalizedName, 
      parameters: {}, 
      raw: match[0] 
    })
  }
}

function normalizeToolName(name: string): string {
  const mapping: Record<string, string> = {
    "delegate_task": "delegate_task",
    "delegatetask": "delegate_task",
    "lsp_diagnostics": "lsp_diagnostics",
    "lspdiagnostics": "lsp_diagnostics",
    "lsp_goto_definition": "lsp_goto_definition",
    "lsp_find_references": "lsp_find_references",
    "lsp_symbols": "lsp_symbols",
    "lsp_rename": "lsp_rename",
    "todowrite": "todowrite",
    "todo_write": "todowrite",
    "todoread": "todoread",
    "todo_read": "todoread",
    "mcp_question": "mcp_question",
    "question": "question",
    "askuserquestion": "askuserquestion",
    "background_output": "background_output",
    "backgroundoutput": "background_output",
    "mcp_background_output": "background_output",
    "background_cancel": "background_cancel",
    "backgroundcancel": "background_cancel",
    "mcp_background_cancel": "background_cancel",
  }
  return mapping[name] || name
}

function parseQwenParams(paramsStr: string): Record<string, string> {
  const params: Record<string, string> = {}
  const paramPattern = /(\w+)\s*=\s*/g
  const keys: { key: string; start: number }[] = []
  let m: RegExpExecArray | null
  
  while ((m = paramPattern.exec(paramsStr)) !== null) {
    keys.push({ key: m[1], start: m.index + m[0].length })
  }
  
  for (let i = 0; i < keys.length; i++) {
    const { key, start } = keys[i]
    const end = i < keys.length - 1 ? findValueEnd(paramsStr, start, keys[i + 1].key) : paramsStr.length
    let value = paramsStr.slice(start, end).trim()
    
    if (value.endsWith(",")) {
      value = value.slice(0, -1).trim()
    }
    
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    params[key] = value
  }
  
  return params
}

function findValueEnd(str: string, start: number, nextKey: string): number {
  const searchPattern = new RegExp(`,\\s*${nextKey}\\s*=`)
  const match = str.slice(start).match(searchPattern)
  if (match && match.index !== undefined) {
    return start + match.index
  }
  return str.length
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
  QWEN_GEAR_REGEX.lastIndex = 0
  QWEN_STAR_GLOB_REGEX.lastIndex = 0
  QWEN_STAR_GREP_REGEX.lastIndex = 0
  QWEN_STAR_READ_REGEX.lastIndex = 0
  FUNCTION_CALL_REGEX.lastIndex = 0
  
  return TOOL_CALL_REGEX.test(text) || 
         QWEN_GEAR_REGEX.test(text) ||
         QWEN_STAR_GLOB_REGEX.test(text) ||
         QWEN_STAR_GREP_REGEX.test(text) ||
         QWEN_STAR_READ_REGEX.test(text) ||
         FUNCTION_CALL_REGEX.test(text)
}

export function extractTextWithoutToolCalls(text: string): string {
  return text
    .replace(TOOL_CALL_REGEX, '')
    .replace(QWEN_GEAR_REGEX, '')
    .replace(QWEN_STAR_GLOB_REGEX, '')
    .replace(QWEN_STAR_GREP_REGEX, '')
    .replace(QWEN_STAR_READ_REGEX, '')
    .trim()
}
