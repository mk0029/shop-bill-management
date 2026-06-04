"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDBKDVUSmcf7qoUrDzQk1FuziGtEo_xuIc",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "web-push-shop.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "web-push-shop",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "web-push-shop.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1042124125046",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1042124125046:web:07b684acf519982872c057",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-BZNQMF61R2",
  };
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (getApps().length) return getApps()[0] || null;
  return initializeApp(getFirebaseConfig());
}
