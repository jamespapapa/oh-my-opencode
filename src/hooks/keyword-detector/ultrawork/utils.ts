/**
 * Agent/model detection utilities for ultrawork message routing.
 *
 * Routing logic:
 * 1. Planner agents (prometheus, plan) → planner.ts
 * 2. GPT 5.2 models → gpt5.2.ts
 * 3. Qwen/Internal models → qwen.ts
 * 4. Everything else (Claude, etc.) → default.ts
 */

export function isPlannerAgent(agentName?: string): boolean {
  if (!agentName) return false
  const lowerName = agentName.toLowerCase()
  return lowerName.includes("prometheus") || lowerName.includes("planner") || lowerName === "plan"
}

export function isGptModel(modelID?: string): boolean {
  if (!modelID) return false
  const lowerModel = modelID.toLowerCase()
  return lowerModel.includes("gpt")
}

export function isQwenModel(modelID?: string, providerID?: string): boolean {
  if (providerID?.toLowerCase() === "internal") return true
  if (!modelID) return false
  const lowerModel = modelID.toLowerCase()
  return lowerModel.includes("qwen")
}

export type UltraworkSource = "planner" | "gpt" | "qwen" | "default"

export function getUltraworkSource(agentName?: string, modelID?: string, providerID?: string): UltraworkSource {
  if (isPlannerAgent(agentName)) {
    return "planner"
  }

  if (isGptModel(modelID)) {
    return "gpt"
  }

  if (isQwenModel(modelID, providerID)) {
    return "qwen"
  }

  return "default"
}
