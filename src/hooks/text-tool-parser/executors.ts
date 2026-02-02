import { execSync, spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"
import type {
  ParsedToolCall,
  ToolExecutionResult,
  WriteParams,
  EditParams,
  ReadParams,
  BashParams,
  GlobParams,
  GrepParams,
  TodoWriteParams,
  TodoItem,
} from "./types"

export async function executeToolCall(
  toolCall: ParsedToolCall,
  workdir: string
): Promise<ToolExecutionResult> {
  const { name, parameters } = toolCall

  try {
    switch (name) {
      case "write":
        return executeWrite(parameters as unknown as WriteParams, workdir)
      case "edit":
        return executeEdit(parameters as unknown as EditParams, workdir)
      case "read":
        return executeRead(parameters as unknown as ReadParams, workdir)
      case "bash":
        return executeBash(parameters as unknown as BashParams, workdir)
      case "glob":
        return executeGlob(parameters as unknown as GlobParams, workdir)
      case "grep":
        return executeGrep(parameters as unknown as GrepParams, workdir)
      case "todowrite":
        return executeTodoWrite(parameters as unknown as TodoWriteParams)
      case "todoread":
        return executeTodoRead()
      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, output: "", error: errorMessage }
  }
}

function resolvePath(filePath: string, workdir: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath
  }
  return path.resolve(workdir, filePath)
}

function executeWrite(params: WriteParams, workdir: string): ToolExecutionResult {
  const { filePath, content } = params
  
  if (!filePath) {
    return { success: false, output: "", error: "filePath is required" }
  }
  if (content === undefined) {
    return { success: false, output: "", error: "content is required" }
  }

  const resolvedPath = resolvePath(filePath, workdir)
  const dir = path.dirname(resolvedPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(resolvedPath, content, "utf-8")
  
  return {
    success: true,
    output: `Successfully wrote ${content.length} bytes to ${resolvedPath}`,
  }
}

function executeEdit(params: EditParams, workdir: string): ToolExecutionResult {
  const { filePath, oldString, newString, replaceAll } = params
  
  if (!filePath) {
    return { success: false, output: "", error: "filePath is required" }
  }
  if (!oldString) {
    return { success: false, output: "", error: "oldString is required" }
  }
  if (newString === undefined) {
    return { success: false, output: "", error: "newString is required" }
  }

  const resolvedPath = resolvePath(filePath, workdir)

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, output: "", error: `File not found: ${resolvedPath}` }
  }

  const content = fs.readFileSync(resolvedPath, "utf-8")
  
  const occurrences = content.split(oldString).length - 1
  
  if (occurrences === 0) {
    return { success: false, output: "", error: "oldString not found in content" }
  }

  if (occurrences > 1 && replaceAll !== "true") {
    return {
      success: false,
      output: "",
      error: `oldString found ${occurrences} times. Use replaceAll="true" to replace all occurrences, or provide more context to make the match unique.`,
    }
  }

  const shouldReplaceAll = replaceAll === "true"
  let newContent: string
  
  if (shouldReplaceAll) {
    newContent = content.split(oldString).join(newString)
  } else {
    const index = content.indexOf(oldString)
    newContent = content.slice(0, index) + newString + content.slice(index + oldString.length)
  }

  fs.writeFileSync(resolvedPath, newContent, "utf-8")

  const replacedCount = shouldReplaceAll ? occurrences : 1
  return {
    success: true,
    output: `Successfully replaced ${replacedCount} occurrence(s) in ${resolvedPath}`,
  }
}

function executeRead(params: ReadParams, workdir: string): ToolExecutionResult {
  const { filePath, offset, limit } = params
  
  if (!filePath) {
    return { success: false, output: "", error: "filePath is required" }
  }

  const resolvedPath = resolvePath(filePath, workdir)

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, output: "", error: `File not found: ${resolvedPath}` }
  }

  const content = fs.readFileSync(resolvedPath, "utf-8")
  const lines = content.split("\n")
  
  const startLine = offset ? parseInt(offset, 10) : 0
  const lineLimit = limit ? parseInt(limit, 10) : 2000
  
  const selectedLines = lines.slice(startLine, startLine + lineLimit)
  
  const numberedLines = selectedLines.map((line, idx) => {
    const lineNum = String(startLine + idx + 1).padStart(5, " ")
    return `${lineNum}|\t${line}`
  })

  return {
    success: true,
    output: numberedLines.join("\n"),
  }
}

function executeBash(params: BashParams, defaultWorkdir: string): ToolExecutionResult {
  const { command, workdir, timeout } = params
  
  if (!command) {
    return { success: false, output: "", error: "command is required" }
  }

  const cwd = workdir || defaultWorkdir
  const timeoutMs = timeout ? parseInt(timeout, 10) : 120000

  try {
    const output = execSync(command, {
      cwd,
      timeout: timeoutMs,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
    })

    return { success: true, output: output.trim() }
  } catch (error) {
    const execError = error as { status?: number; stdout?: string; stderr?: string; message?: string }
    const stdout = execError.stdout || ""
    const stderr = execError.stderr || ""
    const exitCode = execError.status ?? 1

    return {
      success: false,
      output: stdout,
      error: `Exit code ${exitCode}: ${stderr || execError.message}`,
    }
  }
}

function executeGlob(params: GlobParams, workdir: string): ToolExecutionResult {
  const { pattern, path: searchPath } = params
  
  if (!pattern) {
    return { success: false, output: "", error: "pattern is required" }
  }

  const cwd = searchPath || workdir

  try {
    const files = findFilesGlob(pattern, cwd)
    return {
      success: true,
      output: files.length > 0 ? `Found ${files.length} file(s):\n${files.join("\n")}` : "No files found",
    }
  } catch (error) {
    return { success: false, output: "", error: String(error) }
  }
}

function findFilesGlob(pattern: string, cwd: string): string[] {
  const isWindows = process.platform === "win32"
  const command = isWindows 
    ? `dir /s /b "${pattern}" 2>nul`
    : `find . -name "${pattern}" -type f 2>/dev/null | head -100`

  try {
    const output = execSync(command, { cwd, encoding: "utf-8", timeout: 30000 })
    return output.trim().split("\n").filter(Boolean)
  } catch {
    return []
  }
}

function executeGrep(params: GrepParams, workdir: string): ToolExecutionResult {
  const { pattern, path: searchPath, include } = params
  
  if (!pattern) {
    return { success: false, output: "", error: "pattern is required" }
  }

  const cwd = searchPath || workdir

  try {
    const isWindows = process.platform === "win32"
    let command: string
    
    if (isWindows) {
      const includeArg = include ? `--include="${include}"` : ""
      command = `findstr /s /n /r "${pattern}" ${includeArg} *`
    } else {
      const includeArg = include ? `--include="${include}"` : ""
      command = `grep -rn "${pattern}" ${includeArg} . 2>/dev/null | head -100`
    }

    const output = execSync(command, { cwd, encoding: "utf-8", timeout: 60000 })
    return { success: true, output: output.trim() || "No matches found" }
  } catch (error) {
    const execError = error as { status?: number; stdout?: string }
    if (execError.status === 1 && !execError.stdout) {
      return { success: true, output: "No matches found" }
    }
    return { success: false, output: "", error: String(error) }
  }
}

let todoState: TodoItem[] = []

function executeTodoWrite(params: TodoWriteParams): ToolExecutionResult {
  const { todos } = params
  
  if (!todos) {
    return { success: false, output: "", error: "todos parameter is required" }
  }

  try {
    const parsed = JSON.parse(todos) as TodoItem[]
    todoState = parsed
    return {
      success: true,
      output: `Updated todo list with ${parsed.length} item(s):\n${formatTodos(parsed)}`,
    }
  } catch (error) {
    return { success: false, output: "", error: `Failed to parse todos JSON: ${error}` }
  }
}

function executeTodoRead(): ToolExecutionResult {
  if (todoState.length === 0) {
    return { success: true, output: "No todos in list" }
  }
  return { success: true, output: formatTodos(todoState) }
}

function formatTodos(todos: TodoItem[]): string {
  return todos.map((t, i) => {
    const statusIcon = {
      pending: "[ ]",
      in_progress: "[~]",
      completed: "[x]",
      cancelled: "[-]",
    }[t.status] || "[ ]"
    
    return `${i + 1}. ${statusIcon} [${t.priority}] ${t.content}`
  }).join("\n")
}

export function formatToolResult(toolCall: ParsedToolCall, result: ToolExecutionResult): string {
  const status = result.success ? "SUCCESS" : "FAILED"
  const output = result.output || "(no output)"
  const errorInfo = result.error ? `\nError: ${result.error}` : ""
  
  return `
<tool_result>
  <name>${toolCall.name}</name>
  <status>${status}</status>
  <output>${output}</output>${errorInfo}
</tool_result>
`.trim()
}
