export function parseImprovedPrompt(rawOutput: string, originalPrompt: string): string {
  // Extract prompt from common AI reasoning patterns
  const patterns = [
    /New prompt:\s*`([^`]+)`/i,       // Matches: New prompt: `...`
    /Improved prompt:\s*(.+)/i,      // Matches: Improved prompt: ...
    /Final prompt:\s*(.+)/i,         // Matches: Final prompt: ...
    /Here\s*(?:is\s*)?the\s*(?:improved|enhanced)\s*prompt:\s*(.+)/i, // Matches: Here is the improved prompt: ...
  ]

  for (const pattern of patterns) {
    const match = rawOutput.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  // Fallback: return raw output if no pattern matched, but trim whitespace
  return rawOutput.trim() || originalPrompt
}