import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles =
    'relative px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out ' +
    'flex items-center justify-center min-w-[120px] focus:outline-none focus:ring-2 focus:ring-opacity-75 ';

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    secondary:
      'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${
        loading ? 'opacity-70 cursor-not-allowed' : ''
      } ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  );
};