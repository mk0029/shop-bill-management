import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  // Billing defaults
  homeVisitFeeDefault: number;
  laborChargesDefault: number;
  repairFeeDefault: number;
  offlineAutoUploadDefault: boolean;
  // Notification prefs
  showInAppNotifications: boolean;
  showNotificationPopover: boolean;
  playSoundOnNotification: boolean;

  // Actions
  setDefaults: (partial: Partial<Pick<SettingsState,
    'homeVisitFeeDefault' | 'laborChargesDefault' | 'repairFeeDefault' | 'offlineAutoUploadDefault' |
    'showInAppNotifications' | 'showNotificationPopover' | 'playSoundOnNotification'
  >>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      homeVisitFeeDefault: 0,
      laborChargesDefault: 0,
      repairFeeDefault: 0,
      offlineAutoUploadDefault: true,
      showInAppNotifications: true,
      showNotificationPopover: true,
      playSoundOnNotification: false,
      setDefaults: (partial) => set((s) => ({ ...s, ...partial })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined as unknown as Storage : window.localStorage)),
      partialize: (s) => ({
        homeVisitFeeDefault: s.homeVisitFeeDefault,
        laborChargesDefault: s.laborChargesDefault,
        repairFeeDefault: s.repairFeeDefault,
        offlineAutoUploadDefault: s.offlineAutoUploadDefault,
        showInAppNotifications: s.showInAppNotifications,
        showNotificationPopover: s.showNotificationPopover,
        playSoundOnNotification: s.playSoundOnNotification,
      }),
    }
  )
);
