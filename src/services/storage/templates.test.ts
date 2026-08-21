import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import db from './db'
import {
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  getTemplate,
  importTemplatesBatch,
  resetDefaultTemplate,
  seedDefaultTemplateOnce,
  TemplateError,
  updateTemplate,
} from './templates'
import {
  DEFAULT_TEMPLATE_ID,
  DEFAULT_TEMPLATE_SEED_SETTING,
  defaultTemplate,
} from '@/features/templates/defaultTemplate'
import type { CreateTemplateInput, PersistedPromptTemplate } from '@/features/templates/types'

function input(name: string, overrides: Partial<CreateTemplateInput> = {}): CreateTemplateInput {
  return {
    name,
    content: `Content for ${name}`,
    category: 'general',
    tags: ['test'],
    ...overrides,
  }
}

async function expectTemplateError(promise: Promise<unknown>, code: TemplateError['code']): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: 'TemplateError', code })
}

describe('template storage', () => {
  beforeEach(async () => {
    await db.prompts.clear()
    await db.settings.delete(DEFAULT_TEMPLATE_SEED_SETTING)
  })

  afterEach(() => {
    db.prompts.hook('creating').unsubscribe(throwOnSecondCreate)
  })

  it('enforces normalized name uniqueness on create and rename', async () => {
    const first = await createTemplate(input('  Ｍｙ Template  '))
    const second = await createTemplate(input('Another Template'))

    expect(first.name).toBe('My Template')
    await expectTemplateError(createTemplate(input('my template')), 'DUPLICATE_NAME')
    await expectTemplateError(updateTemplate({ id: second.id, name: ' MY TEMPLATE ' }), 'DUPLICATE_NAME')
    expect((await getTemplate(second.id))?.name).toBe('Another Template')
  })

  it('allows an update when its normalized name is unchanged', async () => {
    const created = await createTemplate(input('Stable Name'))

    const updated = await updateTemplate({
      id: created.id,
      name: '  STABLE NAME  ',
      content: 'Updated content',
    })

    expect(updated).toMatchObject({ id: created.id, name: 'STABLE NAME', content: 'Updated content' })
    expect((await getTemplate(created.id))?.content).toBe('Updated content')
  })

  it('orders templates deterministically by updatedAt then id, newest first', async () => {
    const rows: PersistedPromptTemplate[] = [
      { ...input('Old'), id: 'z-old', nameKey: 'old', source: 'manual', createdAt: 1, updatedAt: 10 },
      { ...input('Tie A'), id: 'a-tie', nameKey: 'tie a', source: 'manual', createdAt: 1, updatedAt: 20 },
      { ...input('Tie Z'), id: 'z-tie', nameKey: 'tie z', source: 'manual', createdAt: 1, updatedAt: 20 },
    ]
    await db.prompts.bulkPut(rows)

    expect((await getAllTemplates()).map((row) => row.id)).toEqual(['z-tie', 'a-tie', 'z-old'])
  })

  it('seeds only once and does not resurrect a deliberately deleted builtin', async () => {
    await seedDefaultTemplateOnce()
    expect(await getTemplate(DEFAULT_TEMPLATE_ID)).toMatchObject({ source: 'builtin' })

    await deleteTemplate(DEFAULT_TEMPLATE_ID)
    await seedDefaultTemplateOnce()

    expect(await getTemplate(DEFAULT_TEMPLATE_ID)).toBeUndefined()
    expect(await db.settings.get(DEFAULT_TEMPLATE_SEED_SETTING)).toBeDefined()
  })

  it('resets the builtin content while retaining its stable identity and creation time', async () => {
    await seedDefaultTemplateOnce()
    const seeded = await getTemplate(DEFAULT_TEMPLATE_ID)
    await updateTemplate({ id: DEFAULT_TEMPLATE_ID, content: 'User-edited builtin' })

    const reset = await resetDefaultTemplate()

    expect(reset.id).toBe(DEFAULT_TEMPLATE_ID)
    expect(reset.createdAt).toBe(seeded?.createdAt)
    expect(reset).toMatchObject({
      name: defaultTemplate.name,
      content: defaultTemplate.content,
      tags: defaultTemplate.tags,
      source: 'builtin',
    })
  })

  it('adopts a single edited pre-v12 default row when reset is requested', async () => {
    await db.prompts.add({
      id: 'legacy-default-id',
      name: defaultTemplate.name,
      nameKey: 'stock photo prompt',
      content: 'User-edited legacy content',
      category: 'general',
      tags: ['legacy'],
      source: 'legacy',
      createdAt: 10,
      updatedAt: 20,
    })

    const reset = await resetDefaultTemplate()

    expect(reset).toMatchObject({
      id: 'legacy-default-id',
      builtinKey: 'stock-photo-v1',
      content: defaultTemplate.content,
      source: 'builtin',
      createdAt: 10,
    })
    expect(await db.prompts.get(DEFAULT_TEMPLATE_ID)).toBeUndefined()
  })

  it('imports valid records while reporting invalid and normalized duplicates', async () => {
    await createTemplate(input('Already Here'))

    const summary = await importTemplatesBatch([
      input('Imported One'),
      { name: '', content: '', category: 'invalid', tags: [] },
      input(' imported one '),
      input(' ALREADY HERE '),
      input('Imported Two', { tags: ['two'] }),
    ])

    expect(summary).toMatchObject({
      total: 5,
      imported: 2,
      invalid: 1,
      duplicatesInFile: 1,
      duplicatesExisting: 1,
      issuesTruncated: false,
    })
    expect(summary.issues).toEqual([
      { record: 2, code: 'INVALID_RECORD' },
      { record: 3, code: 'DUPLICATE_IN_FILE' },
      { record: 4, code: 'DUPLICATE_EXISTING' },
    ])
    expect((await getAllTemplates()).map((template) => template.name)).toEqual(
      expect.arrayContaining(['Already Here', 'Imported One', 'Imported Two']),
    )
  })

  it('rejects an import larger than 500 without writing any records', async () => {
    await expectTemplateError(
      importTemplatesBatch(Array.from({ length: 501 }, (_, index) => input(`Template ${index}`))),
      'IMPORT_LIMIT',
    )
    expect(await db.prompts.count()).toBe(0)
  })

  let createCount = 0
  function throwOnSecondCreate(): void {
    createCount++
    if (createCount === 2) throw new Error('fixture write failure')
  }

  it('rolls back all imported records when a write fails mid-batch', async () => {
    createCount = 0
    db.prompts.hook('creating').subscribe(throwOnSecondCreate)

    await expectTemplateError(
      importTemplatesBatch([input('Atomic One'), input('Atomic Two')]),
      'STORAGE_FAILED',
    )

    expect(await db.prompts.count()).toBe(0)
  })
})
