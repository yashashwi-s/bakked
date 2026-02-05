'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { isAuthenticated, formatDateTime } from '@/lib/utils'
import { getContacts, getMessageLogs, getCampaigns, getGroupMembers } from '@/lib/api'
import type { Contact, MessageLog, Campaign } from '@/types'
import { Users, Cake, Heart, Bell, Send, CheckCheck, Eye } from 'lucide-react'

interface Stats {
  totalContacts: number
  todayBirthdays: number
  todayAnniversaries: number
  nudge2Count: number
  nudge15Count: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    todayBirthdays: 0,
    todayAnniversaries: 0,
    nudge2Count: 0,
    nudge15Count: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  })
  const [recentLogs, setRecentLogs] = useState<MessageLog[]>([])
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      // Load all data in parallel
      const [contactsRes, logs, campaigns, birthdays, anniversaries, nudge2, nudge15] = await Promise.all([
        getContacts(1, 1).catch(() => ({ contacts: [], count: 0 })),
        getMessageLogs(20).catch(() => [] as MessageLog[]),
        getCampaigns(5).catch(() => [] as Campaign[]),
        getGroupMembers('birthday').catch(() => ({ members: [], count: 0 })),
        getGroupMembers('anniversary').catch(() => ({ members: [], count: 0 })),
        getGroupMembers('nudge', 2).catch(() => ({ members: [], count: 0 })),
        getGroupMembers('nudge', 15).catch(() => ({ members: [], count: 0 })),
      ])

      // Calculate message stats from logs
      const sent = logs.filter((l) => l.status === 'sent').length
      const delivered = logs.filter((l) => l.status === 'delivered').length
      const read = logs.filter((l) => l.status === 'read').length

      setStats({
        totalContacts: contactsRes.count || 0,
        todayBirthdays: birthdays.count,
        todayAnniversaries: anniversaries.count,
        nudge2Count: nudge2.count,
        nudge15Count: nudge15.count,
        messagesSent: sent,
        messagesDelivered: delivered,
        messagesRead: read,
      })

      setRecentLogs(logs.slice(0, 10))
      setRecentCampaigns(campaigns)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
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
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of your bakery CRM
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalContacts}</p>
                  <p className="text-xs text-muted-foreground">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Cake className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayBirthdays}</p>
                  <p className="text-xs text-muted-foreground">Birthdays Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayAnniversaries}</p>
                  <p className="text-xs text-muted-foreground">Anniversaries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.nudge2Count + stats.nudge15Count}</p>
                  <p className="text-xs text-muted-foreground">Need Nudge</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.messagesSent}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.messagesDelivered}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                  <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.messagesRead}</p>
                  <p className="text-xs text-muted-foreground">Read</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
              ) : (
                <div className="space-y-3">
                  {recentCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(campaign.sent_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{campaign.sent_count}/{campaign.total_recipients}</p>
                        <p className="text-xs text-muted-foreground">sent</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {log.contacts?.name || log.contacts?.phone || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(log.sent_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          log.status === 'read'
                            ? 'success'
                            : log.status === 'delivered'
                            ? 'success'
                            : log.status === 'failed'
                            ? 'danger'
                            : 'muted'
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
