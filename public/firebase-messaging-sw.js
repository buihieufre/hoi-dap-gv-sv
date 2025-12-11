/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDKdFlXpNssp9zr4FfnE8ueVg7wV_tOmLI",
  authDomain: "hoidapcntt-af8d9.firebaseapp.com",
  projectId: "hoidapcntt-af8d9",
  storageBucket: "hoidapcntt-af8d9.firebasestorage.app",
  messagingSenderId: "186452971198",
  appId: "1:186452971198:web:1c7c145fe04e84b48a58ef",
  measurementId: "G-ECYDSCQQ03",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Thông báo", {
    body: body || "",
    icon: "/icon-192.png",
    data: payload.data,
  });
});
