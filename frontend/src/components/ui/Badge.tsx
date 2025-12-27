import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}

const variants = {
  success: 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border-green-400/30',
  warning: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-300 border-yellow-400/30',
  danger: 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-400/30',
  info: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/30',
  purple: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 border-purple-400/30',
  cyan: 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 border-cyan-400/30',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export default function Badge({
  variant = 'info',
  size = 'md',
  children,
  className = '',
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-semibold rounded-full
        border backdrop-blur-sm
        transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            variant === 'success' ? 'bg-green-400' :
            variant === 'warning' ? 'bg-yellow-400' :
            variant === 'danger' ? 'bg-red-400' :
            variant === 'purple' ? 'bg-purple-400' :
            variant === 'cyan' ? 'bg-cyan-400' :
            'bg-blue-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            variant === 'danger' ? 'bg-red-500' :
            variant === 'purple' ? 'bg-purple-500' :
            variant === 'cyan' ? 'bg-cyan-500' :
            'bg-blue-500'
          }`} />
        </span>
      )}
      {children}
    </span>
  );
}
