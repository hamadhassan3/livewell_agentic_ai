// Firebase Cloud Messaging Service Worker
// This file handles background notifications when the app is not in focus

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: Use the same config as your main app
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "livewell-f.firebaseapp.com",
  projectId: "livewell-f",
  storageBucket: "livewell-f.firebasestorage.app",
  messagingSenderId: "832168591779",
  appId: "1:832168591779:web:8809202ba206fd0857da16",
  measurementId: "G-ESRB0CSJ87"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'LiveWell Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon.png', // Make sure you have this icon in your public folder
    badge: '/badge.png', // Optional: small badge icon
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false, // Set to true for persistent notifications
    silent: false,
    vibrate: [200, 100, 200] // Vibration pattern
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      const url = '/'; // Your app's URL
      
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push events (for data-only messages)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', data);
    
    // Handle data-only messages here if needed
    if (!data.notification) {
      // This is a data-only message
      const notificationTitle = data.title || 'LiveWell Update';
      const notificationOptions = {
        body: data.body || 'You have a new update',
        icon: '/icon.png',
        data: data
      };
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    }
  }
});