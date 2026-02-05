'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout'
import { Button, Input, Textarea, Modal, Toggle, TemplateStatus } from '@/components/ui'
import { 
  isAuthenticated, formatDate, censorPhone, replacePlaceholders, 
  getTestContact, saveTestContact, getAllGroups, getAllRecipientGroups,
  saveCustomGroup, deleteCustomGroup, formatRelativeTime
} from '@/lib/utils'
import { 
  getLocalTemplates, createLocalTemplate, deleteLocalTemplate, 
  getGroupMembers, getContacts, sendTestMessage, sendBulkCampaign, 
  uploadMedia, updateContact, submitTemplateToMeta, syncMetaTemplates
} from '@/lib/api'
import type { Template, Contact, TestContact, CTAButton, GroupConfig } from '@/types'
import { PLACEHOLDERS, MAX_IMAGES, MAX_BUTTONS } from '@/lib/constants'
import { useMessagesStore } from '@/stores/messages'
import { Trash2, Send, FlaskConical, Save, X, Settings, Search, ExternalLink, Plus, Phone, Pencil, Check, Upload, RefreshCw, CloudUpload, Layers, ImageIcon } from 'lucide-react'

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Dynamic groups from localStorage + defaults
  const [groups, setGroups] = useState<GroupConfig[]>([])
  const [recipientGroups, setRecipientGroups] = useState<GroupConfig[]>([])

  // Store state
  const {
    selectedGroup,
    setSelectedGroup,
    selectedRecipientGroup,
    setSelectedRecipientGroup,
    templates,
    setTemplates,
    templatesLoading,
    setTemplatesLoading,
    recipients,
    setRecipients,
    recipientsLoading,
    setRecipientsLoading,
    excludedIds,
    toggleExcluded,
    clearExcluded,
    draft,
    setDraft,
    resetDraft,
    testContact,
    setTestContact,
    addMediaUrl,
    removeMediaUrl,
    addButton,
    updateButton,
    removeButton,
    showRecipientsModal,
    setShowRecipientsModal,
    showTemplateModal,
    setShowTemplateModal,
    showTestContactModal,
    setShowTestContactModal,
    showSendConfirmModal,
    setShowSendConfirmModal,
    showCreateGroupModal,
    setShowCreateGroupModal,
    loadTemplateIntoDraft,
  } = useMessagesStore()

  // Local state
  const [templateName, setTemplateName] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [createGroupType, setCreateGroupType] = useState<'message' | 'recipient'>('message')
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editingContactPhone, setEditingContactPhone] = useState('')

  // Refresh groups from localStorage
  const refreshGroups = () => {
    setGroups(getAllGroups())
    setRecipientGroups(getAllRecipientGroups())
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    
    // Load test contact from localStorage
    const stored = getTestContact()
    if (stored) {
      setTestContact(stored)
    }
    
    // Load groups
    refreshGroups()
    
    setLoading(false)
  }, [router, setTestContact])

  // Load templates when group changes
  useEffect(() => {
    if (selectedGroup) {
      loadTemplates(selectedGroup)
    }
  }, [selectedGroup])

  // Load recipients when recipient group changes
  useEffect(() => {
    if (selectedRecipientGroup) {
      loadRecipients(selectedRecipientGroup)
    }
  }, [selectedRecipientGroup])

  const loadTemplates = async (group: string) => {
    setTemplatesLoading(true)
    try {
      const data = await getLocalTemplates(group)
      setTemplates(data)
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const loadRecipients = async (group: string) => {
    setRecipientsLoading(true)
    try {
      if (group === 'everyone') {
        const data = await getContacts(1, 1000)
        setRecipients(data.contacts || [])
      } else if (group === 'nudge_2') {
        const data = await getGroupMembers('nudge', 2)
        setRecipients(data.members)
      } else if (group === 'nudge_15') {
        const data = await getGroupMembers('nudge', 15)
        setRecipients(data.members)
      } else if (group.startsWith('custom_')) {
        // Custom group - load all contacts (can be filtered later)
        const data = await getContacts(1, 1000)
        setRecipients(data.contacts || [])
      } else {
        const data = await getGroupMembers(group)
        setRecipients(data.members)
      }
    } catch (error) {
      console.error('Failed to load recipients:', error)
      toast.error('Failed to load recipients')
      setRecipients([])
    } finally {
      setRecipientsLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!selectedGroup || !draft.text.trim() || !templateName.trim()) return
    
    const toastId = toast.loading('Saving template...')
    try {
      await createLocalTemplate({
        name: templateName,
        message_text: draft.text,
        category: selectedGroup,
        media_urls: draft.mediaUrls,
        buttons: draft.buttons,
      })
      setTemplateName('')
      setShowTemplateModal(false)
      loadTemplates(selectedGroup)
      toast.success('Template saved!', { id: toastId })
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error('Failed to save template', { id: toastId })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteLocalTemplate(id)
      if (selectedGroup) {
        loadTemplates(selectedGroup)
      }
      toast.success('Template deleted')
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error('Failed to delete template')
    }
  }

  // Submit a local template to Meta for approval
  const handleSubmitToMeta = async (template: Template) => {
    if (!template.id) return
    
    // Only allow submission if template is LOCAL or REJECTED
    if (template.meta_status && !['LOCAL', 'REJECTED'].includes(template.meta_status)) {
      toast.error(`Template is already ${template.meta_status}`)
      return
    }
    
    const toastId = toast.loading('Submitting to Meta for approval...')
    try {
      const result = await submitTemplateToMeta(template.id)
      if (result.success) {
        toast.success(`Template submitted! Status: ${result.status}`, { id: toastId })
        // Refresh templates to show new status
        if (selectedGroup) {
          loadTemplates(selectedGroup)
        }
      } else {
        toast.error(result.error || 'Failed to submit template', { id: toastId })
        console.error('Meta submission error:', result)
      }
    } catch (error) {
      console.error('Failed to submit to Meta:', error)
      toast.error('Failed to submit template to Meta', { id: toastId })
    }
  }

  // Sync all templates with Meta to get latest approval status
  const handleSyncMetaStatus = async () => {
    const toastId = toast.loading('Syncing template status from Meta...')
    try {
      const result = await syncMetaTemplates()
      if (result.success) {
        toast.success(`Synced! Updated ${result.local_updated || 0} templates`, { id: toastId })
        // Refresh templates to show updated status
        if (selectedGroup) {
          loadTemplates(selectedGroup)
        }
      } else {
        toast.error(result.error || 'Failed to sync', { id: toastId })
      }
    } catch (error) {
      console.error('Failed to sync Meta status:', error)
      toast.error('Failed to sync template status', { id: toastId })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    if (draft.mediaUrls.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`)
      return
    }
    
    setUploading(true)
    const toastId = toast.loading('Uploading image...')
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file)
        addMediaUrl(url)
      }
      toast.success('Image uploaded!', { id: toastId })
    } catch (error) {
      console.error('Failed to upload:', error)
      toast.error('Failed to upload image', { id: toastId })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSendTest = async () => {
    if (!testContact || !draft.text.trim()) return
    
    setSending(true)
    const toastId = toast.loading('Sending test message...')
    try {
      const message = replacePlaceholders(draft.text, {
        name: testContact.name,
        phone: testContact.phone,
        last_visit: testContact.last_visit || null,
      })
      
      await sendTestMessage({
        phone: testContact.phone,
        message,
        media_urls: draft.mediaUrls,
      })
      toast.success('Test message sent!', { id: toastId })
    } catch (error) {
      console.error('Failed to send test:', error)
      toast.error('Failed to send test message', { id: toastId })
    } finally {
      setSending(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!selectedRecipientGroup || !draft.text.trim()) return
    
    // Get active recipients + always include test contact
    const activeRecipients = recipients.filter((r) => !excludedIds.has(r.id))
    const recipientPhones = activeRecipients.map((r) => r.phone)
    
    // Include test contact if configured
    if (testContact?.phone && !recipientPhones.includes(testContact.phone)) {
      recipientPhones.push(testContact.phone)
    }
    
    if (recipientPhones.length === 0) {
      toast.error('No recipients selected')
      return
    }
    
    setSending(true)
    const toastId = toast.loading(`Sending to ${recipientPhones.length} recipients...`)
    try {
      const groupType = selectedRecipientGroup === 'everyone' ? 'custom' : 
        selectedRecipientGroup.startsWith('custom_') ? 'custom' :
        selectedRecipientGroup.replace('_', '')
      
      await sendBulkCampaign({
        type: groupType,
        message_text: draft.text,
        media_config: draft.mediaUrls.length > 0 ? {
          fixed_urls: draft.mediaUrls,
          random_pool: [],
          random_count: 0,
        } : undefined,
        buttons: draft.buttons.length > 0 ? draft.buttons : undefined,
        specific_recipients: recipientPhones,
        nudge_days: selectedRecipientGroup === 'nudge_2' ? 2 : selectedRecipientGroup === 'nudge_15' ? 15 : undefined,
      })
      
      setShowSendConfirmModal(false)
      toast.success(`Campaign sent to ${recipientPhones.length} recipients!`, { id: toastId })
    } catch (error) {
      console.error('Failed to send campaign:', error)
      toast.error('Failed to send campaign', { id: toastId })
    } finally {
      setSending(false)
    }
  }

  const insertPlaceholder = (token: string) => {
    setDraft({ text: draft.text + token })
  }

  const saveTestContactData = (data: TestContact) => {
    setTestContact(data)
    saveTestContact(data)
    setShowTestContactModal(false)
    toast.success('Test contact saved')
  }

  const handleCreateGroup = (name: string, description: string) => {
    saveCustomGroup({
      name,
      description,
      type: createGroupType,
    })
    refreshGroups()
    setShowCreateGroupModal(false)
    toast.success(`Group "${name}" created`)
  }

  const handleDeleteGroup = (id: string) => {
    deleteCustomGroup(id)
    refreshGroups()
    if (selectedGroup === id) {
      setSelectedGroup(null)
    }
    if (selectedRecipientGroup === id) {
      setSelectedRecipientGroup(null)
    }
    toast.success('Group deleted')
  }

  const handleUpdateContactPhone = async (contactId: string, newPhone: string) => {
    try {
      await updateContact(contactId, { phone: newPhone })
      // Reload recipients to get updated data
      if (selectedRecipientGroup) {
        loadRecipients(selectedRecipientGroup)
      }
      setEditingContactId(null)
      setEditingContactPhone('')
      toast.success('Phone number updated')
    } catch (error) {
      console.error('Failed to update contact:', error)
      toast.error('Failed to update phone number')
    }
  }

  const handleAddButton = () => {
    if (draft.buttons.length >= MAX_BUTTONS) return
    addButton({ type: 'url', text: '', url: '' })
  }

  // Filter recipients for modal search
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (!recipientSearch.trim()) return true
      const q = recipientSearch.toLowerCase()
      return r.name?.toLowerCase().includes(q) || r.phone.includes(q)
    })
  }, [recipients, recipientSearch])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl p-4">
          <div className="animate-pulse h-[600px] bg-muted rounded-xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Craft and send WhatsApp campaigns
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTestContactModal(true)}
          >
            <Settings className="h-4 w-4 mr-1.5" />
            Test Contact
          </Button>
        </div>

        {/* Three Column Layout - Fixed Widths */}
        <div className="flex gap-5 min-h-[calc(100vh-180px)]">
          {/* Left Column - Groups & Recipients - Fixed 220px */}
          <div className="w-[220px] flex-shrink-0 space-y-4">
            {/* Groups */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Groups
                </h3>
                <button
                  onClick={() => {
                    setCreateGroupType('message')
                    setShowCreateGroupModal(true)
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  title="Create custom group"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                {groups.map((group) => (
                  <div key={group.id} className="group flex items-center">
                    <button
                      onClick={() => {
                        setSelectedGroup(group.id)
                        resetDraft()
                      }}
                      className={`flex-1 text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        selectedGroup === group.id
                          ? 'bg-foreground text-background'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {group.name}
                    </button>
                    {group.isCustom && (
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Recipients
                </h3>
                <button
                  onClick={() => {
                    setCreateGroupType('recipient')
                    setShowCreateGroupModal(true)
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  title="Create custom group"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                {recipientGroups.map((group) => (
                  <div key={group.id} className="group flex items-center">
                    <button
                      onClick={() => {
                        setSelectedRecipientGroup(group.id)
                        setShowRecipientsModal(true)
                      }}
                      className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        selectedRecipientGroup === group.id
                          ? 'bg-foreground text-background'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{group.name}</span>
                      {selectedRecipientGroup === group.id && (
                        <span className="text-[10px] opacity-70">
                          {recipients.filter((r) => !excludedIds.has(r.id)).length}
                        </span>
                      )}
                    </button>
                    {group.isCustom && (
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column - Message Crafting - Flexible */}
          <div className="flex-1 min-w-0 border border-border rounded-lg p-4">
            {selectedGroup ? (
              <div className="h-full flex flex-col">
                <h3 className="text-sm font-medium mb-4">
                  Craft Message — {groups.find((g) => g.id === selectedGroup)?.name}
                </h3>

                {/* Placeholders */}
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    Insert field
                  </p>
                  <div className="flex gap-1.5">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p.token}
                        onClick={() => insertPlaceholder(p.token)}
                        className="px-2 py-1 bg-muted hover:bg-border rounded text-xs font-mono transition-colors"
                        title={p.description}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Text */}
                <Textarea
                  placeholder="Type your message here... Use [Name] for personalization"
                  value={draft.text}
                  onChange={(e) => setDraft({ text: e.target.value })}
                  className="flex-1 min-h-[120px] text-sm"
                />

                {/* CTA Buttons (Multiple) */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Buttons ({draft.buttons.length}/{MAX_BUTTONS})
                    </p>
                    {draft.buttons.length < MAX_BUTTONS && (
                      <button
                        onClick={handleAddButton}
                        className="text-xs text-foreground hover:underline"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  
                  {draft.buttons.map((btn, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <select
                        value={btn.type}
                        onChange={(e) => updateButton(i, { ...btn, type: e.target.value as 'url' | 'phone' })}
                        className="h-8 w-20 rounded border border-border bg-background px-2 text-xs"
                      >
                        <option value="url">URL</option>
                        <option value="phone">Phone</option>
                      </select>
                      <Input
                        placeholder="Button text"
                        value={btn.text}
                        onChange={(e) => updateButton(i, { ...btn, text: e.target.value })}
                        className="flex-1 h-8 text-xs"
                      />
                      <Input
                        placeholder={btn.type === 'url' ? 'https://...' : '+91...'}
                        value={btn.type === 'url' ? btn.url || '' : btn.phone || ''}
                        onChange={(e) => updateButton(i, { 
                          ...btn, 
                          [btn.type === 'url' ? 'url' : 'phone']: e.target.value 
                        })}
                        className="flex-1 h-8 text-xs"
                      />
                      <button
                        onClick={() => removeButton(i)}
                        className="p-1.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Images */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Images ({draft.mediaUrls.length}/{MAX_IMAGES})
                    </p>
                    <label className="cursor-pointer text-xs text-foreground hover:underline">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading || draft.mediaUrls.length >= MAX_IMAGES}
                      />
                      {uploading ? 'Uploading...' : '+ Add'}
                    </label>
                  </div>
                  
                  {draft.mediaUrls.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {draft.mediaUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt=""
                            className="h-12 w-12 object-cover rounded border border-border"
                          />
                          <button
                            onClick={() => removeMediaUrl(i)}
                            className="absolute -top-1 -right-1 h-4 w-4 bg-foreground text-background rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplateModal(true)}
                    disabled={!draft.text.trim()}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={!draft.text.trim() || !testContact || sending}
                    title="Send test to your phone (no approval needed)"
                  >
                    <FlaskConical className="h-3.5 w-3.5 mr-1" />
                    Test
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => setShowSendConfirmModal(true)}
                    disabled={!draft.text.trim() || !selectedRecipientGroup || recipients.length === 0}
                    className="ml-auto"
                    title="Send to selected recipients"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a group to start
              </div>
            )}
          </div>

          {/* Right Column - Templates & Preview - Fixed 280px */}
          <div className="w-[280px] flex-shrink-0 space-y-4">
            {/* Templates */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Templates
                </h3>
                {selectedGroup && templates.length > 0 && (
                  <button
                    onClick={handleSyncMetaStatus}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Refresh status from Meta"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              {/* Legend - only show when there are templates */}
              {selectedGroup && templates.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-2 pb-2 border-b border-border">
                  <div className="flex items-center gap-1" title="Not submitted to Meta">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                    <span className="text-[9px] text-muted-foreground">Draft</span>
                  </div>
                  <div className="flex items-center gap-1" title="Awaiting Meta approval">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    <span className="text-[9px] text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-1" title="Ready to send">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-[9px] text-muted-foreground">Ready</span>
                  </div>
                  <div className="flex items-center gap-1" title="2-10 images = carousel with swipeable cards">
                    <Layers className="h-2.5 w-2.5 text-purple-500" />
                    <span className="text-[9px] text-muted-foreground">Carousel</span>
                  </div>
                </div>
              )}
              
              {!selectedGroup ? (
                <p className="text-xs text-muted-foreground">Select a group</p>
              ) : templatesLoading ? (
                <div className="animate-pulse space-y-1.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No templates yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Write a message and save it as a template
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {templates.map((template) => {
                    const status = template.meta_status || 'LOCAL'
                    const isApproved = status === 'APPROVED'
                    const isPending = status === 'PENDING'
                    const isRejected = status === 'REJECTED'
                    const isLocal = status === 'LOCAL'
                    
                    return (
                      <div
                        key={template.id}
                        className={`group flex items-start justify-between p-2 rounded hover:bg-muted cursor-pointer transition-colors ${
                          isPending ? 'border-l-2 border-yellow-400' : 
                          isApproved ? 'border-l-2 border-green-500' : 
                          isRejected ? 'border-l-2 border-red-500' : ''
                        }`}
                        onClick={() => loadTemplateIntoDraft(template)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium truncate max-w-[100px]">{template.name}</p>
                            <TemplateStatus status={template.meta_status} size="sm" showLabel />
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {template.message_text}
                          </p>
                          {/* Status-specific hint */}
                          {isPending && (
                            <p className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                              Awaiting Meta approval (24-48h)
                            </p>
                          )}
                          {isRejected && (
                            <p className="text-[9px] text-red-600 dark:text-red-400 mt-0.5">
                              Edit and resubmit for approval
                            </p>
                          )}
                          {isLocal && template.media_urls && template.media_urls.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {template.media_urls.length >= 2 ? (
                                <>
                                  <Layers className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                  <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">
                                    Carousel: {template.media_urls.length} images
                                  </p>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  <p className="text-[9px] text-blue-600 dark:text-blue-400">
                                    Header image
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Upload to Meta button - only for LOCAL or REJECTED */}
                          {(isLocal || isRejected) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSubmitToMeta(template)
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded hover:text-blue-600 transition-colors"
                              title={isRejected ? "Resubmit to Meta" : "Submit to Meta for approval"}
                            >
                              <CloudUpload className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTemplate(template.id)
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded hover:text-red-600 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* WhatsApp Preview */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Preview
              </h3>
              
              {/* WhatsApp Chat Background */}
              <div 
                className="rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0b141a 0%, #0b141a 100%)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                <div className="p-3 min-h-[240px]">
                  {draft.text ? (
                    <div className="flex flex-col items-end">
                      {/* Carousel Preview - 2+ images */}
                      {draft.mediaUrls.length >= 2 && (
                        <div className="w-full mb-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Layers className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] text-purple-400 font-medium">
                              Carousel Template • {draft.mediaUrls.length} cards
                            </span>
                          </div>
                          {/* Horizontal scrolling carousel preview */}
                          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                            {draft.mediaUrls.map((url, i) => (
                              <div 
                                key={i}
                                className="flex-shrink-0 w-32 rounded-lg overflow-hidden"
                                style={{ backgroundColor: '#005c4b' }}
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="w-full h-20 object-cover"
                                />
                                <div className="px-2 py-1">
                                  <p className="text-[10px] text-white/80">Card {i + 1}</p>
                                </div>
                                <div 
                                  className="mx-1 mb-1 rounded py-1 text-center text-[9px] text-[#00a5f4]"
                                  style={{ backgroundColor: '#1f2c33' }}
                                >
                                  View Details
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Message Bubble */}
                      <div 
                        className="max-w-[240px] rounded-lg overflow-hidden"
                        style={{ backgroundColor: '#005c4b' }}
                      >
                        {/* Single Image Header (only when 1 image) */}
                        {draft.mediaUrls.length === 1 && (
                          <div className="relative">
                            <img
                              src={draft.mediaUrls[0]}
                              alt=""
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Text Content */}
                        <div className="px-2.5 py-1.5">
                          <p className="text-[13px] text-white leading-[1.35] whitespace-pre-wrap break-words">
                            {replacePlaceholders(draft.text, {
                              name: testContact?.name || 'John',
                              phone: testContact?.phone || '+919999999999',
                              last_visit: testContact?.last_visit || null,
                            })}
                          </p>
                          {/* Timestamp */}
                          <div className="flex justify-end mt-0.5">
                            <span className="text-[10px] text-white/60">
                              {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* CTA Buttons - Below bubble, WhatsApp style */}
                      {draft.buttons.map((btn, i) => (
                        <div 
                          key={i}
                          className="mt-0.5 max-w-[240px] w-full rounded-lg py-2 flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: '#1f2c33' }}
                        >
                          {btn.type === 'url' ? (
                            <ExternalLink className="h-3.5 w-3.5 text-[#00a5f4]" />
                          ) : (
                            <Phone className="h-3.5 w-3.5 text-[#00a5f4]" />
                          )}
                          <span className="text-[13px] text-[#00a5f4] font-medium">
                            {btn.text || 'Button'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-white/40">
                        Preview will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Save Template Modal */}
      <Modal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Save Template"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g., Birthday Wish v1"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          
          {/* Workflow hint */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>What happens next?</strong></p>
            <p>1. Template is saved locally as a draft</p>
            <p>2. Click the upload icon to submit for Meta approval</p>
            <p>3. Once approved, you can send bulk campaigns</p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              Save as Draft
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        type={createGroupType}
        onCreate={handleCreateGroup}
      />

      {/* Recipients Modal */}
      <Modal
        open={showRecipientsModal}
        onClose={() => setShowRecipientsModal(false)}
        title={`Recipients — ${recipientGroups.find((g) => g.id === selectedRecipientGroup)?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Recipients List */}
          {recipientsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          ) : filteredRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recipients found
            </p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto space-y-0.5">
              {filteredRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={!excludedIds.has(recipient.id)}
                      onChange={() => toggleExcluded(recipient.id)}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">{recipient.name || 'Unknown'}</p>
                      <div className="flex items-center gap-2">
                        {editingContactId === recipient.id ? (
                          <>
                            <input
                              type="text"
                              value={editingContactPhone}
                              onChange={(e) => setEditingContactPhone(e.target.value)}
                              className="w-32 h-6 px-1 text-xs border border-border rounded bg-background"
                            />
                            <button
                              onClick={() => handleUpdateContactPhone(recipient.id, editingContactPhone)}
                              className="p-0.5 text-green-500"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingContactId(null)
                                setEditingContactPhone('')
                              }}
                              className="p-0.5 text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">{censorPhone(recipient.phone)}</span>
                            <button
                              onClick={() => {
                                setEditingContactId(recipient.id)
                                setEditingContactPhone(recipient.phone)
                              }}
                              className="p-0.5 opacity-50 hover:opacity-100"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">
                      {recipient.dob && <span>DOB: {formatDate(recipient.dob)}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {recipient.last_message_at ? (
                        <span>Last msg: {formatRelativeTime(recipient.last_message_at)}</span>
                      ) : (
                        <span>No messages</span>
                      )}
                    </div>
                    {recipient.last_message_group && (
                      <div className="text-[10px] text-muted-foreground">
                        Via: {recipient.last_message_group}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {recipients.filter((r) => !excludedIds.has(r.id)).length} of {recipients.length} selected
              {testContact && <span className="ml-1">(+1 test)</span>}
            </p>
            <Button size="sm" onClick={() => setShowRecipientsModal(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Test Contact Modal */}
      <TestContactModal
        open={showTestContactModal}
        onClose={() => setShowTestContactModal(false)}
        initialData={testContact}
        onSave={saveTestContactData}
      />

      {/* Send Confirmation Modal */}
      <Modal
        open={showSendConfirmModal}
        onClose={() => setShowSendConfirmModal(false)}
        title="Confirm Send"
        size="lg"
      >
        <div className="space-y-4">
          {/* Template status warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> For bulk campaigns, templates must be approved by Meta. 
              Test messages can be sent without approval, but campaigns require an approved template.
            </p>
          </div>
          
          <p className="text-sm">
            Sending to <strong>{recipients.filter((r) => !excludedIds.has(r.id)).length}</strong> recipients
            {testContact && <span className="text-muted-foreground"> (+1 test contact)</span>}
          </p>

          {/* Recipients List */}
          <div className="max-h-[280px] overflow-y-auto space-y-0.5 border border-border rounded-lg p-2">
            {testContact && (
              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{testContact.name} (Test)</p>
                  <p className="text-xs text-muted-foreground">{censorPhone(testContact.phone)}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">Always included</span>
              </div>
            )}
            {recipients
              .filter((r) => !excludedIds.has(r.id))
              .map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium">{recipient.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{censorPhone(recipient.phone)}</p>
                  </div>
                  <button
                    onClick={() => toggleExcluded(recipient.id)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setShowSendConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendCampaign} disabled={sending}>
              {sending ? 'Sending...' : 'Send Campaign'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Create Group Modal Component
function CreateGroupModal({
  open,
  onClose,
  type,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  type: 'message' | 'recipient'
  onCreate: (name: string, description: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), description.trim())
    setName('')
    setDescription('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Create ${type === 'message' ? 'Message' : 'Recipient'} Group`}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g., VIP Customers"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Description (optional)"
          placeholder="Brief description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Test Contact Modal Component
function TestContactModal({
  open,
  onClose,
  initialData,
  onSave,
}: {
  open: boolean
  onClose: () => void
  initialData: TestContact | null
  onSave: (data: TestContact) => void
}) {
  const [data, setData] = useState<TestContact>({
    name: '',
    phone: '',
    dob_month: 1,
    dob_day: 1,
    anniversary_month: 1,
    anniversary_day: 1,
    last_visit: '',
  })

  useEffect(() => {
    if (initialData) {
      setData(initialData)
    }
  }, [initialData, open])

  const handleSave = () => {
    if (!data.name.trim() || !data.phone.trim()) return
    onSave(data)
  }

  return (
    <Modal open={open} onClose={onClose} title="Test Contact" size="sm">
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="Test contact name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
        
        <Input
          label="Phone (with country code)"
          placeholder="+919999999999"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
        />

        {/* Last Visit */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Last Visit</label>
          <input
            type="date"
            value={data.last_visit || ''}
            onChange={(e) => setData({ ...data, last_visit: e.target.value })}
            className="w-full h-9 mt-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>

        {/* DOB */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Birthday</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <select
              value={data.dob_month}
              onChange={(e) => setData({ ...data, dob_month: parseInt(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('en', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={data.dob_day}
              onChange={(e) => setData({ ...data, dob_day: parseInt(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Anniversary */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Anniversary</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <select
              value={data.anniversary_month}
              onChange={(e) => setData({ ...data, anniversary_month: parseInt(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('en', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={data.anniversary_day}
              onChange={(e) => setData({ ...data, anniversary_day: parseInt(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!data.name.trim() || !data.phone.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
