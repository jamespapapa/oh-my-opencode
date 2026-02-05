# TOOL USAGE GUIDE

## CRITICAL: TOOL CALL FORMAT (READ FIRST - VIOLATIONS CAUSE 'invalid' ERRORS)

**YOU MUST USE NATIVE FUNCTION CALLING. NEVER OUTPUT TOOL CALLS AS TEXT.**

### FORBIDDEN (causes "Model tried to call unavailable tool 'invalid'" error):
```
⚙ delegate_task [subagent_type=explore, ...]     ← WRONG: text output
✱ Glob "**/*.java"                                ← WRONG: text output
✱ Grep "pattern" in .                             ← WRONG: text output  
~ Updating todos...                               ← WRONG: text output
delegate_task(subagent_type="explore", ...)       ← WRONG: text output (not executed)
```

### CORRECT (native function call - system executes automatically):
Simply invoke the tool. The system handles execution. Do NOT write tool calls as text.

**WHY THIS MATTERS:**
- When you output `⚙ delegate_task [...]` as text, it is NOT executed
- The system tries to parse it, fails, and shows "invalid" tool error
- You MUST use the actual function calling interface, not text representation

**RULE: If you see yourself writing `⚙`, `✱`, `~`, or tool names followed by `[...]` or `(...)` as plain text, STOP. Use the native function call interface instead.**

---

## CRITICAL: WINDOWS PATH RULES

**ALWAYS use forward slashes `/` in file paths. NEVER use backslashes `\`.**

```
CORRECT: src/main/java/com/example/Service.java
WRONG:   src\main\java\com\example\Service.java
```

Backslashes cause path parsing failures (e.g., `srcmainjava` instead of `src/main/java`).

---

## TOOL QUICK REFERENCE

### File Operations
| Tool | Purpose | Example |
|------|---------|---------|
| `read` | Read file contents | `read(filePath="/path/to/file.java")` |
| `write` | Create/overwrite file | `write(filePath="/path/to/file.java", content="...")` |
| `edit` | Modify existing file | `edit(filePath="...", oldString="...", newString="...")` |
| `glob` | Find files by pattern | `glob(pattern="**/*.java")` |
| `grep` | Search file contents | `grep(pattern="class.*Service", include="*.java")` |

### Code Intelligence (LSP)
| Tool | Purpose | Example |
|------|---------|---------|
| `lsp_goto_definition` | Jump to symbol definition | `lsp_goto_definition(filePath="src/App.java", line=10, character=5)` |
| `lsp_find_references` | Find all usages | `lsp_find_references(filePath="src/App.java", line=10, character=5)` |
| `lsp_symbols` | List symbols in file/workspace | `lsp_symbols(filePath="src/App.java", scope="document")` |
| `lsp_diagnostics` | Get errors/warnings | `lsp_diagnostics(filePath="src/App.java")` |
| `lsp_rename` | Rename symbol across files | `lsp_rename(filePath="src/App.java", line=10, character=5, newName="newVar")` |

**NOTE: LSP tools use `filePath` parameter, NOT `file`.**

### Code Search (AST-Grep)
| Tool | Purpose |
|------|---------|
| `ast_grep_search` | AST-aware pattern search (25 languages) |
| `ast_grep_replace` | AST-aware code replacement |

### Task Management
| Tool | Purpose |
|------|---------|
| `todowrite` | Create/update task list |
| `todoread` | Read current tasks |

### Execution
| Tool | Purpose |
|------|---------|
| `bash` | Run shell commands |

---

## ANTI-PATTERNS (FORBIDDEN)

| Category | Forbidden | Use Instead |
|----------|-----------|-------------|
| Paths | Backslash `\` in paths | Forward slash `/` |
| **Windows CMD** | `dir /S /B` | `glob(pattern="**/*")` |
| **Windows CMD** | `dir /S /B *.java` | `glob(pattern="**/*.java")` |
| **Windows CMD** | `findstr` | `grep(pattern="...")` |
| **Windows CMD** | `type filename` | `read(filePath="...")` |
| Type Safety | `as any`, `@ts-ignore` | Fix the type error |
| Error Handling | Empty `catch {}` blocks | Handle or log errors |
| Testing | Deleting failing tests | Fix code, not tests |
| Verification | Trust "I'm done" | ALWAYS verify output |

**CRITICAL: This is Git Bash, NOT Windows CMD. Windows commands will fail with "No such file or directory".**

---

## WORKFLOW

1. **Understand** - Read relevant files before editing
2. **Plan** - Use `todowrite` for multi-step tasks
3. **Execute** - One step at a time
4. **Verify** - Run `lsp_diagnostics`, build, tests
5. **Complete** - Mark todos done only after verification
