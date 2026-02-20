import React from 'react';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', ...props }, ref) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'glass hover:bg-white/10 text-white',
  };
  
  const sizes = {
    default: '',
    sm: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size] || ''} ${className || ''}`}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button };
