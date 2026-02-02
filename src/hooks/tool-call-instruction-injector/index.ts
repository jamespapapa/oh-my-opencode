/**
 * Tool Call Instruction Injector Hook
 * 
 * Injects XML tool call format instructions into system prompts
 * for models that don't support native function calling.
 * 
 * Used in conjunction with llm-tool-proxy to enable tool usage
 * on models like GPT-OSS in Samsung Life closed network.
 */

import type { PluginInput } from "@opencode-ai/plugin"

export const TOOL_CALL_INSTRUCTIONS = `
<Tool_Call_Instructions>
## Tool Execution via XML

Your runtime converts XML tool calls to native function calls. Output tools in this format:

\`\`\`xml
<tool_call>
  <name>TOOL_NAME</name>
  <parameters>
    <param1>value1</param1>
    <param2>value2</param2>
  </parameters>
</tool_call>
\`\`\`

### Available Tools

**write** - Create/overwrite file:
\`\`\`xml
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>/absolute/path/file.txt</filePath>
    <content>File content here</content>
  </parameters>
</tool_call>
\`\`\`

**edit** - Edit existing file:
\`\`\`xml
<tool_call>
  <name>edit</name>
  <parameters>
    <filePath>/path/file.txt</filePath>
    <oldString>text to find</oldString>
    <newString>replacement</newString>
    <replaceAll>false</replaceAll>
  </parameters>
</tool_call>
\`\`\`

**read** - Read file:
\`\`\`xml
<tool_call>
  <name>read</name>
  <parameters>
    <filePath>/path/file.txt</filePath>
  </parameters>
</tool_call>
\`\`\`

**bash** - Execute command:
\`\`\`xml
<tool_call>
  <name>bash</name>
  <parameters>
    <command>npm install</command>
    <workdir>/project/path</workdir>
  </parameters>
</tool_call>
\`\`\`

**glob** - Find files:
\`\`\`xml
<tool_call>
  <name>glob</name>
  <parameters>
    <pattern>*.ts</pattern>
    <path>/search/path</path>
  </parameters>
</tool_call>
\`\`\`

**grep** - Search contents:
\`\`\`xml
<tool_call>
  <name>grep</name>
  <parameters>
    <pattern>searchTerm</pattern>
    <path>/search/path</path>
    <include>*.ts</include>
  </parameters>
</tool_call>
\`\`\`

**todowrite** - Update tasks:
\`\`\`xml
<tool_call>
  <name>todowrite</name>
  <parameters>
    <todos>[{"id":"1","content":"Task","status":"pending","priority":"high"}]</todos>
  </parameters>
</tool_call>
\`\`\`

**todoread** - Read tasks:
\`\`\`xml
<tool_call>
  <name>todoread</name>
  <parameters></parameters>
</tool_call>
\`\`\`

### XML Escaping
Escape special characters in content: \`<\` → \`&lt;\`, \`>\` → \`&gt;\`, \`&\` → \`&amp;\`

### Rules
- ALWAYS use XML format for file operations
- Multiple tool calls per response are OK
- Tools execute automatically, results appear in next turn
</Tool_Call_Instructions>
`

export interface ToolCallInstructionInjectorHook {
  "experimental.chat.system.transform": (
    input: { sessionID: string },
    output: { system: string[] }
  ) => Promise<void>
}

export interface ToolCallInstructionInjectorConfig {
  enabled: boolean
}

export function createToolCallInstructionInjectorHook(
  _ctx: PluginInput,
  config?: Partial<ToolCallInstructionInjectorConfig>
): ToolCallInstructionInjectorHook {
  const fullConfig: ToolCallInstructionInjectorConfig = {
    enabled: true,
    ...config,
  }

  if (!fullConfig.enabled) {
    return {
      "experimental.chat.system.transform": async () => {},
    }
  }

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(TOOL_CALL_INSTRUCTIONS)
    },
  }
}
