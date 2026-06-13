import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '@/types'
import type { CreatePromptInput, UpdatePromptInput } from '@/features/prompts/types'
import {
  getPrompt as getStoredPrompt,
  getAllPrompts,
  savePrompt as storePrompt,
  deletePrompt as removePrompt,
} from '@/services/storage/indexeddb'

export async function createPrompt(
  data: CreatePromptInput,
): Promise<Prompt> {
  const prompts = await getAllPrompts()
  const nameHash = data.name.toLowerCase().trim()
  const existing = prompts.find(
    (p) => p.name.toLowerCase().trim() === nameHash,
  )
  if (existing) {
    throw new Error('A prompt with this name already exists')
  }

  const now = Date.now()
  const prompt: Prompt = {
    id: uuidv4(),
    name: data.name,
    content: data.content,
    category: data.category,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
  }

  await storePrompt(prompt)
  return prompt
}

export async function updatePrompt(
  input: UpdatePromptInput,
): Promise<Prompt> {
  const existing = await getStoredPrompt(input.id)
  if (!existing) {
    throw new Error('Prompt not found')
  }

  const updated: Prompt = {
    ...existing,
    ...input,
    id: existing.id,
    updatedAt: Date.now(),
  }

  await storePrompt(updated)
  return updated
}

export { getStoredPrompt as getPrompt, getAllPrompts, removePrompt as deletePrompt }
