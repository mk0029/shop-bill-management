import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  // Billing defaults
  visitingChargesDefault: number;
  repairFeeDefault: number;
  offlineAutoUploadDefault: boolean;
  // Notification prefs
  showInAppNotifications: boolean;
  showNotificationPopover: boolean;
  playSoundOnNotification: boolean;
  pauseIncomingNotifications: boolean;

  // Actions
  setDefaults: (partial: Partial<Pick<SettingsState,
    'visitingChargesDefault' | 'repairFeeDefault' | 'offlineAutoUploadDefault' |
    'showInAppNotifications' | 'showNotificationPopover' | 'playSoundOnNotification' | 'pauseIncomingNotifications'
  >>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      visitingChargesDefault: 0,
      repairFeeDefault: 0,
      offlineAutoUploadDefault: true,
      showInAppNotifications: true,
      showNotificationPopover: true,
      playSoundOnNotification: false,
      pauseIncomingNotifications: false,
      setDefaults: (partial) => set((s) => ({ ...s, ...partial })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined as unknown as Storage : window.localStorage)),
      partialize: (s) => ({
        visitingChargesDefault: s.visitingChargesDefault,
        repairFeeDefault: s.repairFeeDefault,
        offlineAutoUploadDefault: s.offlineAutoUploadDefault,
        showInAppNotifications: s.showInAppNotifications,
        showNotificationPopover: s.showNotificationPopover,
        playSoundOnNotification: s.playSoundOnNotification,
        pauseIncomingNotifications: s.pauseIncomingNotifications,
      }),
    }
  )
);
