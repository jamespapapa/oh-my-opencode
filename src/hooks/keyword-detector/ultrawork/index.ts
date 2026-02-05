/**
 * Ultrawork message module - routes to appropriate message based on agent/model.
 *
 * Routing:
 * 1. Planner agents (prometheus, plan) → planner.ts
 * 2. GPT 5.2 models → gpt5.2.ts
 * 3. Qwen/Internal models → qwen.ts
 * 4. Default (Claude, etc.) → default.ts (optimized for Claude series)
 */

export { isPlannerAgent, isGptModel, isQwenModel, getUltraworkSource } from "./utils"
export type { UltraworkSource } from "./utils"
export { ULTRAWORK_PLANNER_SECTION, getPlannerUltraworkMessage } from "./planner"
export { ULTRAWORK_GPT_MESSAGE, getGptUltraworkMessage } from "./gpt5.2"
export { getQwenUltraworkMessage } from "./qwen"
export { ULTRAWORK_DEFAULT_MESSAGE, getDefaultUltraworkMessage } from "./default"

import { getUltraworkSource } from "./utils"
import { getPlannerUltraworkMessage } from "./planner"
import { getGptUltraworkMessage } from "./gpt5.2"
import { getQwenUltraworkMessage } from "./qwen"
import { getDefaultUltraworkMessage } from "./default"

export function getUltraworkMessage(agentName?: string, modelID?: string, providerID?: string): string {
  const source = getUltraworkSource(agentName, modelID, providerID)

  switch (source) {
    case "planner":
      return getPlannerUltraworkMessage()
    case "gpt":
      return getGptUltraworkMessage()
    case "qwen":
      return getQwenUltraworkMessage()
    case "default":
    default:
      return getDefaultUltraworkMessage()
  }
}
