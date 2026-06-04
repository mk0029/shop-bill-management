export { getFirebaseApp as getClientApp } from "@/lib/firebase/app";
export {
  getFcmToken,
  getMessagingIfSupported,
  isMessagingAvailable,
  onForegroundMessage,
} from "@/lib/firebase/messaging";
