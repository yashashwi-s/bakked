import { create } from 'zustand'
import type { Contact } from '@/types'

interface CustomersState {
  contacts: Contact[]
  isLoading: boolean
  searchQuery: string
  setContacts: (contacts: Contact[]) => void
  setLoading: (value: boolean) => void
  setSearchQuery: (query: string) => void
  toggleContactActive: (id: string) => void
  updateContact: (id: string, data: Partial<Contact>) => void
}

export const useCustomersStore = create<CustomersState>((set) => ({
  contacts: [],
  isLoading: true,
  searchQuery: '',
  setContacts: (contacts) => set({ contacts }),
  setLoading: (value) => set({ isLoading: value }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleContactActive: (id) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, is_active: !c.is_active } : c
      ),
    })),
  updateContact: (id, data) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),
}))
