import Image from 'next/image'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: AvatarSize
  className?: string
}

const sizeMap: Record<AvatarSize, { container: string; text: string; px: number }> = {
  xs: { container: 'w-6 h-6',   text: 'text-xs',  px: 24 },
  sm: { container: 'w-8 h-8',   text: 'text-sm',  px: 32 },
  md: { container: 'w-10 h-10', text: 'text-sm',  px: 40 },
  lg: { container: 'w-12 h-12', text: 'text-base', px: 48 },
  xl: { container: 'w-16 h-16', text: 'text-lg',  px: 64 },
}

/** Extrai as iniciais do nome para o fallback */
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Gera uma cor de fundo consistente a partir do nome */
function getColorFromName(name: string): string {
  const colors = [
    'bg-[#B565A7]', 'bg-[#7C5CBF]', 'bg-[#F4A5C8]',
    'bg-pink-400', 'bg-purple-500', 'bg-violet-500',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const { container, text, px } = sizeMap[size]
  const initials = name ? getInitials(name) : '?'
  const bgColor = name ? getColorFromName(name) : 'bg-gray-400'

  if (src) {
    return (
      <div className={`${container} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          width={px}
          height={px}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`${container} ${bgColor} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      aria-label={name ?? 'Usuária'}
    >
      <span className={`${text} font-semibold text-white leading-none`}>
        {initials}
      </span>
    </div>
  )
}
