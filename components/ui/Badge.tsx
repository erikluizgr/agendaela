type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: {
    bg:   'bg-emerald-50',
    text: 'text-emerald-700',
    dot:  'bg-emerald-500',
  },
  warning: {
    bg:   'bg-amber-50',
    text: 'text-amber-700',
    dot:  'bg-amber-500',
  },
  error: {
    bg:   'bg-red-50',
    text: 'text-red-700',
    dot:  'bg-red-500',
  },
  info: {
    bg:   'bg-blue-50',
    text: 'text-blue-700',
    dot:  'bg-blue-500',
  },
  neutral: {
    bg:   'bg-gray-100',
    text: 'text-gray-600',
    dot:  'bg-gray-400',
  },
  primary: {
    bg:   'bg-purple-50',
    text: 'text-[#B565A7]',
    dot:  'bg-[#B565A7]',
  },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  const styles = variantStyles[variant]

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        styles.bg,
        styles.text,
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} flex-shrink-0`} />
      )}
      {children}
    </span>
  )
}
