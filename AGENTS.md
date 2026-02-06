# SLI-MINIMAL KNOWLEDGE BASE

**Branch:** sli-minimal
**Base:** 1/14 fork (commit 325ce12)
**Target:** Samsung Life Insurance 폐쇄망 (Qwen3-235b)

## OVERVIEW

OpenCode 플러그인. 삼성생명 폐쇄망 환경에 최적화된 최소 설정.
- budgetTokens: 8000 (Qwen 호환)
- 한국어 응답 지시 포함
- 50K context window (preemptive-compaction)

## CRITICAL: 1/14 TOOL NAMES

**이 버전은 upstream/dev와 도구 이름이 다름!**

| 1/14 (sli-minimal) | upstream/dev | 차이점 |
|-------------------|--------------|--------|
| `sisyphus_task` | `delegate_task` | 에이전트 위임 |
| `skills` parameter | `load_skills` parameter | 스킬 파라미터명 |
| 11 LSP tools | 6 LSP tools | LSP 도구 수 |

## AVAILABLE TOOLS

### Agent Delegation

```typescript
// sisyphus_task - 에이전트 위임 (delegate_task 아님!)
sisyphus_task({
  description: "작업 설명",
  prompt: "상세 프롬프트",
  category: "quick",        // 또는 subagent_type
  run_in_background: false, // 필수
  skills: []                // 필수 (load_skills 아님!)
})
```

**Categories:**
- `quick`: 단순 작업
- `visual-engineering`: 프론트엔드/UI
- `ultrabrain`: 복잡한 로직
- `deep`: 깊은 분석
- `artistry`: 창의적 접근
- `writing`: 문서 작성
- `unspecified-low`: 기타 (저노력)
- `unspecified-high`: 기타 (고노력)

### LSP Tools (11개)

| Tool | Description |
|------|-------------|
| `lsp_hover` | 심볼 타입/문서 조회 |
| `lsp_goto_definition` | 정의로 이동 |
| `lsp_find_references` | 참조 찾기 |
| `lsp_document_symbols` | 파일 심볼 목록 |
| `lsp_workspace_symbols` | 워크스페이스 심볼 검색 |
| `lsp_diagnostics` | 에러/경고 조회 |
| `lsp_servers` | LSP 서버 상태 |
| `lsp_prepare_rename` | 이름 변경 가능 여부 확인 |
| `lsp_rename` | 심볼 이름 변경 |
| `lsp_code_actions` | 퀵픽스/리팩토링 조회 |
| `lsp_code_action_resolve` | 코드 액션 실행 |

### AST-Grep Tools

| Tool | Description |
|------|-------------|
| `ast_grep_search` | AST 패턴 검색 |
| `ast_grep_replace` | AST 패턴 치환 |

### Search Tools

| Tool | Description |
|------|-------------|
| `grep` | 내용 검색 (정규식) |
| `glob` | 파일 패턴 검색 |

### Session Tools

| Tool | Description |
|------|-------------|
| `session_list` | 세션 목록 |
| `session_read` | 세션 메시지 읽기 |
| `session_search` | 세션 내 검색 |
| `session_info` | 세션 정보 |

### Background Tools

| Tool | Description |
|------|-------------|
| `background_output` | 백그라운드 작업 결과 |
| `background_cancel` | 백그라운드 작업 취소 |

### Agent Tools

| Tool | Description |
|------|-------------|
| `sisyphus_task` | 카테고리 기반 위임 |
| `call_omo_agent` | explore/librarian 에이전트 호출 |
| `look_at` | 멀티모달 분석 (PDF/이미지) |

### Skill Tools

| Tool | Description |
|------|-------------|
| `skill` | 스킬 로드 |
| `skill_mcp` | 스킬 내장 MCP 호출 |
| `slashcommand` | 슬래시 명령 실행 |

### Terminal

| Tool | Description |
|------|-------------|
| `interactive_bash` | tmux 세션 관리 |

## DELEGATION EXAMPLES

### 올바른 사용법 (1/14 버전)

```typescript
// 단순 작업 위임
sisyphus_task({
  description: "타입 에러 수정",
  prompt: "src/auth.ts 파일의 타입 에러를 수정해주세요.",
  category: "quick",
  run_in_background: false,
  skills: []  // 필수!
})

// 스킬과 함께 위임
sisyphus_task({
  description: "컴포넌트 리팩토링",
  prompt: "Button 컴포넌트를 리팩토링해주세요.",
  category: "visual-engineering",
  run_in_background: false,
  skills: ["frontend-ui-ux"]  // load_skills 아님!
})

// 특정 에이전트 직접 호출
sisyphus_task({
  description: "아키텍처 상담",
  prompt: "현재 인증 구조에 대해 조언해주세요.",
  subagent_type: "oracle",  // category 대신
  run_in_background: false,
  skills: []
})
```

### 잘못된 사용법 (upstream 문법)

```typescript
// ❌ WRONG - delegate_task는 없음!
delegate_task({
  category: "quick",
  load_skills: [],  // 잘못된 파라미터명
  ...
})

// ❌ WRONG - load_skills 아님!
sisyphus_task({
  ...
  load_skills: ["git-master"]  // skills로 해야 함
})
```

## AVAILABLE SKILLS

| Skill | Domain |
|-------|--------|
| `playwright` | 브라우저 자동화 |
| `frontend-ui-ux` | UI/UX 개발 |
| `git-master` | Git 작업 |
| `dev-browser` | 브라우저 자동화 (persistent) |

## COMMANDS

```bash
bun run typecheck      # 타입 체크
bun run build          # ESM + declarations + schema
bun run rebuild        # Clean + Build
bun test               # 테스트 실행
```

## SLI-MINIMAL CHANGES

1/14 원본에서 변경된 내용:

| File | Change |
|------|--------|
| `src/agents/korean-instruction.ts` | **NEW** - 한국어 응답 지시 |
| `src/agents/sisyphus.ts` | budgetTokens 8000, 한국어 지시 import |
| `src/agents/oracle.ts` | budgetTokens 8000 |
| `src/agents/metis.ts` | budgetTokens 8000 |
| `src/agents/momus.ts` | budgetTokens 8000 |
| `src/agents/sisyphus-junior.ts` | budgetTokens 8000 (2곳) |
| `src/agents/utils.test.ts` | 테스트 기대값 8000 |
| `src/hooks/preemptive-compaction/index.ts` | internal provider 지원 (50K context) |

## ANTI-PATTERNS

- **delegate_task 사용**: `sisyphus_task` 사용해야 함
- **load_skills 파라미터**: `skills` 사용해야 함
- **run_in_background 생략**: 필수 파라미터
- **skills 생략**: 필수 파라미터 (빈 배열이라도)
- **budgetTokens 32000**: Qwen에서 작동 안 함 (8000 사용)

## NOTES

- **Build size**: 2.37 MB
- **Context window**: 50K (internal provider)
- **Model**: Qwen3-235b
- **Environment**: 폐쇄망 (closed network)
