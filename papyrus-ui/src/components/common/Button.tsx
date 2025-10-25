// src/components/common/Button.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
  state?: any;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  to,
  params,
  state,
  disabled = false,
  className = '',
  type = "button"
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    
    if (to) {
      let route = to;
      if(params){
          Object.values(params).forEach(value => {
            route += `/${value}`
          });
      }

      if (state) {
        navigate(route, { state });
      } else {
        navigate(route);
      }
    } else if (onClick) {
      onClick();
    }
  };
  // Base styles that all buttons share
  const baseStyles = 'font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white',
    secondary: 'bg-white/50 backdrop-blur-sm hover:bg-white/70 text-amber-900 border border-amber-200/50',
    ghost: 'bg-amber-800/90 hover:bg-amber-900 text-white backdrop-blur-sm',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      className={combinedStyles}
      onClick={handleClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
};

export default Button;