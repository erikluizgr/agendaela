import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#1A1A2E]"
          >
            {label}
            {props.required && (
              <span className="text-[#EF4444] ml-1" aria-hidden>*</span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[#6B7280] pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-xl border bg-white text-[#1A1A2E] placeholder:text-[#9CA3AF]',
              'px-3 py-2.5 text-sm transition-all duration-150 outline-none',
              'focus:ring-2 focus:ring-[#B565A7] focus:border-transparent',
              error
                ? 'border-[#EF4444] focus:ring-[#EF4444]'
                : 'border-[#E5E7EB] hover:border-[#B565A7]',
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 text-[#6B7280]">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[#EF4444] flex items-center gap-1">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-[#6B7280]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
