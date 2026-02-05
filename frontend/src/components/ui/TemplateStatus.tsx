'use client'

import { cn } from '@/lib/utils'

type MetaStatus = 'LOCAL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | null | undefined

interface TemplateStatusProps {
  status: MetaStatus
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  LOCAL: {
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Draft',
    icon: '○',
  },
  PENDING: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Pending',
    icon: '◐',
  },
  APPROVED: {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Ready',
    icon: '●',
  },
  REJECTED: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Rejected',
    icon: '✕',
  },
  PAUSED: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Paused',
    icon: '⏸',
  },
  DISABLED: {
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Disabled',
    icon: '○',
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
        'inline-flex items-center gap-0.5 font-medium rounded-full justify-center',
        sizeClasses,
        config.bg,
        config.color,
        className
      )}
      title={config.label}
    >
      <span className={iconSize}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
