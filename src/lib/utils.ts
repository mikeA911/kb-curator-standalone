/**
 * Clears all browser-stored data for the application
 * This includes localStorage, sessionStorage, and Cache API
 */
export async function clearBrowserData(): Promise<void> {
  try {
    // Clear Storage
    localStorage.clear()
    sessionStorage.clear()

    // Clear Cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // Clear IndexedDB (optional, but good for completeness)
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases()
      databases.forEach(db => {
        if (db.name) indexedDB.deleteDatabase(db.name)
      })
    }

    console.log('[Utils] Browser data and cache cleared successfully')
  } catch (error) {
    console.error('[Utils] Failed to clear browser data:', error)
  }
}
