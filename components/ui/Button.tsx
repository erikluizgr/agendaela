import { ButtonHTMLAttributes, forwardRef } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#B565A7] text-white',
    'hover:bg-[#9A4A8E] active:bg-[#8A3A7E]',
    'focus-visible:ring-2 focus-visible:ring-[#B565A7] focus-visible:ring-offset-2',
    'disabled:bg-[#CC86BF] disabled:cursor-not-allowed',
    'shadow-sm',
  ].join(' '),

  secondary: [
    'bg-[#7C5CBF] text-white',
    'hover:bg-[#5E44A3] active:bg-[#4E3493]',
    'focus-visible:ring-2 focus-visible:ring-[#7C5CBF] focus-visible:ring-offset-2',
    'disabled:bg-[#9B7ED4] disabled:cursor-not-allowed',
    'shadow-sm',
  ].join(' '),

  ghost: [
    'bg-transparent text-[#1A1A2E]',
    'hover:bg-gray-100 active:bg-gray-200',
    'border border-gray-200',
    'focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-[#EF4444] text-white',
    'hover:bg-red-600 active:bg-red-700',
    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2',
    'disabled:bg-red-300 disabled:cursor-not-allowed',
    'shadow-sm',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 outline-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <LoadingSpinner
            size={size === 'lg' ? 'md' : 'sm'}
            className="text-current opacity-80"
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
