'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, disabled, size = 'md' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-green-500' : 'bg-red-400',
        {
          'h-5 w-9': size === 'sm',
          'h-6 w-11': size === 'md',
        }
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200',
          {
            'h-4 w-4': size === 'sm',
            'h-5 w-5': size === 'md',
          },
          checked
            ? size === 'sm'
              ? 'translate-x-4'
              : 'translate-x-5'
            : 'translate-x-0.5',
          'mt-0.5'
        )}
      />
    </button>
  )
}
