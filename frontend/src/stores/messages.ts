import { create } from 'zustand'
import type { Template, Contact, GroupType, TestContact, CTAButton } from '@/types'

interface DraftMessage {
  text: string
  mediaUrls: string[]
  buttons: CTAButton[] // Multiple buttons (up to 2)
}

interface MessagesState {
  // Selected group/template
  selectedGroup: string | null
  selectedTemplate: Template | null
  selectedRecipientGroup: string | null
  
  // Templates
  templates: Template[]
  templatesLoading: boolean
  
  // Recipients
  recipients: Contact[]
  recipientsLoading: boolean
  excludedIds: Set<string>
  
  // Draft message
  draft: DraftMessage
  
  // Test contact
  testContact: TestContact | null
  
  // Modals
  showRecipientsModal: boolean
  showTemplateModal: boolean
  showTestContactModal: boolean
  showSendConfirmModal: boolean
  showCreateGroupModal: boolean
  
  // Actions
  setSelectedGroup: (group: string | null) => void
  setSelectedTemplate: (template: Template | null) => void
  setSelectedRecipientGroup: (group: string | null) => void
  setTemplates: (templates: Template[]) => void
  setTemplatesLoading: (loading: boolean) => void
  setRecipients: (recipients: Contact[]) => void
  setRecipientsLoading: (loading: boolean) => void
  toggleExcluded: (id: string) => void
  clearExcluded: () => void
  setDraft: (draft: Partial<DraftMessage>) => void
  resetDraft: () => void
  setTestContact: (contact: TestContact | null) => void
  addMediaUrl: (url: string) => void
  removeMediaUrl: (index: number) => void
  addButton: (button: CTAButton) => void
  updateButton: (index: number, button: CTAButton) => void
  removeButton: (index: number) => void
  setShowRecipientsModal: (show: boolean) => void
  setShowTemplateModal: (show: boolean) => void
  setShowTestContactModal: (show: boolean) => void
  setShowSendConfirmModal: (show: boolean) => void
  setShowCreateGroupModal: (show: boolean) => void
  loadTemplateIntoDraft: (template: Template) => void
}

const initialDraft: DraftMessage = {
  text: '',
  mediaUrls: [],
  buttons: [],
}

const STORAGE_KEY = 'bakked_excluded_ids'

const getStoredExclusions = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

const saveExclusions = (ids: Set<string>) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
}

export const useMessagesStore = create<MessagesState>((set) => ({
  selectedGroup: null,
  selectedTemplate: null,
  selectedRecipientGroup: null,
  templates: [],
  templatesLoading: false,
  recipients: [],
  recipientsLoading: false,
  excludedIds: getStoredExclusions(),
  draft: initialDraft,
  testContact: null,
  showRecipientsModal: false,
  showTemplateModal: false,
  showTestContactModal: false,
  showSendConfirmModal: false,
  showCreateGroupModal: false,

  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setSelectedRecipientGroup: (group) => set({ selectedRecipientGroup: group }),
  setTemplates: (templates) => set({ templates }),
  setTemplatesLoading: (loading) => set({ templatesLoading: loading }),
  setRecipients: (recipients) => set({ recipients }),
  setRecipientsLoading: (loading) => set({ recipientsLoading: loading }),
  toggleExcluded: (id) =>
    set((state) => {
      const newSet = new Set(state.excludedIds)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      saveExclusions(newSet)
      return { excludedIds: newSet }
    }),
  clearExcluded: () => {
    saveExclusions(new Set())
    set({ excludedIds: new Set() })
  },
  setDraft: (draft) => set((state) => ({ draft: { ...state.draft, ...draft } })),
  resetDraft: () => set({ draft: initialDraft }),
  setTestContact: (contact) => set({ testContact: contact }),
  addMediaUrl: (url) =>
    set((state) => ({
      draft: { ...state.draft, mediaUrls: [...state.draft.mediaUrls, url] },
    })),
  removeMediaUrl: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        mediaUrls: state.draft.mediaUrls.filter((_, i) => i !== index),
      },
    })),
  addButton: (button) =>
    set((state) => ({
      draft: { ...state.draft, buttons: [...state.draft.buttons, button] },
    })),
  updateButton: (index, button) =>
    set((state) => ({
      draft: {
        ...state.draft,
        buttons: state.draft.buttons.map((b, i) => (i === index ? button : b)),
      },
    })),
  removeButton: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        buttons: state.draft.buttons.filter((_, i) => i !== index),
      },
    })),
  setShowRecipientsModal: (show) => set({ showRecipientsModal: show }),
  setShowTemplateModal: (show) => set({ showTemplateModal: show }),
  setShowTestContactModal: (show) => set({ showTestContactModal: show }),
  setShowSendConfirmModal: (show) => set({ showSendConfirmModal: show }),
  setShowCreateGroupModal: (show) => set({ showCreateGroupModal: show }),
  loadTemplateIntoDraft: (template) =>
    set({
      draft: {
        text: template.message_text,
        mediaUrls: template.media_urls || [],
        buttons: template.buttons || [],
      },
    }),
}))
