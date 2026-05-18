import { create } from 'zustand'

interface UiState {
  toast: {
    visible: boolean
    message: string
  }
  showToast: (message: string) => void
  hideToast: () => void
}

export const useUiStore = create<UiState>((set) => ({
  toast: { visible: false, message: '' },
  showToast: (message) => {
    set({ toast: { visible: true, message } })
    setTimeout(() => {
      set({ toast: { visible: false, message: '' } })
    }, 2000)
  },
  hideToast: () => set({ toast: { visible: false, message: '' } }),
}))
