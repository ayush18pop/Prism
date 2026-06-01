import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-zinc-800 bg-zinc-900 p-5', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: CardProps) {
  return <h3 className={cn('text-sm font-semibold text-zinc-400 uppercase tracking-wider', className)} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('space-y-3', className)} {...props} />
}
