import { z } from 'zod'

export const promptFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string().min(1).max(50)).max(10),
})

export type PromptFormData = z.infer<typeof promptFormSchema>
