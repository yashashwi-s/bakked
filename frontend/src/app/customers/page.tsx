'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout'
import { Input, Button, Toggle, Modal, Badge } from '@/components/ui'
import { isAuthenticated, censorPhone, formatPhone, formatDate, formatDaysAgo, debounce, formatRelativeTime } from '@/lib/utils'
import { getContacts, updateContact, createContact } from '@/lib/api'
import type { Contact } from '@/types'
import { Search, Eye, EyeOff, Pencil, X, Check, UserPlus } from 'lucide-react'

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)

  // Add Contact Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newContactData, setNewContactData] = useState<Partial<Contact>>({
    name: '',
    dob: '',
    anniversary: '',
    last_visit: '',
  })
  const [lastVisitMode, setLastVisitMode] = useState<'today' | 'yesterday' | 'custom'>('today')

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
      toast.success('Contact updated successfully')
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  // Add Contact Dialog Handlers
  const openAddDialog = () => {
    setShowAddDialog(true)
    setPhoneInput('')
    setSearchResults([])
    setSelectedContact(null)
    setNewContactData({
      name: '',
      dob: '',
      anniversary: '',
      last_visit: '',
    })
    setLastVisitMode('today')
  }

  const closeAddDialog = () => {
    setShowAddDialog(false)
    setPhoneInput('')
    setSearchResults([])
    setSelectedContact(null)
    setNewContactData({
      name: '',
      dob: '',
      anniversary: '',
      last_visit: '',
    })
    setLastVisitMode('today')
  }

  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '')
    
    // If starts with 91 and has 12 digits, add +
    if (digits.startsWith('91') && digits.length === 12) {
      return '+' + digits
    }
    
    // If 10 digits, add +91
    if (digits.length === 10) {
      return '+91' + digits
    }
    
    // If has country code but no +, add it
    if (digits.length > 10 && !phone.startsWith('+')) {
      return '+' + digits
    }
    
    return phone
  }

  const handlePhoneSearch = (value: string) => {
    setPhoneInput(value)
    
    if (value.length < 3) {
      setSearchResults([])
      setSelectedContact(null)
      return
    }

    // Search contacts by phone digits
    const digits = value.replace(/\D/g, '')
    const matches = contacts.filter(c => {
      const contactDigits = c.phone.replace(/\D/g, '')
      return contactDigits.includes(digits)
    }).slice(0, 5) // Limit to 5 results

    setSearchResults(matches)
  }

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setPhoneInput(contact.phone)
    setSearchResults([])
    setNewContactData({
      name: contact.name || '',
      dob: contact.dob || '',
      anniversary: contact.anniversary || '',
      last_visit: contact.last_visit || '',
    })
    
    // Set last visit mode based on existing value
    if (contact.last_visit) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      
      if (contact.last_visit === today) {
        setLastVisitMode('today')
      } else if (contact.last_visit === yesterday) {
        setLastVisitMode('yesterday')
      } else {
        setLastVisitMode('custom')
      }
    }
  }

  const getLastVisitValue = (): string => {
    if (lastVisitMode === 'today') {
      return new Date().toISOString().split('T')[0]
    } else if (lastVisitMode === 'yesterday') {
      return new Date(Date.now() - 86400000).toISOString().split('T')[0]
    } else {
      return newContactData.last_visit || ''
    }
  }

  const handleSaveContact = async () => {
    setSaving(true)
    const toastId = toast.loading(selectedContact ? 'Updating contact...' : 'Creating contact...')

    try {
      const normalizedPhone = normalizePhone(phoneInput)
      const contactData = {
        phone: normalizedPhone,
        name: newContactData.name?.trim() || null,
        dob: newContactData.dob || null,
        anniversary: newContactData.anniversary || null,
        last_visit: getLastVisitValue() || null,
      }

      if (selectedContact) {
        // Update existing contact
        await updateContact(selectedContact.id, contactData)
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedContact.id ? { ...c, ...contactData } : c
          )
        )
        toast.success('Contact updated successfully', { id: toastId })
      } else {
        // Create new contact
        const newContact = await createContact(contactData)
        setContacts((prev) => [newContact, ...prev])
        toast.success('Contact created successfully', { id: toastId })
      }

      closeAddDialog()
    } catch (error) {
      console.error('Failed to save contact:', error)
      toast.error('Failed to save contact', { id: toastId })
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

          <div className="flex items-center gap-3">
            {/* Add Contact Button */}
            <Button onClick={openAddDialog} variant="primary" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>

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
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <span className="font-mono text-sm flex-1">
                            {revealedPhones.has(contact.id)
                              ? formatPhone(contact.phone)
                              : censorPhone(contact.phone)}
                          </span>
                          <button
                            onClick={() => togglePhoneReveal(contact.id)}
                            className="p-1 hover:bg-muted rounded flex-shrink-0"
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

        {/* Add/Edit Contact Dialog */}
        <Modal
          open={showAddDialog}
          onClose={closeAddDialog}
          title={selectedContact ? 'Update Contact' : 'Add Contact'}
          size="xl"
        >
          <div className="grid grid-cols-2 gap-6 min-h-[420px]">
            {/* Left Column - Phone Search */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneSearch(e.target.value)}
                  placeholder="Start typing..."
                  className="w-full h-12 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  autoFocus
                  disabled={!!selectedContact}
                />
              </div>

              {/* Fixed Height Container for Search Results or Selected Contact */}
              <div className="h-[320px] overflow-hidden">
                {selectedContact ? (
                  /* Selected Contact Card */
                  <div className="p-5 rounded-xl border border-border">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Selected Customer
                        </p>
                        <p className="text-lg font-semibold mt-1">
                          {selectedContact.name || 'Unnamed Contact'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedContact(null)
                          setPhoneInput('')
                          setNewContactData({
                            name: '',
                            dob: '',
                            anniversary: '',
                            last_visit: '',
                          })
                        }}
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-xs text-muted-foreground">Phone</span>
                        <span className="font-mono text-sm">{formatPhone(selectedContact.phone)}</span>
                      </div>
                      {selectedContact.last_visit && (
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-xs text-muted-foreground">Last Visit</span>
                          <span className="text-sm">{formatDaysAgo(selectedContact.last_visit)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-muted-foreground">Total Visits</span>
                        <span className="text-sm font-semibold">{selectedContact.total_visits || 0}</span>
                      </div>
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  /* Search Results List */
                  <div className="h-full overflow-y-auto rounded-xl border border-border">
                    {searchResults.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => selectContact(contact)}
                        className="w-full px-4 py-4 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{contact.name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{formatPhone(contact.phone)}</p>
                          </div>
                          {contact.last_visit && (
                            <span className="text-xs font-medium text-muted-foreground ml-3 py-1 px-2 bg-muted rounded">
                              {formatDaysAgo(contact.last_visit)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : phoneInput.length >= 3 ? (
                  /* No Results */
                  <div className="h-full flex items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                    <div>
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs text-muted-foreground mt-1">Check the number or create a new contact</p>
                    </div>
                  </div>
                ) : (
                  /* Initial State */
                  <div className="h-full flex items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                    <div>
                      <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium">Customer Search</p>
                      <p className="text-xs text-muted-foreground mt-1">Enter digits to find existing records</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Contact Details */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newContactData.name || ''}
                  onChange={(e) => setNewContactData({ ...newContactData, name: e.target.value })}
                  placeholder="Customer name"
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newContactData.dob || ''}
                  onChange={(e) => setNewContactData({ ...newContactData, dob: e.target.value })}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                />
              </div>

              {/* Anniversary */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Anniversary
                </label>
                <input
                  type="date"
                  value={newContactData.anniversary || ''}
                  onChange={(e) => setNewContactData({ ...newContactData, anniversary: e.target.value })}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                />
              </div>

              {/* Last Visit with Tabs */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Visit
                </label>
                
                {/* Quick Select Tabs */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setLastVisitMode('today')}
                    className={`flex-1 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                      lastVisitMode === 'today'
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setLastVisitMode('yesterday')}
                    className={`flex-1 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                      lastVisitMode === 'yesterday'
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => setLastVisitMode('custom')}
                    className={`flex-1 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                      lastVisitMode === 'custom'
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Date Input (only shown when custom is selected) */}
                {lastVisitMode === 'custom' && (
                  <input
                    type="date"
                    value={newContactData.last_visit || ''}
                    onChange={(e) => setNewContactData({ ...newContactData, last_visit: e.target.value })}
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={closeAddDialog} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveContact} 
                  variant="primary" 
                  size="sm"
                  disabled={saving || !phoneInput.trim()}
                >
                  {saving ? 'Saving...' : selectedContact ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  )
}
