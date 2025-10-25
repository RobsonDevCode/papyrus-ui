// src/components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'amber';
  fullScreen?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'amber',
  fullScreen = false,
  message 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  const colorClasses = {
    white: 'border-white border-t-transparent',
    amber: 'border-amber-600 border-t-transparent'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
      />
      {message && (
        <p className={`text-sm ${color === 'white' ? 'text-white' : 'text-amber-700'}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 rounded-2xl p-8 shadow-2xl">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;