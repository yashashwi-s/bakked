'use client'

import { cn } from '@/lib/utils'

type MetaStatus = 'LOCAL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | null | undefined

interface TemplateStatusProps {
  status: MetaStatus
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: string; tooltip: string }> = {
  LOCAL: {
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Draft',
    icon: '○',
    tooltip: 'Local draft - Not submitted to Meta',
  },
  PENDING: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Pending',
    icon: '◐',
    tooltip: 'Pending Meta approval (usually 24-48 hours)',
  },
  APPROVED: {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Ready',
    icon: '●',
    tooltip: 'Approved by Meta - Ready to send',
  },
  REJECTED: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Rejected',
    icon: '✕',
    tooltip: 'Rejected by Meta - Edit and resubmit',
  },
  PAUSED: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Paused',
    icon: '⏸',
    tooltip: 'Paused due to quality issues',
  },
  DISABLED: {
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Disabled',
    icon: '○',
    tooltip: 'Template is disabled',
  },
}

export function TemplateStatus({ status, className, showLabel = false, size = 'md' }: TemplateStatusProps) {
  const config = statusConfig[status || 'LOCAL'] || statusConfig.LOCAL
  
  const sizeClasses = size === 'sm' 
    ? showLabel ? 'px-1.5 py-0.5 text-[10px]' : 'w-3.5 h-3.5'
    : showLabel ? 'px-2 py-0.5 text-xs' : 'w-5 h-5'
  
  const iconSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]'
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium rounded-full justify-center cursor-help',
        sizeClasses,
        config.bg,
        config.color,
        status === 'PENDING' && 'animate-pulse',
        className
      )}
      title={config.tooltip}
    >
      <span className={iconSize}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
