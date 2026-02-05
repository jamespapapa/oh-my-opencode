# Samsung Life Closed Network - Local Changes Changelog

**Base Branch**: `origin/dev` (commit: `4923956`)  
**Last Updated**: 2026-02-03  
**Environment**: Samsung Life 폐쇄망, Windows, Qwen3-235b (internal provider)

---

## Overview

이 문서는 삼성생명 폐쇄망 배포를 위해 `origin/dev` 대비 로컬에서 수정된 내용을 기록합니다.  
향후 upstream 머지 시 이 문서를 참고하여 충돌을 해결하세요.

---

## Changed Files Summary

| File | Status | Description |
|------|--------|-------------|
| `src/agents/korean-instruction.ts` | **NEW** | 한국어 응답 지시 상수 분리 (순환 의존성 방지) |
| `src/agents/sisyphus.ts` | MODIFIED | 한국어 지시 import 및 프롬프트에 추가 |
| `src/agents/utils.ts` | MODIFIED | korean-instruction에서 re-export |
| `src/agents/AGENTS.md` | MODIFIED | korean-instruction.ts 파일 추가 문서화 |
| `src/hooks/preemptive-compaction.ts` | MODIFIED | Internal provider 지원 추가 (Qwen 57K context) |
| `src/hooks/compaction-context-injector/index.ts` | MODIFIED | 영어 요약 + 한국어 응답 유지 지시 |
| `src/hooks/keyword-detector/ultrawork/qwen.ts` | **NEW** | Qwen 전용 ultrawork 메시지 (delegate_task 강조) |
| `src/hooks/keyword-detector/ultrawork/utils.ts` | MODIFIED | Qwen/Internal provider 감지 추가 |
| `src/hooks/keyword-detector/ultrawork/index.ts` | MODIFIED | Qwen 라우팅 추가 |
| `src/hooks/keyword-detector/constants.ts` | MODIFIED | KeywordDetector 타입에 providerID 추가 |
| `src/hooks/keyword-detector/detector.ts` | MODIFIED | providerID 전달 로직 추가 |
| `src/hooks/keyword-detector/index.ts` | MODIFIED | providerID 추출 및 전달 |
| `src/tools/delegate-task/tools.ts` | MODIFIED | `load_skills` 파라미터 optional로 변경 |
| `src/tools/delegate-task/types.ts` | MODIFIED | `load_skills` 타입 optional로 변경 |
| `src/tools/delegate-task/executor.ts` | MODIFIED | optional chaining 추가 |
| `src/tools/delegate-task/tools.test.ts` | MODIFIED | 테스트 업데이트 |
| `src/agents/metis.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `src/agents/momus.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `src/agents/oracle.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `src/agents/sisyphus.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `src/agents/sisyphus-junior.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `src/agents/hephaestus.ts` | MODIFIED | maxTokens: 32000 → 16000 |
| `src/hooks/think-mode/switcher.ts` | MODIFIED | budgetTokens: 32000 → 16000 |
| `AGENTS.md` (root) | MODIFIED | SLI용 간소화 (157줄 → 73줄) |

---

## Detailed Changes

### 1. Korean Response Instruction (NEW FILE)

**File**: `src/agents/korean-instruction.ts`

**Purpose**: Sisyphus 에이전트가 `buildAgent()`를 거치지 않아 한국어 지시가 누락되는 문제 해결. 순환 의존성을 방지하기 위해 별도 파일로 분리.

```typescript
export const KOREAN_RESPONSE_INSTRUCTION = `<CRITICAL_LANGUAGE_RULE>
**모든 응답은 반드시 한국어로 작성하세요. 영어로 응답하지 마세요.**
...
</CRITICAL_LANGUAGE_RULE>
`

export function getKoreanInstruction(): string {
  return KOREAN_RESPONSE_INSTRUCTION
}
```

**Merge Note**: 이 파일은 새 파일이므로 충돌 없음. 단, upstream에서 한국어 지시 로직이 변경되었다면 통합 필요.

---

### 2. Sisyphus Agent Korean Support

**File**: `src/agents/sisyphus.ts`

**Changes**:
```diff
+ import { getKoreanInstruction } from "./korean-instruction"
  
  // In prompt building section:
- const prompt = basePrompt
+ const prompt = getKoreanInstruction() + basePrompt
```

**Merge Note**: `basePrompt` 변수가 변경되었거나 프롬프트 구성 로직이 바뀌었다면 수동 통합 필요.

---

### 3. Utils Re-export

**File**: `src/agents/utils.ts`

**Changes**:
```diff
+ import { getKoreanInstruction, KOREAN_RESPONSE_INSTRUCTION } from "./korean-instruction"
+ export { getKoreanInstruction, KOREAN_RESPONSE_INSTRUCTION }
```

**Merge Note**: 기존 `KOREAN_RESPONSE_INSTRUCTION` 상수가 utils.ts에 직접 정의되어 있었다면 제거하고 import로 대체.

---

### 4. Agents AGENTS.md Documentation Update

**File**: `src/agents/AGENTS.md`

**Changes**:
```diff
  ├── momus.ts                    # Plan reviewer (Ruthless fault-finding)
  ├── dynamic-agent-prompt-builder.ts  # Dynamic prompt generation
+ ├── korean-instruction.ts       # Korean response instruction (SLI closed network)
  ├── types.ts                    # AgentModelConfig, AgentPromptMetadata
```

**Merge Note**: STRUCTURE 섹션의 파일 목록에 새 파일이 추가됨. upstream 머지 시 이 라인이 충돌할 수 있음.

---

### 5. Preemptive Compaction - Internal Provider Support

**File**: `src/hooks/preemptive-compaction.ts`

**Changes**:
```diff
+ const INTERNAL_ACTUAL_LIMIT = parseInt(process.env.INTERNAL_CONTEXT_LIMIT ?? "50000", 10)
+ const SUPPORTED_PROVIDERS = new Set(["anthropic", "internal"])

  // In provider check:
- if (lastAssistant.providerID !== "anthropic") return
+ if (!SUPPORTED_PROVIDERS.has(lastAssistant.providerID)) return

  // In context limit calculation:
- const contextLimit = ANTHROPIC_ACTUAL_LIMIT
+ const contextLimit = lastAssistant.providerID === "anthropic" 
+   ? ANTHROPIC_ACTUAL_LIMIT 
+   : INTERNAL_ACTUAL_LIMIT
```

**Environment Variable**: `INTERNAL_CONTEXT_LIMIT` (default: 57344)

**Qwen3-235b Token Limits**:
- `max_tokens`: 57344 (총 컨텍스트 윈도우) ← compaction에서 사용
- `max_req_tokens`: 28672 (단일 응답 최대 토큰)

**Compaction Trigger Point**: 57344 × 0.78 = 44,728 tokens

**Merge Note**: upstream에서 preemptive-compaction 로직이 변경되었다면, `internal` provider 지원 로직을 다시 추가해야 함.

---

### 6. Compaction Context Injector - Korean Response Continuation

**File**: `src/hooks/compaction-context-injector/index.ts`

**Changes** (in `SUMMARIZE_CONTEXT_PROMPT`):
```diff
+ **CRITICAL: You MUST generate the summary in English, regardless of the conversation language.**
+ 
+ **NOTE FOR AGENT RECEIVING THIS SUMMARY**: This summary is in English for technical consistency, but you MUST continue responding in Korean (한국어). Do not switch to English just because this context is in English.
```

**Purpose**: Compaction(요약)은 영어로 생성하되, 이후 에이전트가 영어 요약을 받아도 한국어로 계속 응답하도록 지시.

**Merge Note**: `SUMMARIZE_CONTEXT_PROMPT` 상수가 변경되었다면 이 지시문을 다시 추가해야 함.

---

### 7. delegate_task - load_skills Optional

**Files**: 
- `src/tools/delegate-task/tools.ts`
- `src/tools/delegate-task/types.ts`
- `src/tools/delegate-task/executor.ts`
- `src/tools/delegate-task/tools.test.ts`

**Problem**: Qwen 모델이 `load_skills` 파라미터를 자주 누락하여 에러 발생

**Solution**: `load_skills`를 required에서 optional로 변경, 기본값 `[]` 적용

**Changes in tools.ts**:
```diff
  // Description
- - load_skills: ALWAYS REQUIRED. Pass at least one skill name...
+ - load_skills: Optional but HIGHLY RECOMMENDED. Pass skill names... Defaults to [] if omitted.

  // Schema
- load_skills: tool.schema.array(tool.schema.string()).describe("...")
+ load_skills: tool.schema.array(tool.schema.string()).optional().describe("...")

  // Validation (REMOVED)
- if (args.load_skills === undefined) {
-   throw new Error(`Invalid arguments: 'load_skills' parameter is REQUIRED...`)
- }
- if (args.load_skills === null) {
-   throw new Error(`Invalid arguments: load_skills=null is not allowed...`)
- }

  // Default value applied
+ const loadSkills = args.load_skills ?? []
```

**Changes in types.ts**:
```diff
- load_skills: string[]
+ load_skills?: string[]
```

**Changes in executor.ts**:
```diff
- skills: args.load_skills.length > 0 ? args.load_skills : undefined,
+ skills: (args.load_skills?.length ?? 0) > 0 ? args.load_skills : undefined,
```

**Merge Note**: upstream에서 `delegate_task` 도구가 변경되었다면:
1. `load_skills` 스키마가 optional인지 확인
2. 기본값 `[]` 적용 로직 확인
3. executor에서 optional chaining 사용 확인

---

### 8. Qwen-specific Ultrawork Message (NEW FILE)

**Files**: 
- `src/hooks/keyword-detector/ultrawork/qwen.ts` (NEW)
- `src/hooks/keyword-detector/ultrawork/utils.ts`
- `src/hooks/keyword-detector/ultrawork/index.ts`
- `src/hooks/keyword-detector/constants.ts`
- `src/hooks/keyword-detector/detector.ts`
- `src/hooks/keyword-detector/index.ts`

**Problem**: Ultrawork 모드에서 Qwen이 delegate_task를 호출하지 않고 직접 작업하는 문제

**Solution**: 
1. Qwen/Internal provider 전용 ultrawork 메시지 추가 (`qwen.ts`)
2. provider 감지 로직 추가 (`isQwenModel`)
3. providerID를 keyword-detector 전체에 전달하도록 수정

**Key Features in Qwen Ultrawork Message**:
- Windows 경로 규칙 강조 (슬래시 `/` 사용 필수)
- delegate_task 호출 예시 및 필수 파라미터 체크리스트
- 한국어 지시 포함
- 더 직접적이고 명령적인 스타일 (Qwen 최적화)

**Changes in utils.ts**:
```typescript
export function isQwenModel(modelID?: string, providerID?: string): boolean {
  if (providerID?.toLowerCase() === "internal") return true
  if (!modelID) return false
  return modelID.toLowerCase().includes("qwen")
}

export type UltraworkSource = "planner" | "gpt" | "qwen" | "default"

export function getUltraworkSource(agentName?: string, modelID?: string, providerID?: string): UltraworkSource {
  if (isPlannerAgent(agentName)) return "planner"
  if (isGptModel(modelID)) return "gpt"
  if (isQwenModel(modelID, providerID)) return "qwen"
  return "default"
}
```

**Merge Note**: upstream에서 ultrawork 모듈이 변경되었다면:
1. `qwen.ts` 파일 추가
2. `utils.ts`에 `isQwenModel` 함수 및 "qwen" source 추가
3. `index.ts`에 Qwen 라우팅 추가
4. `detector.ts`, `constants.ts`, `index.ts`에 providerID 전달 로직 추가

---

## Configuration Files (Not in git, but in deployment)

### opencode.json
```json
{
  "provider": {
    "internal": {
      "name": "Qwen3-235b",
      "context": 1280000
    }
  },
  "model": "internal/Qwen3-235b"
}
```

### oh-my-opencode.json
- `disabled_hooks`: 폐쇄망에서 불필요한 훅 비활성화
- `agents`: 에이전트 설정

---

## Merge Strategy

### When merging upstream:

1. **Check for conflicts** in these files:
   - `src/agents/sisyphus.ts` - 프롬프트 구성 로직
   - `src/hooks/preemptive-compaction.ts` - provider 체크 로직
   - `src/tools/delegate-task/tools.ts` - load_skills 관련 로직

2. **Re-apply these features** if overwritten:
   - Korean instruction injection in Sisyphus
   - Internal provider support in preemptive-compaction
   - load_skills optional parameter

3. **Test after merge**:
   ```bash
   bun run typecheck
   bun test src/tools/delegate-task/tools.test.ts
   bun test src/hooks/delegate-task-retry
   bun run build
   ```

---

## Build & Deploy Commands

```bash
# Build
cd /Users/jules/Desktop/work/opencode-sli/oh-my-opencode
bun run build

# Copy to deployment
cp dist/index.js /Users/jules/Desktop/work/sli-Claude/

# Update source code
rm -rf /Users/jules/Desktop/work/sli-Claude/oh-my-opencode-src
mkdir -p /Users/jules/Desktop/work/sli-Claude/oh-my-opencode-src
cp -r src /Users/jules/Desktop/work/sli-Claude/oh-my-opencode-src/
cp package.json tsconfig.json SLI-CHANGELOG.md /Users/jules/Desktop/work/sli-Claude/oh-my-opencode-src/

# Create zip
cd /Users/jules/Desktop/work
rm -f sli-Claude-latest.zip
zip -r sli-Claude-latest.zip sli-Claude \
  -x "*.git*" -x "*node_modules*" -x "*.DS_Store" \
  -x "*/dist/*" -x "*/.opencode/*" -x "*.lockb" -x "*/packages/*"
```

---

## Contact

문제 발생 시 이 문서와 함께 git diff 결과를 첨부하여 문의하세요.
