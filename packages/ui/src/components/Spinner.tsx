import React from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          animate-spin rounded-full
          border-4 border-gray-200
          border-t-blue-600
        `}
      />
    </div>
  )
}
