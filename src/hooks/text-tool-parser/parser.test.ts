import { describe, it, expect } from "bun:test"
import { parseToolCalls, hasToolCalls, extractTextWithoutToolCalls } from "./parser"

describe("parseToolCalls", () => {
  it("parses a simple write tool call", () => {
    const text = `
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>/path/to/file.txt</filePath>
    <content>Hello World</content>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("write")
    expect(result[0].parameters.filePath).toBe("/path/to/file.txt")
    expect(result[0].parameters.content).toBe("Hello World")
  })

  it("parses multiple tool calls", () => {
    const text = `
First I'll write a file:
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>file1.txt</filePath>
    <content>Content 1</content>
  </parameters>
</tool_call>

Then I'll read it back:
<tool_call>
  <name>read</name>
  <parameters>
    <filePath>file1.txt</filePath>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("write")
    expect(result[1].name).toBe("read")
  })

  it("parses edit tool call with replaceAll", () => {
    const text = `
<tool_call>
  <name>edit</name>
  <parameters>
    <filePath>/path/to/file.txt</filePath>
    <oldString>old text</oldString>
    <newString>new text</newString>
    <replaceAll>true</replaceAll>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("edit")
    expect(result[0].parameters.replaceAll).toBe("true")
  })

  it("parses bash tool call", () => {
    const text = `
<tool_call>
  <name>bash</name>
  <parameters>
    <command>npm install express</command>
    <workdir>/project</workdir>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("bash")
    expect(result[0].parameters.command).toBe("npm install express")
    expect(result[0].parameters.workdir).toBe("/project")
  })

  it("decodes XML entities in content", () => {
    const text = `
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>test.html</filePath>
    <content>&lt;html&gt;&lt;body&gt;&amp;nbsp;&lt;/body&gt;&lt;/html&gt;</content>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].parameters.content).toBe("<html><body>&nbsp;</body></html>")
  })

  it("ignores unsupported tools", () => {
    const text = `
<tool_call>
  <name>unsupported_tool</name>
  <parameters>
    <foo>bar</foo>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(0)
  })

  it("ignores malformed tool calls", () => {
    const text = `
<tool_call>
  <parameters>
    <filePath>test.txt</filePath>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(0)
  })

  it("parses todowrite with JSON parameter", () => {
    const text = `
<tool_call>
  <name>todowrite</name>
  <parameters>
    <todos>[{"id":"1","content":"Task 1","status":"pending","priority":"high"}]</todos>
  </parameters>
</tool_call>
`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("todowrite")
    const todos = JSON.parse(result[0].parameters.todos)
    expect(todos).toHaveLength(1)
    expect(todos[0].content).toBe("Task 1")
  })
})

describe("hasToolCalls", () => {
  it("returns true when tool calls are present", () => {
    const text = `
Some text
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>test.txt</filePath>
    <content>hello</content>
  </parameters>
</tool_call>
More text
`
    expect(hasToolCalls(text)).toBe(true)
  })

  it("returns false when no tool calls are present", () => {
    const text = "Just some regular text without any tool calls"
    expect(hasToolCalls(text)).toBe(false)
  })
})

describe("extractTextWithoutToolCalls", () => {
  it("removes tool calls and returns remaining text", () => {
    const text = `
Before text
<tool_call>
  <name>write</name>
  <parameters>
    <filePath>test.txt</filePath>
    <content>hello</content>
  </parameters>
</tool_call>
After text
`
    const result = extractTextWithoutToolCalls(text)
    expect(result).toBe("Before text\n\nAfter text")
  })
})

describe("Qwen arrow read pattern", () => {
  it("parses arrow read with forward slashes", () => {
    const text = "→ Read src/views/Component.vue"
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("read")
    expect(result[0].parameters.filePath).toBe("src/views/Component.vue")
  })

  it("parses arrow read with Windows backslashes and normalizes to forward slashes", () => {
    const text = "→ Read src\\views\\pc\\individual\\products\\price\\PDO-ININT020102C.vue"
    const result = parseToolCalls(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("read")
    expect(result[0].parameters.filePath).toBe("src/views/pc/individual/products/price/PDO-ININT020102C.vue")
  })

  it("parses multiple arrow read calls", () => {
    const text = `→ Read src\\file1.vue
→ Read src\\file2.vue
→ Read src\\file3.vue`
    const result = parseToolCalls(text)
    expect(result).toHaveLength(3)
    expect(result[0].parameters.filePath).toBe("src/file1.vue")
    expect(result[1].parameters.filePath).toBe("src/file2.vue")
    expect(result[2].parameters.filePath).toBe("src/file3.vue")
  })

  it("hasToolCalls returns true for arrow read", () => {
    const text = "→ Read src/test.ts"
    expect(hasToolCalls(text)).toBe(true)
  })

  it("extractTextWithoutToolCalls removes arrow read", () => {
    const text = "Before\n→ Read src/test.ts\nAfter"
    const result = extractTextWithoutToolCalls(text)
    expect(result).toBe("Before\n\nAfter")
  })
})
