import { saveHistoryItem, getHistoryItems, clearHistory, removeHistoryItem } from '@/features/history/services/historyService'
import type { HistoryItem } from '@/features/history/types'

async function testHistoryService() {
  // Clear existing history
  await clearHistory()
  console.log('✓ Cleared history')

  // Test write
  const testItem: HistoryItem = {
    id: 'test-1',
    content: 'Test prompt',
    aspectRatio: '1:1',
    stylePreset: 'none',
    niche: 'test',
    createdAt: Date.now(),
    savedAt: Date.now(),
  }
  await saveHistoryItem(testItem)
  console.log('✓ Saved test item')

  // Test read
  const history = await getHistoryItems()
  console.log('History:', history)
  if (history.length !== 1 || history[0].id !== 'test-1') {
    throw new Error('History read failed')
  }
  console.log('✓ Read history')

  // Test delete
  await removeHistoryItem('test-1')
  const emptyHistory = await getHistoryItems()
  if (emptyHistory.length !== 0) {
    throw new Error('History delete failed')
  }
  console.log('✓ Deleted test item')

  console.log('All tests passed!')
}

testHistoryService().catch(console.error)
