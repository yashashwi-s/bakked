import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { GroupConfig, CustomGroup, TestContact } from '@/types'
import { STORAGE_KEYS, DEFAULT_GROUPS, DEFAULT_RECIPIENT_GROUPS } from './constants'

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format phone number for display (censored)
export function censorPhone(phone: string): string {
  if (!phone || phone.length < 6) return '••••••••••'
  return phone.slice(0, 3) + '•••••' + phone.slice(-2)
}

// Format phone number for display (full)
export function formatPhone(phone: string): string {
  if (!phone) return ''
  // Remove + and format
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`
  }
  return phone
}

// Format date for display (DD MMM)
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return '—'
  }
}

// Format datetime for display
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Check if date matches today (month and day only)
export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  try {
    const date = new Date(dateStr)
    const today = new Date()
    return date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  } catch {
    return false
  }
}

// Calculate days ago from date
export function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

// Format days ago for display
export function formatDaysAgo(dateStr: string | null): string {
  const days = daysAgo(dateStr)
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

// Simple hash function for password
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const session = localStorage.getItem('bakked_session')
  if (!session) return false
  try {
    const { expiry } = JSON.parse(session)
    return new Date(expiry) > new Date()
  } catch {
    return false
  }
}

// Set session
export function setSession(): void {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7) // 7 days
  localStorage.setItem('bakked_session', JSON.stringify({ expiry: expiry.toISOString() }))
}

// Clear session
export function clearSession(): void {
  localStorage.removeItem('bakked_session')
}

// Get test contact from localStorage
export function getTestContact(): TestContact | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEYS.TEST_CONTACT)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// Save test contact to localStorage
export function saveTestContact(contact: TestContact): void {
  localStorage.setItem(STORAGE_KEYS.TEST_CONTACT, JSON.stringify(contact))
}

// Replace message placeholders
export function replacePlaceholders(
  text: string,
  contact: { name?: string | null; phone?: string; last_visit?: string | null }
): string {
  let result = text
  result = result.replace(/\[Name\]/g, contact.name || 'Friend')
  result = result.replace(/\[Phone\]/g, contact.phone || '')
  
  const days = daysAgo(contact.last_visit || null)
  result = result.replace(/\[Days\]/g, days !== null ? String(days) : 'some')
  
  return result
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Custom Groups Management
export function getCustomGroups(): CustomGroup[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_GROUPS)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveCustomGroup(group: Omit<CustomGroup, 'id' | 'created_at'>): CustomGroup {
  const groups = getCustomGroups()
  const newGroup: CustomGroup = {
    ...group,
    id: `custom_${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  groups.push(newGroup)
  localStorage.setItem(STORAGE_KEYS.CUSTOM_GROUPS, JSON.stringify(groups))
  return newGroup
}

export function deleteCustomGroup(id: string): void {
  const groups = getCustomGroups().filter((g) => g.id !== id)
  localStorage.setItem(STORAGE_KEYS.CUSTOM_GROUPS, JSON.stringify(groups))
}

export function updateCustomGroup(id: string, data: Partial<CustomGroup>): void {
  const groups = getCustomGroups().map((g) =>
    g.id === id ? { ...g, ...data } : g
  )
  localStorage.setItem(STORAGE_KEYS.CUSTOM_GROUPS, JSON.stringify(groups))
}

// Get all groups (default + custom)
export function getAllGroups(): GroupConfig[] {
  const customGroups = getCustomGroups()
    .filter((g) => g.type === 'message')
    .map((g): GroupConfig => ({
      id: g.id,
      name: g.name,
      description: g.description,
      icon: '',
      isCustom: true,
    }))
  return [...DEFAULT_GROUPS, ...customGroups]
}

// Get all recipient groups (default + custom)
export function getAllRecipientGroups(): GroupConfig[] {
  const customGroups = getCustomGroups()
    .filter((g) => g.type === 'recipient')
    .map((g): GroupConfig => ({
      id: g.id,
      name: g.name,
      description: g.description,
      icon: '',
      isCustom: true,
    }))
  return [...DEFAULT_RECIPIENT_GROUPS, ...customGroups]
}

// Format relative time for last message
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return 'Never'
  }
}
