export type SimilarityLevel = 'high' | 'medium' | 'low'

export interface SimilarityResult {
  level: SimilarityLevel
  score: number
  matches: string[]
}

const HIGH_THRESHOLD = 0.7
const MEDIUM_THRESHOLD = 0.4

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
}

function bigrams(text: string): Set<string> {
  const tokens = Array.from(tokenize(text))
  const bg = new Set<string>()
  for (let i = 0; i < tokens.length - 1; i++) {
    bg.add(`${tokens[i]} ${tokens[i + 1]}`)
  }
  return bg
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)))
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  return intersection.size / union.size
}

export function calculateSimilarity(
  newContent: string,
  existingContents: string[],
): SimilarityResult {
  const newTokens = tokenize(newContent)
  const newBigrams = bigrams(newContent)
  let maxScore = 0
  let bestMatches: string[] = []

  for (const existing of existingContents) {
    const existingTokens = tokenize(existing)
    const existingBigrams = bigrams(existing)

    const wordSimilarity = jaccardSimilarity(newTokens, existingTokens)
    const bigramSimilarity = jaccardSimilarity(newBigrams, existingBigrams)
    const combined = wordSimilarity * 0.6 + bigramSimilarity * 0.4

    if (combined > maxScore) {
      maxScore = combined
      bestMatches = [existing]
    } else if (Math.abs(combined - maxScore) < 0.01) {
      bestMatches.push(existing)
    }
  }

  let level: SimilarityLevel
  if (maxScore >= HIGH_THRESHOLD) {
    level = 'high'
  } else if (maxScore >= MEDIUM_THRESHOLD) {
    level = 'medium'
  } else {
    level = 'low'
  }

  return { level, score: Math.round(maxScore * 100) / 100, matches: bestMatches }
}

export async function checkDuplicate(
  newContent: string,
  existingContents: string[],
): Promise<SimilarityResult> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return calculateSimilarity(newContent, existingContents)
}
