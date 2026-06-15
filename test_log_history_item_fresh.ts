import { logHistoryItem } from './src/services/similarity/similarityService'
import { getHistoryItems, clearHistory } from './src/features/history/services/historyService'

async function testLogHistoryItem() {
  // Clear existing history
  await clearHistory()
  console.log('✓ Cleared history')

  // Test logHistoryItem
  const testItem = {
    id: 'test-log-1',
    content: 'Test log prompt',
    aspectRatio: '1:1',
    stylePreset: 'none',
    niche: 'test',
    createdAt: Date.now(),
  }
  await logHistoryItem(testItem)
  console.log('✓ Logged test item')

  // Verify in history
  const history = await getHistoryItems()
  console.log('History:', history)
  if (history.length !== 1 || history[0].id !== 'test-log-1') {
    throw new Error('logHistoryItem failed')
  }
  if (!history[0].metadata?.similarity) {
    throw new Error('Similarity metadata missing')
  }
  console.log('✓ logHistoryItem wrote to history table')

  console.log('All tests passed!')
}

testLogHistoryItem().catch(console.error)
