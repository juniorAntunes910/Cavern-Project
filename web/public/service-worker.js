const cacheName = 'cavern-shell-v3'
const databaseName = 'cavern-app'
const storeName = 'records'
const habitsKey = 'cavern.local.habits.v1'
const logsKey = 'cavern.local.habit-logs.v1'
const enabledKey = 'cavern.settings.notifications.enabled'
const hourKey = 'cavern.settings.notifications.hour'
const lastReminderKey = 'cavern.notifications.last-date'
const reminderTag = 'cavern-daily-habit-reminder'

self.addEventListener('install', event => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone()
      void caches.open(cacheName).then(cache => cache.put('/', copy))
      return response
    }).catch(() => caches.match('/')))
    return
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination) && !url.pathname.startsWith('/src/')) {
    event.respondWith(caches.match(request).then(cached => cached ?? fetch(request).then(response => {
      const copy = response.clone()
      void caches.open(cacheName).then(cache => cache.put(request, copy))
      return response
    })))
  }
})

self.addEventListener('periodicsync', event => {
  if (event.tag === reminderTag) event.waitUntil(checkHabitReminder())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_HABIT_REMINDER') event.waitUntil(checkHabitReminder())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) {
      existing.navigate('/habits')
      return existing.focus()
    }
    return self.clients.openWindow('/habits')
  }))
})

async function precacheAppShell() {
  const cache = await caches.open(cacheName)
  const response = await fetch('/')
  const html = await response.clone().text()
  await cache.put('/', response)
  const documentAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map(match => new URL(match[1], self.location.origin))
    .filter(url => url.origin === self.location.origin && !url.pathname.startsWith('/src/'))
    .map(url => url.pathname)
  await cache.addAll([...new Set(['/manifest.webmanifest', '/app-icon.svg', '/app-icon-maskable.svg', '/app-icon-192.png', '/app-icon-512.png', ...documentAssets])])
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readValue(key) {
  const database = await openDatabase()
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction(storeName).objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return value
}

async function writeValue(key, value) {
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value, key)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function checkHabitReminder() {
  if (Notification.permission !== 'granted') return
  const [enabled, hour, lastReminder, habits = [], logs = []] = await Promise.all([
    readValue(enabledKey),
    readValue(hourKey),
    readValue(lastReminderKey),
    readValue(habitsKey),
    readValue(logsKey),
  ])
  const date = localDate()
  if (!enabled || lastReminder === date || new Date().getHours() < (hour ?? 18)) return

  const completed = new Set(logs.filter(log => log.date === date && log.status === 'completed').map(log => log.habit_id))
  const pending = habits.filter(habit => habit.active && !completed.has(habit.id))
  if (pending.length === 0) return

  const names = pending.slice(0, 3).map(habit => habit.name).join(', ')
  const extra = pending.length > 3 ? ` e mais ${pending.length - 3}` : ''
  await self.registration.showNotification('Hábitos pendentes no Cavern', {
    body: `${pending.length} ${pending.length === 1 ? 'hábito espera' : 'hábitos esperam'} por você: ${names}${extra}.`,
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: reminderTag,
    renotify: false,
    data: { url: '/habits' },
  })
  await writeValue(lastReminderKey, date)
}
