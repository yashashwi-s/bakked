// Type definitions for Bakked CRM

export interface Contact {
  id: string
  phone: string
  name: string | null
  dob: string | null // YYYY-MM-DD
  anniversary: string | null // YYYY-MM-DD
  last_visit: string | null // ISO timestamp
  total_visits: number
  tags: string[]
  created_at: string
  is_active?: boolean // For UI toggle
  last_message_at?: string | null // Last message sent timestamp
  last_message_group?: string | null // Group name of last message
}

export interface Template {
  id: string
  name: string
  category: string // birthday, anniversary, festival, nudge_2, nudge_15, custom
  message_text: string
  media_urls: string[]
  buttons: CTAButton[] // Multiple buttons support (WhatsApp API v22+)
  // Legacy single button support (deprecated)
  button_text?: string | null
  button_url?: string | null
  is_active: boolean
  created_at: string
}

// WhatsApp CTA Button (up to 2 per message)
export interface CTAButton {
  type: 'url' | 'phone' | 'quick_reply'
  text: string
  url?: string // For URL type
  phone?: string // For phone type
}

export interface Campaign {
  id: string
  name: string
  group_id: string | null
  message_text: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  sent_at: string
}

export interface MessageLog {
  id: string
  contact_id: string | null
  campaign_id: string | null
  wa_id: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sent_at: string
  updated_at: string
  contacts?: {
    phone: string
    name: string | null
  }
}

export interface Group {
  id: string
  name: string
  type: string
  description: string | null
  color: string
  trigger_rule: Record<string, unknown> | null
  active: boolean
  created_at: string
}

// Custom group created by user (stored locally)
export interface CustomGroup {
  id: string
  name: string
  description: string
  type: 'message' | 'recipient' // For which section
  contactIds?: string[] // For recipient groups only
  created_at: string
}

export interface RecipientGroup {
  id: string
  name: string
  type: string // manual, birthday_today, etc.
  created_at: string
}

// Dynamic group types for the messages page
export type GroupType = 'birthday' | 'anniversary' | 'nudge_2' | 'nudge_15' | 'festival' | string // string for custom groups

export interface GroupConfig {
  id: string
  name: string
  description: string
  icon: string
  isCustom?: boolean
}

// Test contact stored in localStorage
export interface TestContact {
  name: string
  phone: string
  dob_month: number // 1-12
  dob_day: number // 1-31
  anniversary_month: number
  anniversary_day: number
  last_visit?: string // YYYY-MM-DD
}

// Message crafting state
export interface DraftMessage {
  text: string
  mediaUrls: string[]
  buttons: CTAButton[] // Multiple buttons
  // Legacy
  buttonText?: string
  buttonUrl?: string
}

// API Response types
export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  count?: number
}

export interface ContactsResponse {
  contacts: Contact[]
  count: number
}

export interface TemplatesResponse {
  templates: Template[]
  count: number
}

export interface CampaignsResponse {
  campaigns: Campaign[]
  count: number
}

export interface GroupMembersResponse {
  members: Contact[]
  count: number
  error?: string
}

export interface SendMessageResponse {
  success: boolean
  message_id?: string
  error?: string
}

export interface BulkSendResponse {
  success: boolean
  sent_count: number
  failed_count: number
  total: number
}

// Dashboard stats
export interface DashboardStats {
  totalContacts: number
  todayBirthdays: number
  todayAnniversaries: number
  nudge2Count: number
  nudge15Count: number
  totalMessagesSent: number
  deliveredCount: number
  readCount: number
}
