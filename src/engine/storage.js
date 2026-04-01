// ECHO Storage Engine — IndexedDB, fully offline, private
const DB_NAME = 'echo_db'
const DB_VERSION = 1
const STORE = 'memory'
const KEY = 'echo_v1'

const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION)
  req.onupgradeneeded = (e) => {
    e.target.result.createObjectStore(STORE, { keyPath: 'id' })
  }
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

export const loadMemory = async () => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result?.data || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

export const saveMemory = async (data) => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ id: KEY, data })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch { return false }
}

export const freshMemory = () => ({
  profile: {
    name: null,
    values: [],
    fears: [],
    goals: [],
    emotionalPatterns: [],
    recurringThemes: [],
    decisionStyle: null,
    coreBeliefs: [],
    blindSpots: [],
    growthAreas: [],
  },
  sessions: [],
  journals: [],
  milestones: [],
  moodLog: [],
  totalMessages: 0,
  firstMet: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
})
