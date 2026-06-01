'use client'

import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'default',
  size = 'default',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50',
        size === 'default' && 'px-4 py-2 text-sm',
        size === 'sm'      && 'px-3 py-1.5 text-xs',
        size === 'lg'      && 'px-5 py-2.5 text-base',
        variant === 'default'   && 'bg-violet-600 text-white hover:bg-violet-700',
        variant === 'secondary' && 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
        variant === 'danger'    && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'ghost'     && 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  )
}
