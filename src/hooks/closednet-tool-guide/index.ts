/**
 * Closed Network Tool Guide Hook
 * 
 * Injects tool usage guidance for models with native function calling
 * in closed network environments (Samsung Life).
 * 
 * Unlike text-tool-parser/tool-call-instruction-injector which use XML,
 * this hook provides guidance for models that support native tool calls.
 */

import type { PluginInput } from "@opencode-ai/plugin"

export const CLOSEDNET_TOOL_GUIDE = `
<Environment_And_Constraints>
## Closed Network Environment

### Network Restrictions
- This is a **closed network environment** - NO external internet access
- DO NOT use: webfetch, websearch, codesearch tools (they will fail)
- DO NOT assume access to public package registries (npm, pip, etc.)
- LLM calls go through internal HTTPS proxy endpoint only

### When You Need External Documentation
- Ask the user to provide the doc text or file dump
- Use the question tool to request specific information
- Never attempt to fetch URLs or browse the web

</Environment_And_Constraints>

<Tool_Usage_Policy>
## Tool Usage Rules

### Workflow Pattern
1. list/glob/grep → Discover codebase structure
2. read → Understand relevant files (ALWAYS before editing)
3. Plan → Think through the solution
4. edit/patch/write → Make changes
5. bash → Run tests/build/lint to verify

### Critical Rules
1. **ALWAYS read before edit** - Never edit a file you haven't read in this session
2. **Use native tool calls** - Never output tool-call JSON as plain text
3. **Handle failures gracefully** - If a tool fails 2-3 times, use question tool to ask the user
4. **Respect closed network** - Don't try to fetch external URLs
5. **Prefer minimal changes** - Use edit for targeted changes, avoid rewriting entire files

### Tool-Specific Notes

**bash** - REQUIRES description parameter (5-10 words explaining what the command does)
- Example: command="npm test", description="Runs all unit tests"

**edit** - Match oldString EXACTLY including whitespace/indentation
- If "found multiple times" error, add more context or use replaceAll: true

**read** - Max 2000 lines, 50KB per read
- Use offset/limit for pagination on large files

### Windows Path Rules (CRITICAL)

**ALWAYS use forward slash \`/\` for paths - Windows supports this and it avoids parsing issues.**

| Correct | Incorrect (backslash gets lost) |
|---------|--------------------------------|
| \`dir products/dcp-front/src\` | \`dir productsdcp-frontsrc\` |
| \`cd src/components\` | \`cd srccomponents\` |
| \`type config/settings.json\` | \`type configsettings.json\` |

**Why?** Backslash \`\\\` is an escape character in many contexts. When you write \`products\\dcp-front\`, the backslash may disappear, resulting in \`productsdcp-front\`.

**Solution:** Use forward slash \`/\` for ALL paths:
- \`dir products/dcp-front\` ✓
- \`cd packages/opencode/src\` ✓
- \`type src/index.ts\` ✓

</Tool_Usage_Policy>
`

export interface ClosednetToolGuideHook {
  "experimental.chat.system.transform": (
    input: { sessionID: string },
    output: { system: string[] }
  ) => Promise<void>
}

export interface ClosednetToolGuideConfig {
  enabled: boolean
}

export function createClosednetToolGuideHook(
  _ctx: PluginInput,
  config?: Partial<ClosednetToolGuideConfig>
): ClosednetToolGuideHook {
  const fullConfig: ClosednetToolGuideConfig = {
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
      output.system.push(CLOSEDNET_TOOL_GUIDE)
    },
  }
}

export type { ClosednetToolGuideConfig as Config }
