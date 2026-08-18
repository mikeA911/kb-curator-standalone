import 'server-only'

// LLM "JSON mode" output isn't always strictly valid JSON in practice --
// observed live: Gemini (gemini-3.5-flash, responseMimeType: 'application/json')
// returning an otherwise-correct object followed by a stray extra `}`, which
// makes a plain JSON.parse(raw) throw even though the actual data is fine.
// This extracts the first balanced {...} object (brace-depth counting that
// respects string literals/escapes) and ignores anything before or after it,
// rather than trusting the provider to emit exactly one JSON value and
// nothing else.
export function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{')
  if (start === -1) {
    throw new SyntaxError(`No JSON object found in: ${raw}`)
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i++) {
    const char = raw[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(raw.slice(start, i + 1))
      }
    }
  }

  throw new SyntaxError(`Unbalanced JSON object in: ${raw}`)
}

// Tool-call arguments come back from a provider as a JSON-encoded string
// (OpenAI/Groq's ChatCompletionMessageToolCall.function.arguments) -- an
// empty string means "no arguments", not malformed JSON, which a bare
// extractJsonObject call would otherwise throw on.
export function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  return extractJsonObject(raw) as Record<string, unknown>
}
