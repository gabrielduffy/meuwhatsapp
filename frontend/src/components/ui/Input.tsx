import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white/80 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              {icon}
            </div>
          )}

          <motion.input
            ref={ref}
            whileFocus={{ scale: 1.01 }}
            className={`
              w-full px-4 py-3 ${icon ? 'pl-10' : ''}
              bg-white/5 backdrop-blur-sm
              border-2 border-white/10
              rounded-lg
              text-white placeholder-white/40
              transition-all duration-300
              focus:outline-none
              focus:border-purple-400/50
              focus:shadow-neon-purple
              focus:bg-white/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-400/50 focus:border-red-400/50 focus:shadow-[0_0_20px_rgba(248,113,113,0.3)]' : ''}
              ${className}
            `}
            {...(props as any)}
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
