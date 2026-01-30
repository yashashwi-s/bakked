'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Input, Button, Toggle, Modal, Badge } from '@/components/ui'
import { isAuthenticated, censorPhone, formatPhone, formatDate, formatDaysAgo, debounce, formatRelativeTime } from '@/lib/utils'
import { getContacts, updateContact } from '@/lib/api'
import type { Contact } from '@/types'
import { Search, Eye, EyeOff, Pencil, X, Check } from 'lucide-react'

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    loadContacts()
  }, [router])

  const loadContacts = async () => {
    try {
      const data = await getContacts()
      // Add is_active field if not present (default true)
      const withActive = data.map((c) => ({
        ...c,
        is_active: c.is_active !== false,
      }))
      setContacts(withActive)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts
    const query = searchQuery.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.phone.includes(query)
    )
  }, [contacts, searchQuery])

  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value)
  }, 300)

  const togglePhoneReveal = (id: string) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleActive = async (id: string) => {
    const contact = contacts.find((c) => c.id === id)
    if (!contact) return

    const newValue = !contact.is_active
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: newValue } : c))
    )

    // Persist to backend (if you add this field to DB)
    // await updateContact(id, { is_active: newValue })
  }

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditData({
      name: contact.name || '',
      phone: contact.phone,
      dob: contact.dob || '',
      anniversary: contact.anniversary || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)

    try {
      await updateContact(editingId, editData)
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...editData } : c))
      )
      setEditingId(null)
      setEditData({})
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-lg" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredContacts.length} of {contacts.length} contacts
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="bg-muted">
                <tr>
                  <th className="w-12">Active</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Anniversary</th>
                  <th>Last Visit</th>
                  <th>Last Message</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No contacts found
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id}>
                      {/* Active Toggle */}
                      <td>
                        <Toggle
                          checked={contact.is_active !== false}
                          onChange={() => toggleActive(contact.id)}
                          size="sm"
                        />
                      </td>

                      {/* Name */}
                      <td>
                        {editingId === contact.id ? (
                          <input
                            type="text"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-border bg-background text-sm"
                          />
                        ) : (
                          <span className="font-medium">{contact.name || '—'}</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {revealedPhones.has(contact.id)
                              ? formatPhone(contact.phone)
                              : censorPhone(contact.phone)}
                          </span>
                          <button
                            onClick={() => togglePhoneReveal(contact.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {revealedPhones.has(contact.id) ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Birthday */}
                      <td>
                        {editingId === contact.id ? (
                          <input
                            type="date"
                            value={editData.dob || ''}
                            onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                            className="h-8 px-2 rounded border border-border bg-background text-sm"
                          />
                        ) : (
                          formatDate(contact.dob)
                        )}
                      </td>

                      {/* Anniversary */}
                      <td>
                        {editingId === contact.id ? (
                          <input
                            type="date"
                            value={editData.anniversary || ''}
                            onChange={(e) => setEditData({ ...editData, anniversary: e.target.value })}
                            className="h-8 px-2 rounded border border-border bg-background text-sm"
                          />
                        ) : (
                          formatDate(contact.anniversary)
                        )}
                      </td>

                      {/* Last Visit */}
                      <td>
                        <span className="text-sm text-muted-foreground">
                          {formatDaysAgo(contact.last_visit)}
                        </span>
                      </td>

                      {/* Last Message */}
                      <td>
                        <div className="text-sm">
                          {contact.last_message_at ? (
                            <>
                              <span className="text-muted-foreground">
                                {formatRelativeTime(contact.last_message_at)}
                              </span>
                              {contact.last_message_group && (
                                <span className="block text-[10px] text-muted-foreground/70">
                                  via {contact.last_message_group}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/50">Never</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        {editingId === contact.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900 rounded text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(contact)}
                            className="p-1.5 hover:bg-muted rounded"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
