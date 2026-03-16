import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-[12px] border border-gray-100',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        paddingMap[padding],
        hover
          ? 'transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] cursor-pointer'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

/** Cabeçalho do Card com título e ação opcional */
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-[#1A1A2E]">{title}</h3>
        {subtitle && (
          <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
