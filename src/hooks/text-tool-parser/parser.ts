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
// Qwen outputs after compaction: → Read filepath (unquoted, may have Windows backslashes)
const QWEN_ARROW_READ_REGEX = /→\s*Read\s+([^\s\n]+)/gi
const QWEN_TILDE_REGEX = /~\s*([\w\s]+?)(?:\.\.\.|$)/gm
// Qwen outputs: mcp_question(questions=[...]) or tool_name(param=value)
const FUNCTION_CALL_NAMES = [
  "mcp_glob", "mcp_grep", "mcp_read", "mcp_write", "mcp_edit", "mcp_bash",
  "mcp_todowrite", "mcp_todoread", "mcp_question", "mcp_delegate_task",
  "mcp_background_output", "mcp_background_cancel",
  "mcp_lsp_diagnostics", "mcp_lsp_goto_definition", "mcp_lsp_find_references",
  "mcp_lsp_symbols", "mcp_lsp_rename",
  "delegate_task", "question", "askuserquestion"
]
const FUNCTION_CALL_REGEX = new RegExp(`\\b(${FUNCTION_CALL_NAMES.join("|")})\\s*\\(`, "gi")

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
  
  QWEN_ARROW_READ_REGEX.lastIndex = 0
  while ((match = QWEN_ARROW_READ_REGEX.exec(text)) !== null) {
    const rawPath = match[1]
    const normalizedPath = rawPath.replace(/\\/g, "/")
    results.push({ 
      name: "read", 
      parameters: { filePath: normalizedPath }, 
      raw: match[0] 
    })
  }
  
  FUNCTION_CALL_REGEX.lastIndex = 0
  while ((match = FUNCTION_CALL_REGEX.exec(text)) !== null) {
    const toolName = match[1].toLowerCase()
    const normalizedName = normalizeToolName(toolName)
    const startIndex = match.index
    const fullCall = extractFunctionCall(text, startIndex)
    if (fullCall) {
      const paramsStr = extractFunctionParams(fullCall)
      const parameters = parseFunctionCallParams(paramsStr)
      results.push({ 
        name: normalizedName, 
        parameters, 
        raw: fullCall 
      })
    }
  }
}

function normalizeToolName(name: string): string {
  const mapping: Record<string, string> = {
    "delegate_task": "delegate_task",
    "delegatetask": "delegate_task",
    "mcp_delegate_task": "delegate_task",
    "lsp_diagnostics": "lsp_diagnostics",
    "lspdiagnostics": "lsp_diagnostics",
    "mcp_lsp_diagnostics": "lsp_diagnostics",
    "lsp_goto_definition": "lsp_goto_definition",
    "mcp_lsp_goto_definition": "lsp_goto_definition",
    "lsp_find_references": "lsp_find_references",
    "mcp_lsp_find_references": "lsp_find_references",
    "lsp_symbols": "lsp_symbols",
    "mcp_lsp_symbols": "lsp_symbols",
    "lsp_rename": "lsp_rename",
    "mcp_lsp_rename": "lsp_rename",
    "todowrite": "todowrite",
    "todo_write": "todowrite",
    "mcp_todowrite": "todowrite",
    "todoread": "todoread",
    "todo_read": "todoread",
    "mcp_todoread": "todoread",
    "mcp_question": "mcp_question",
    "question": "question",
    "askuserquestion": "askuserquestion",
    "background_output": "background_output",
    "backgroundoutput": "background_output",
    "mcp_background_output": "background_output",
    "background_cancel": "background_cancel",
    "backgroundcancel": "background_cancel",
    "mcp_background_cancel": "background_cancel",
    "mcp_glob": "glob",
    "mcp_grep": "grep",
    "mcp_read": "read",
    "mcp_write": "write",
    "mcp_edit": "edit",
    "mcp_bash": "bash",
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

    if (key === "run_in_background") {
      const lower = value.toLowerCase()
      if (lower === "true" || lower === "false") {
        params[key] = lower
      } else {
        params[key] = value
      }
    } else if (key === "load_skills") {
      params[key] = value
    } else {
      params[key] = value
    }
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

function extractFunctionCall(text: string, startIndex: number): string | null {
  let depth = 0
  let inString = false
  let stringChar = ""
  let i = startIndex
  
  while (i < text.length && text[i] !== "(") i++
  if (i >= text.length) return null
  
  const callStart = startIndex
  for (; i < text.length; i++) {
    const char = text[i]
    
    if (inString) {
      if (char === stringChar && text[i - 1] !== "\\") {
        inString = false
      }
      continue
    }
    
    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      continue
    }
    
    if (char === "(") depth++
    if (char === ")") {
      depth--
      if (depth === 0) {
        return text.slice(callStart, i + 1)
      }
    }
  }
  return null
}

function extractFunctionParams(fullCall: string): string {
  const openParen = fullCall.indexOf("(")
  const closeParen = fullCall.lastIndexOf(")")
  if (openParen === -1 || closeParen === -1 || closeParen <= openParen) {
    return ""
  }
  return fullCall.slice(openParen + 1, closeParen)
}

function parseFunctionCallParams(paramsStr: string): Record<string, string> {
  if (!paramsStr.trim()) return {}
  
  const params: Record<string, string> = {}
  let i = 0
  
  while (i < paramsStr.length) {
    while (i < paramsStr.length && /\s/.test(paramsStr[i])) i++
    if (i >= paramsStr.length) break
    
    const keyStart = i
    while (i < paramsStr.length && /\w/.test(paramsStr[i])) i++
    const key = paramsStr.slice(keyStart, i)
    if (!key) break
    
    while (i < paramsStr.length && /\s/.test(paramsStr[i])) i++
    if (paramsStr[i] !== "=") break
    i++
    while (i < paramsStr.length && /\s/.test(paramsStr[i])) i++
    
    let value = ""
    if (paramsStr[i] === '"' || paramsStr[i] === "'") {
      const quote = paramsStr[i]
      i++
      const valueStart = i
      while (i < paramsStr.length && !(paramsStr[i] === quote && paramsStr[i - 1] !== "\\")) i++
      value = paramsStr.slice(valueStart, i)
      i++
    } else if (paramsStr[i] === "[" || paramsStr[i] === "{") {
      const openChar = paramsStr[i]
      const closeChar = openChar === "[" ? "]" : "}"
      let depth = 1
      const valueStart = i
      i++
      let inStr = false
      let strChar = ""
      while (i < paramsStr.length && depth > 0) {
        const ch = paramsStr[i]
        if (inStr) {
          if (ch === strChar && paramsStr[i - 1] !== "\\") inStr = false
        } else {
          if (ch === '"' || ch === "'") {
            inStr = true
            strChar = ch
          } else if (ch === "[" || ch === "{") {
            depth++
          } else if (ch === "]" || ch === "}") {
            depth--
          }
        }
        i++
      }
      value = paramsStr.slice(valueStart, i)
    } else {
      const valueStart = i
      while (i < paramsStr.length && paramsStr[i] !== "," && paramsStr[i] !== ")") i++
      value = paramsStr.slice(valueStart, i).trim()
    }
    
    params[key] = value
    
    while (i < paramsStr.length && /[\s,]/.test(paramsStr[i])) i++
  }
  
  return params
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
  QWEN_ARROW_READ_REGEX.lastIndex = 0
  FUNCTION_CALL_REGEX.lastIndex = 0
  
  return TOOL_CALL_REGEX.test(text) || 
         QWEN_GEAR_REGEX.test(text) ||
         QWEN_STAR_GLOB_REGEX.test(text) ||
         QWEN_STAR_GREP_REGEX.test(text) ||
         QWEN_STAR_READ_REGEX.test(text) ||
         QWEN_ARROW_READ_REGEX.test(text) ||
         FUNCTION_CALL_REGEX.test(text)
}

export function extractTextWithoutToolCalls(text: string): string {
  return text
    .replace(TOOL_CALL_REGEX, '')
    .replace(QWEN_GEAR_REGEX, '')
    .replace(QWEN_STAR_GLOB_REGEX, '')
    .replace(QWEN_STAR_GREP_REGEX, '')
    .replace(QWEN_STAR_READ_REGEX, '')
    .replace(QWEN_ARROW_READ_REGEX, '')
    .trim()
}
