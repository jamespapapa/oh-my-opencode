import {
  KEYWORD_DETECTORS,
  CODE_BLOCK_PATTERN,
  INLINE_CODE_PATTERN,
} from "./constants"

export interface DetectedKeyword {
  type: "ultrawork" | "search" | "analyze"
  message: string
}

export function removeCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "")
}

function resolveMessage(
  message: string | ((agentName?: string, modelID?: string, providerID?: string) => string),
  agentName?: string,
  modelID?: string,
  providerID?: string
): string {
  return typeof message === "function" ? message(agentName, modelID, providerID) : message
}

export function detectKeywords(text: string, agentName?: string, modelID?: string, providerID?: string): string[] {
  const textWithoutCode = removeCodeBlocks(text)
  return KEYWORD_DETECTORS.filter(({ pattern }) =>
    pattern.test(textWithoutCode)
  ).map(({ message }) => resolveMessage(message, agentName, modelID, providerID))
}

export function detectKeywordsWithType(text: string, agentName?: string, modelID?: string, providerID?: string): DetectedKeyword[] {
  const textWithoutCode = removeCodeBlocks(text)
  const types: Array<"ultrawork" | "search" | "analyze"> = ["ultrawork", "search", "analyze"]
  return KEYWORD_DETECTORS.map(({ pattern, message }, index) => ({
    matches: pattern.test(textWithoutCode),
    type: types[index],
    message: resolveMessage(message, agentName, modelID, providerID),
  }))
    .filter((result) => result.matches)
    .map(({ type, message }) => ({ type, message }))
}

export function extractPromptText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join(" ")
}
