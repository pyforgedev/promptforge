import { generatePrompts, improvePrompt } from './src/features/generator/services/generatorService.js'
import type { AIConfig } from './src/features/settings/types/index.js'
import dotenv from 'dotenv'

dotenv.config()

const config: AIConfig = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  apiKey: process.env.GEMINI_API_KEY || '',
  endpoint: '',
}

async function test() {
  if (!config.apiKey) {
    console.log('Skipping real test: No GEMINI_API_KEY')
    return
  }

  console.log('Testing generatePrompts...')
  const prompts = await generatePrompts({
    count: 1,
    niche: 'technology',
    aspectRatio: '16:9',
    stylePreset: 'commercial-photography',
    customStyle: ''
  }, config)

  console.log('Generated:', prompts[0].content)
  console.log('Scores:', prompts[0].qualityScore)

  console.log('\nTesting improvePrompt...')
  const improved = await improvePrompt(
    prompts[0].content,
    {
      count: 1,
      niche: 'technology',
      aspectRatio: '16:9',
      stylePreset: 'commercial-photography',
      customStyle: ''
    },
    config
  )

  console.log('Improved:', improved.content)
  console.log('Scores:', improved.qualityScore)
}

test().catch(console.error)
