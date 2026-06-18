// Give the service worker access to Firebase Messaging.
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Initialize the Firebase app in the service worker.
firebase.initializeApp({
  apiKey: "AIzaSyCtY4Y0y2MK7Y95tAn97agPVDGHlDkLDOI",
  authDomain: "ai-studio-applet-webapp-2b467.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-2b467",
  storageBucket: "ai-studio-applet-webapp-2b467.firebasestorage.app",
  messagingSenderId: "834330506319",
  appId: "1:834330506319:web:09f70562f7d3291aef663a"
});

const messaging = firebase.messaging();

function getFieldLabel(field) {
  if (!field) return 'New Task';
  switch (field) {
    case 'assignedPreSales': return 'Pre-Sales';
    case 'assignedTo':
    case 'assignedToEmail': return 'Lead Executive';
    case 'visitedByEmail': return 'Technical Survey';
    case 'assignedSalesEmail': return 'Sales Team';
    case 'projectAssigneeEmail': return 'Project Manager';
    case 'accAssigneeEmail': return 'Accountant';
    case 'projectInchargeEmail': return 'Project Coordinator';
    case 's_newConn_assignedToEmail': return 'New Connection Step';
    case 's_docCorr_assignedToEmail': return 'Doc Correction Step';
    case 's_loadExt_assignedToEmail': return 'Load Extension Step';
    case 'execution_assignedToEmail': return 'Online Registration Step';
    case 's4_loanAssignedToEmail': return 'Loan Processing Step';
    case 's5_storeDispatchAssignedToEmail': return 'Meter Dispatch Step';
    case 's5_discomPreAssignedToEmail': return 'DISCOM Pre-survey Step';
    case 's6_inchargeAssignedToEmail': return 'Site Incharge Step';
    case 's5_storeInchargeAssignedToEmail': return 'Store Incharge Step';
    case 's6_assignedToEmail': return 'Site Team Step';
    case 's7_assignedToEmail': return 'Office Exec Step';
    case 's8_assignedToEmail': return 'DISCOM Post-Install Step';
    case 's9_assignedToEmail': return 'Loan Officer Step';
    case 's10_assignedToEmail': return 'Step 10 (Post-Install Phase)';
    case 's11_assignedToEmail': return 'Subsidy Section Step';
    default: 
      if (typeof field === "string" && field.length > 20) {
        return "Service Request";
      }
      return field;
  }
}

function getModuleHeading(moduleType) {
  switch (moduleType) {
    case "lead_management": return "Lead Management";
    case "site_survey": return "Site Survey";
    case "project_control": return "Project Control";
    case "task_sheet": return "Project Timeline Step";
    case "service_request": return "Service Request Section";
    default: return "SuryaDesk Module";
  }
}

// Custom handler for push events to intercept FCM and ensure custom formatting
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Event received:', event);
  if (!event.data) {
    console.log('[Service Worker] Push event contains no data.');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[Service Worker] Parsed payload JSON:', payload);

    const data = payload.data || {};
    
    // Set notification title and body precisely to match instructions
    const notificationTitle = payload.notification?.title || "SuryaDesk";
    const notificationBody = payload.notification?.body || "You have a new task assigned to you.";

    const notificationOptions = {
      body: notificationBody,
      icon: "/icon-192.png?v=1.0.3",
      badge: "/icon-192.png?v=1.0.3",
      data: {
        projectId: data.projectId || "",
        moduleType: data.moduleType || "",
        taskId: data.taskId || "",
        message: data.message || ""
      },
      vibrate: [200, 100, 200],
      tag: 'task-alert' // simple non-duplicating tag
    };

    // Override automatic handling by manually calling showNotification
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('[Service Worker] Error displaying push notification:', error);
  }
});

// Firebase SDK Background event handler (fallback and analytics)
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message (onBackgroundMessage) ", payload);
  const data = payload.data || {};
  
  const notificationTitle = payload.notification?.title || "SuryaDesk";
  const notificationBody = payload.notification?.body || "You have a new task assigned to you.";
  
  const notificationOptions = {
    body: notificationBody,
    icon: "/icon-192.png?v=1.0.3",
    badge: "/icon-192.png?v=1.0.3",
    data: data,
    tag: 'task-alert'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click listener, opening app and deep-linking directly to relevant task or module
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked! Event:', event);
  event.notification.close();

  const data = event.notification.data || {};
  const projectId = data.projectId;
  const moduleType = data.moduleType;
  const taskId = data.taskId;

  let urlToOpen = new URL('/', self.location.origin);
  if (projectId) {
    urlToOpen.searchParams.set('openLeadId', projectId);
    if (moduleType) {
      urlToOpen.searchParams.set('module', moduleType);
    }
    if (taskId) {
      urlToOpen.searchParams.set('task', taskId);
    }
  }

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(windowClients => {
    let matchingClient = null;
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      // Matching focus checking
      if (windowClient.url.startsWith(self.location.origin)) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      // Focus the existing window
      matchingClient.postMessage({
        type: 'NOTIFICATION_CLICK',
        projectId,
        moduleType,
        taskId
      });
      // Navigate to search params URL
      return matchingClient.navigate(urlToOpen.href).then(c => {
         if (c && typeof c.focus === 'function') {
           return c.focus();
         }
      });
    } else {
      // Open a new window
      return clients.openWindow(urlToOpen.href);
    }
  });

  event.waitUntil(promiseChain);
});
