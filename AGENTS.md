# SLI-MINIMAL KNOWLEDGE BASE

**Branch:** sli-minimal
**Base:** 1/14 fork (commit 325ce12)
**Target:** Samsung Life Insurance 폐쇄망 (Qwen3-235b)

## OVERVIEW

OpenCode 플러그인. 삼성생명 폐쇄망 환경에 최적화된 최소 설정.
- budgetTokens: 8000 (Qwen 호환)
- 한국어 응답 지시 포함
- 50K context window (preemptive-compaction)

## TOOL NAMES

| Tool | Description |
|------|-------------|
| `delegate_task` | 에이전트 위임 |
| `load_skills` | 스킬 파라미터 (배열) |

## AVAILABLE TOOLS

### Agent Delegation

```typescript
// delegate_task - 에이전트 위임
delegate_task({
  description: "작업 설명",
  prompt: "상세 프롬프트",
  category: "quick",        // 또는 subagent_type
  run_in_background: false, // 생략 시 false
  load_skills: []           // 생략 시 []
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
| `delegate_task` | 카테고리 기반 위임 |
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

### 올바른 사용법

```typescript
// 단순 작업 위임 (최소 파라미터)
delegate_task({
  description: "타입 에러 수정",
  prompt: "src/auth.ts 파일의 타입 에러를 수정해주세요.",
  category: "quick"
})

// 스킬과 함께 위임
delegate_task({
  description: "컴포넌트 리팩토링",
  prompt: "Button 컴포넌트를 리팩토링해주세요.",
  category: "visual-engineering",
  load_skills: ["frontend-ui-ux"]
})

// 특정 에이전트 직접 호출
delegate_task({
  description: "아키텍처 상담",
  prompt: "현재 인증 구조에 대해 조언해주세요.",
  subagent_type: "oracle"
})

// 백그라운드 탐색 (병렬)
delegate_task({
  description: "코드 탐색",
  prompt: "인증 관련 코드를 찾아주세요.",
  subagent_type: "explore",
  run_in_background: true
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

## ANTI-PATTERNS

- **budgetTokens 32000**: Qwen에서 작동 안 함 (8000 사용)

## PARAMETER DEFAULTS

| Parameter | Default | Description |
|-----------|---------|-------------|
| `run_in_background` | `false` | 동기 실행 |
| `load_skills` | `[]` | 스킬 없음 |

## NOTES

- **Build size**: 2.37 MB
- **Context window**: 50K (internal provider), 65K (Qwen)
- **Model**: Qwen3-235b
- **Environment**: 폐쇄망 (closed network)
