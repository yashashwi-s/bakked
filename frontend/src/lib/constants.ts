import type { GroupConfig } from '@/types'

// Default group configurations - no emojis, clean design
export const DEFAULT_GROUPS: GroupConfig[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    description: 'Customers with birthday today',
    icon: '',
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    description: 'Customers with anniversary today',
    icon: '',
  },
  {
    id: 'nudge_2',
    name: '2 Days Nudge',
    description: 'Last visited 2 days ago',
    icon: '',
  },
  {
    id: 'nudge_15',
    name: '15 Days Nudge',
    description: 'Last visited 15 days ago',
    icon: '',
  },
  {
    id: 'festival',
    name: 'Festivals',
    description: 'All active customers',
    icon: '',
  },
]

// Default recipient group configurations (same as groups + everyone)
export const DEFAULT_RECIPIENT_GROUPS: GroupConfig[] = [
  ...DEFAULT_GROUPS,
  {
    id: 'everyone',
    name: 'Everyone',
    description: 'All active customers',
    icon: '',
  },
]

// LocalStorage keys
export const STORAGE_KEYS = {
  CUSTOM_GROUPS: 'bakked_custom_groups',
  CUSTOM_RECIPIENT_GROUPS: 'bakked_custom_recipient_groups',
  TEST_CONTACT: 'bakked_test_contact',
  TEMPLATES: 'bakked_templates',
  AUTH: 'bakked_auth',
}

// Placeholder tokens for message crafting
export const PLACEHOLDERS = [
  { token: '[Name]', label: 'Name', description: 'Customer name or "Friend"' },
  { token: '[Days]', label: 'Days', description: 'Days since last visit' },
]

// Message limits
export const MAX_IMAGES = 10
export const MAX_BUTTONS = 2 // WhatsApp API limit
export const MAX_MESSAGE_LENGTH = 1024

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  sent: 'bg-blue-500',
  delivered: 'bg-green-500',
  read: 'bg-emerald-500',
  failed: 'bg-red-500',
}
