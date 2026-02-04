const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Generic fetch wrapper
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }))
    throw new Error(error.detail || error.message || 'API Error')
  }

  return response.json()
}

// ==================== AUTH ====================
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const response = await fetchApi<{ valid: boolean }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    return response.valid
  } catch {
    return false
  }
}

// ==================== CONTACTS ====================
import type { Contact, ContactsResponse, GroupMembersResponse } from '@/types'

export async function getContacts(page = 1, limit = 100, search?: string): Promise<ContactsResponse> {
  let url = `/contacts?page=${page}&limit=${limit}`
  if (search) {
    url += `&search=${encodeURIComponent(search)}`
  }
  return fetchApi<ContactsResponse>(url)
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
  const response = await fetchApi<Contact>(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  const response = await fetchApi<Contact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response
}

export async function deleteContact(id: string): Promise<boolean> {
  const response = await fetchApi<{ success: boolean }>(`/contacts/${id}`, {
    method: 'DELETE',
  })
  return response.success
}

// ==================== GROUPS & RECIPIENTS ====================
export async function getGroupMembers(
  groupType: string,
  days?: number
): Promise<GroupMembersResponse> {
  let url = `/groups/${groupType}/members`
  if (days !== undefined) {
    url += `?days=${days}`
  }
  return fetchApi<GroupMembersResponse>(url)
}

export async function getGroupCount(groupType: string): Promise<number> {
  const response = await fetchApi<{ count: number }>(`/groups/${groupType}/count`)
  return response.count || 0
}

// ==================== TEMPLATES ====================
import type { Template, TemplatesResponse, CTAButton } from '@/types'

export async function getLocalTemplates(category?: string): Promise<Template[]> {
  let url = '/local-templates'
  if (category) {
    url += `?category=${category}`
  }
  const response = await fetchApi<TemplatesResponse>(url)
  return response.templates || []
}

export async function createLocalTemplate(data: {
  name: string
  message_text: string
  category: string
  media_urls?: string[]
  buttons?: CTAButton[]
}): Promise<Template> {
  return fetchApi<Template>('/local-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteLocalTemplate(id: string): Promise<void> {
  await fetchApi(`/local-templates/${id}`, {
    method: 'DELETE',
  })
}

// ==================== CAMPAIGNS & MESSAGING ====================
import type { Campaign, CampaignsResponse, SendMessageResponse, BulkSendResponse } from '@/types'

export async function getCampaigns(limit = 50): Promise<Campaign[]> {
  const response = await fetchApi<CampaignsResponse>(`/campaigns?limit=${limit}`)
  return response.campaigns || []
}

export async function sendTestMessage(data: {
  phone: string
  message: string
  media_urls?: string[]
  template_name?: string
}): Promise<SendMessageResponse> {
  return fetchApi<SendMessageResponse>('/test-message', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function sendBulkCampaign(data: {
  type: string
  message_text: string
  message_variations?: string[]
  media_url?: string
  media_config?: {
    fixed_urls: string[]
    random_pool: string[]
    random_count: number
  }
  buttons?: CTAButton[]
  specific_recipients?: string[]
  nudge_days?: number
}): Promise<BulkSendResponse> {
  return fetchApi<BulkSendResponse>('/campaigns/send', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ==================== MESSAGE LOGS ====================
import type { MessageLog } from '@/types'

export async function getMessageLogs(limit = 100): Promise<MessageLog[]> {
  const response = await fetchApi<{ logs: MessageLog[] }>(`/message-logs?limit=${limit}`)
  return response.logs || []
}

// ==================== MEDIA ====================
export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload-media`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload media')
  }

  const data = await response.json()
  return data.storage_url
}

// ==================== ANALYTICS (Meta API) ====================
export async function getAnalytics(): Promise<{
  templates: Array<{
    name: string
    status: string
    category: string
  }>
}> {
  return fetchApi('/templates')
}
