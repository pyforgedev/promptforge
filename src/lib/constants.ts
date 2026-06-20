export const AI_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
} as const

export const ALLOWED_PROTOCOLS = ['https:'] as const

export const DUPLICATE_CHECK_HISTORY_LIMIT = 30
// Threshold to determine if a generated prompt is too similar to an existing one.
// Calibrated based on Jaccard similarity of words (60%) and bigrams (40%).
// A value of 0.7 represents high similarity (e.g., matching most key terms and structure),
// while 0.4 is moderate. Adjust lower (e.g. 0.6) for stricter duplicate detection,
// or higher (e.g. 0.8) to allow more similar variations.
export const SIMILARITY_THRESHOLD = 0.7
