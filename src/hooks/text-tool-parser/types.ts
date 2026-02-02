/**
 * Text Tool Parser - Types
 * 
 * This module enables AI models without function calling support (like GPT-OSS)
 * to execute tools by parsing XML-formatted tool calls from text output.
 */

export interface ParsedToolCall {
  name: string
  parameters: Record<string, string>
  raw: string
}

export interface ToolExecutionResult {
  success: boolean
  output: string
  error?: string
}

export interface TextToolParserConfig {
  enabled: boolean
  /**
   * Tools that are allowed to be executed via text parsing.
   * If empty, all supported tools are enabled.
   */
  allowedTools?: string[]
  /**
   * Working directory for file operations
   */
  workdir?: string
  /**
   * Whether to auto-continue after tool execution
   */
  autoContinue?: boolean
}

/**
 * Supported tool names
 */
export type SupportedToolName = 
  | 'write'
  | 'edit' 
  | 'read'
  | 'bash'
  | 'glob'
  | 'grep'
  | 'todowrite'
  | 'todoread'

export const SUPPORTED_TOOLS: SupportedToolName[] = [
  'write',
  'edit',
  'read',
  'bash',
  'glob',
  'grep',
  'todowrite',
  'todoread',
]

/**
 * XML Tool Call Format Specification
 * 
 * Models should output tool calls in this exact format:
 * 
 * ```xml
 * <tool_call>
 *   <name>write</name>
 *   <parameters>
 *     <filePath>/path/to/file.txt</filePath>
 *     <content>file content here</content>
 *   </parameters>
 * </tool_call>
 * ```
 * 
 * Multiple tool calls can be made in sequence.
 * Each tool call will be executed and results injected back.
 */
export const TOOL_CALL_FORMAT = `
<tool_call>
  <name>TOOL_NAME</name>
  <parameters>
    <param1>value1</param1>
    <param2>value2</param2>
  </parameters>
</tool_call>
`.trim()

/**
 * Tool parameter specifications
 */
export interface WriteParams {
  filePath: string
  content: string
}

export interface EditParams {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: string
}

export interface ReadParams {
  filePath: string
  offset?: string
  limit?: string
}

export interface BashParams {
  command: string
  workdir?: string
  timeout?: string
}

export interface GlobParams {
  pattern: string
  path?: string
}

export interface GrepParams {
  pattern: string
  path?: string
  include?: string
}

export interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
}

export interface TodoWriteParams {
  todos: string
}
