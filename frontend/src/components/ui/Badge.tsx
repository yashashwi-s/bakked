'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-foreground text-background': variant === 'default',
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100': variant === 'success',
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100': variant === 'warning',
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100': variant === 'danger',
          'bg-muted text-muted-foreground': variant === 'muted',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
