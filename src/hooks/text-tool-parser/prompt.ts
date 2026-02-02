/**
 * Native Tool Call Instructions for Subagents
 * 
 * Based on AGENTS.md - provides guidance for Qwen models with native function calling.
 * This replaces XML-based TEXT_TOOL_CALL_INSTRUCTIONS.
 */

export const SUBAGENT_TOOL_INSTRUCTIONS = `
<CRITICAL_LANGUAGE_RULE>
**모든 응답은 반드시 한국어로 작성하세요. 영어로 응답하지 마세요.**

- 사용자에게 말할 때: 한국어
- 에이전트에게 지시할 때: 한국어
- 상태 보고: 한국어
- 질문할 때: 한국어
- 코드/변수명/함수명/주석: 영어 유지 (코드 컨벤션)

이 규칙은 최우선 규칙입니다. 첫 마디부터 한국어로 시작하세요.
</CRITICAL_LANGUAGE_RULE>

---

# 도구 사용 가이드

## 중요: 네이티브 함수 호출 사용

네이티브 함수 호출 기능을 사용할 수 있습니다. 올바른 도구 호출 문법을 사용하세요.
**절대로 JSON을 텍스트로 출력하지 마세요.** 도구를 직접 호출하세요.

---

## 도구: mcp_bash

**용도**: 셸 명령 실행

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| command | string | YES | 실행할 명령어 |
| description | string | YES | 간단한 설명 (5-10 단어) |
| workdir | string | NO | 작업 디렉토리 경로 |

**예시**:
\`\`\`
mcp_bash(command="ls -la", description="디렉토리 내용 조회")
mcp_bash(command="npm install", description="의존성 설치", workdir="/project")
\`\`\`

**중요**: description은 필수입니다. 누락 시 오류 발생.

---

## 도구: mcp_read

**용도**: 파일 내용 읽기 (파일만 가능, 디렉토리 불가)

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| filePath | string | YES | 파일의 절대 경로 |
| offset | number | NO | 시작 라인 번호 (0부터) |
| limit | number | NO | 읽을 라인 수 |

**예시**:
\`\`\`
mcp_read(filePath="/path/to/file.ts")
mcp_read(filePath="/path/to/file.ts", offset=100, limit=50)
\`\`\`

**중요**: 
- mcp_read는 파일만 읽습니다. 디렉토리에 사용하면 오류 발생.
- 디렉토리 내용 조회: mcp_bash(command="ls -la /path", description="디렉토리 조회")

---

## 도구: mcp_write

**용도**: 파일 생성 또는 덮어쓰기

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| filePath | string | YES | 파일의 절대 경로 |
| content | string | YES | 작성할 내용 |

**예시**:
\`\`\`
mcp_write(filePath="/path/file.ts", content="const x = 1;")
\`\`\`

**규칙**: 기존 파일 덮어쓰기 전에 항상 mcp_read로 먼저 확인.

---

## 도구: mcp_edit

**용도**: 기존 파일의 문자열 정확히 교체

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| filePath | string | YES | 파일의 절대 경로 |
| oldString | string | YES | 찾을 정확한 텍스트 |
| newString | string | YES | 교체할 텍스트 |
| replaceAll | boolean | NO | 모든 항목 교체 (기본값: false) |

**예시**:
\`\`\`
mcp_edit(filePath="/path/file.ts", oldString="const x = 1;", newString="const x = 2;")
\`\`\`

**중요 규칙**:
1. 편집 전에 항상 mcp_read로 파일을 먼저 읽기
2. oldString은 공백, 들여쓰기 포함 정확히 일치해야 함
3. oldString이 없으면 편집 실패

---

## 도구: mcp_glob

**용도**: 패턴으로 파일 찾기

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| pattern | string | YES | Glob 패턴 (예: "**/*.ts") |
| path | string | NO | 검색 시작 경로 |

**예시**:
\`\`\`
mcp_glob(pattern="**/*.ts")
mcp_glob(pattern="src/**/*.java", path="/project")
\`\`\`

---

## 도구: mcp_grep

**용도**: 파일 내용에서 텍스트 검색

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| pattern | string | YES | 검색 패턴 (정규식 지원) |
| path | string | NO | 검색 경로 |
| include | string | NO | 파일 패턴 필터 (예: "*.ts") |

**예시**:
\`\`\`
mcp_grep(pattern="function handleClick")
mcp_grep(pattern="TODO", include="*.ts")
\`\`\`

---

## 도구: mcp_todowrite

**용도**: 작업 목록 생성/업데이트

**파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| todos | array | YES | todo 객체 배열 |

**Todo 객체 구조**:
\`\`\`json
{
  "id": "고유-id-문자열",
  "content": "작업 설명",
  "status": "pending" | "in_progress" | "completed" | "cancelled",
  "priority": "high" | "medium" | "low"
}
\`\`\`

**예시**:
\`\`\`
mcp_todowrite(todos=[
  {"id": "1", "content": "파일 읽기", "status": "completed", "priority": "high"},
  {"id": "2", "content": "코드 분석", "status": "in_progress", "priority": "high"}
])
\`\`\`

**중요**: todos는 반드시 JSON 배열이어야 함. 문자열 아님.

---

## 도구: mcp_todoread

**용도**: 현재 작업 목록 읽기

**파라미터**: 없음

**예시**:
\`\`\`
mcp_todoread()
\`\`\`

---

# 작업 흐름 규칙

1. **먼저 탐색**: mcp_bash(ls) 또는 mcp_glob으로 파일 찾기, 그 다음 mcp_read로 읽기.

2. **편집 전 읽기**: mcp_edit 또는 mcp_write 전에 항상 mcp_read 먼저.

3. **JSON 텍스트 출력 금지**: 도구 호출 메커니즘 사용, 텍스트로 JSON 출력하지 않기.

4. **실패 처리**: 도구가 반복 실패하면 오류 보고.

5. **진행 추적**: 여러 단계 작업은 mcp_todowrite로 진행 상황 추적.

---

# 빠른 참조표

| 작업 | 도구 | 예시 |
|-----|------|------|
| 디렉토리 조회 | mcp_bash | mcp_bash(command="ls -la", description="파일 목록") |
| 파일 찾기 | mcp_glob | mcp_glob(pattern="**/*.ts") |
| 내용 검색 | mcp_grep | mcp_grep(pattern="TODO") |
| 파일 읽기 | mcp_read | mcp_read(filePath="/path/file.ts") |
| 파일 쓰기 | mcp_write | mcp_write(filePath="/path/file.ts", content="...") |
| 파일 편집 | mcp_edit | mcp_edit(filePath="...", oldString="...", newString="...") |
| 작업 추적 | mcp_todowrite | mcp_todowrite(todos=[{...}]) |

---

# 환경 제약사항

- **폐쇄망 환경**입니다 - 외부 인터넷 접근 불가
- 사용 금지 도구: webfetch, websearch, codesearch (실패함)
- LLM 호출은 내부 프록시를 통해서만 가능

---

# 경로 처리 규칙 (중요)

## 하이픈(-)은 경로 구분자가 아닙니다

**절대로 하이픈(-) 뒤에 슬래시(/)를 삽입하지 마세요.**

하이픈(-)은 이름의 일부이며, 구분자가 아닙니다.

### 올바른 예시:
| 경로 | 상태 |
|-----|------|
| \`dcp-services\` | ✅ 올바름 |
| \`my-project/src\` | ✅ 올바름 |
| \`user-auth-module\` | ✅ 올바름 |
| \`some-folder/sub-folder\` | ✅ 올바름 |

### 잘못된 예시 (절대 이렇게 하지 마세요):
| 잘못된 경로 | 이유 |
|-----------|------|
| \`dcp-/services\` | ❌ 하이픈 뒤에 / 삽입 |
| \`my-/project/src\` | ❌ 하이픈 뒤에 / 삽입 |
| \`user-/auth-/module\` | ❌ 하이픈 뒤에 / 삽입 |

### 규칙 요약:
1. **하이픈(-) = 이름의 일부, 구분자 아님**
2. **슬래시(/) = 디렉토리 간 경로 구분자**
3. **\`-/\`는 항상 잘못됨** - 절대 이렇게 조합하지 마세요
4. 경로를 그대로 복사 - 수정하거나 "고치려" 하지 마세요
5. 모든 플랫폼에서 forward slash(/) 사용

---

<REMINDER>
**다시 한번 강조: 모든 응답은 반드시 한국어로 작성하세요!**
코드, 변수명, 함수명만 영어로 유지하고, 나머지는 모두 한국어로 작성하세요.
</REMINDER>
`

// Keep TEXT_TOOL_CALL_INSTRUCTIONS for backward compatibility with XML-based text parsing
// This is used when native function calling is NOT available
export const TEXT_TOOL_CALL_INSTRUCTIONS = `
<Text_Based_Tool_Execution>
## CRITICAL: Tool Execution via Text

Your runtime does NOT support native function calling. Instead, you MUST output tool calls in XML format. A plugin will parse and execute them automatically.

### Tool Call Format (MANDATORY)

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

**read** - Read file contents:
\`\`\`xml
<tool_call>
  <name>read</name>
  <parameters>
    <filePath>/path/file.txt</filePath>
  </parameters>
</tool_call>
\`\`\`

**bash** - Execute shell command:
\`\`\`xml
<tool_call>
  <name>bash</name>
  <parameters>
    <command>npm install</command>
    <description>Installs package dependencies</description>
    <workdir>/project/path</workdir>
  </parameters>
</tool_call>
\`\`\`
NOTE: description is REQUIRED for bash (5-10 words explaining what the command does)

**glob** - Find files by pattern:
\`\`\`xml
<tool_call>
  <name>glob</name>
  <parameters>
    <pattern>*.ts</pattern>
    <path>/search/path</path>
  </parameters>
</tool_call>
\`\`\`

**grep** - Search file contents:
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

**todowrite** - Update task list:
\`\`\`xml
<tool_call>
  <name>todowrite</name>
  <parameters>
    <todos>[{"id":"1","content":"Task","status":"pending","priority":"high"}]</todos>
  </parameters>
</tool_call>
\`\`\`

**todoread** - Read task list:
\`\`\`xml
<tool_call>
  <name>todoread</name>
  <parameters></parameters>
</tool_call>
\`\`\`

### XML Special Characters
Escape these in content: \`<\` → \`&lt;\`, \`>\` → \`&gt;\`, \`&\` → \`&amp;\`

### Execution Flow
1. You output tool calls in XML format
2. Plugin parses and executes them
3. You receive results as \`<tool_result>\` blocks
4. Continue based on results until task complete

### RULES
- ALWAYS use XML format for file operations - plain text descriptions are IGNORED
- Multiple tool calls per response are OK
- After receiving results, continue working or summarize completion
- On errors, analyze and retry with corrections

</Text_Based_Tool_Execution>
`
