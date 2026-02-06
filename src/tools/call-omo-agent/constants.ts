export const ALLOWED_AGENTS = ["explore", "librarian"] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn explore/librarian agent.

Available: {agents}

- run_in_background: true=async (default), false=sync
- session_id: Continue previous agent with full context

Prompts MUST be in English. Use \`background_output\` for async results.`
