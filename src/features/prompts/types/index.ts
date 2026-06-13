export interface CreatePromptInput {
  name: string
  content: string
  category: string
  tags: string[]
}

export interface UpdatePromptInput extends Partial<CreatePromptInput> {
  id: string
}
