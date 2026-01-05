import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  variant?: 'default' | 'glass' | 'gradient' | 'neon';
  hover?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variants = {
  default: 'bg-gray-800/50 border-gray-700/50',
  glass: 'bg-white/10 backdrop-blur-xl border-white/10',
  gradient: 'bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border-white/10',
  neon: 'bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border-purple-400/30 shadow-neon-purple',
};

export default function Card({
  variant = 'default',
  hover = true,
  children,
  className = '',
  onClick,
}: CardProps) {
  if (onClick) {
    return (
      <motion.button
        whileHover={hover ? { y: -5, scale: 1.02 } : {}}
        className={`
          relative overflow-hidden
          rounded-2xl p-6
          border
          shadow-xl
          transition-all duration-300
          ${variants[variant]}
          ${hover ? 'hover:shadow-2xl' : ''}
          cursor-pointer
          ${className}
        `}
        onClick={onClick}
      >
        {hover && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
        )}

        {variant === 'neon' && hover && (
          <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400 blur-sm" />
          </div>
        )}

        <div className="relative z-10">{children}</div>
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={hover ? { y: -5, scale: 1.02 } : {}}
      className={`
        relative overflow-hidden
        rounded-2xl p-6
        border
        shadow-xl
        transition-all duration-300
        ${variants[variant]}
        ${hover ? 'hover:shadow-2xl' : ''}
        ${className}
      `}
    >
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      )}

      {variant === 'neon' && hover && (
        <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400 blur-sm" />
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
