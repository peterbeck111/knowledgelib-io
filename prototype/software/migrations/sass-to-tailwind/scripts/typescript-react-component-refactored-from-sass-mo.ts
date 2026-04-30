// Input:  React component using CSS Modules with Sass (.module.scss)
// Output: Same component using Tailwind utility classes

// BEFORE: Button.module.scss
// .button {
//   @include button-base;
//   &--primary { background: $primary; color: white; }
//   &--secondary { background: $secondary; color: white; }
//   &--disabled { opacity: 0.5; cursor: not-allowed; }
// }

// BEFORE: Button.tsx with CSS Modules
// import styles from './Button.module.scss';
// <button className={`${styles.button} ${styles[`button--${variant}`]}`}>

// AFTER: Button.tsx with Tailwind (no separate stylesheet needed)
import { type ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-900 focus:ring-brand-500',
  secondary: 'bg-secondary text-white hover:bg-secondary/80 focus:ring-secondary',
  ghost: 'bg-transparent text-brand-500 hover:bg-brand-50 focus:ring-brand-500',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = 'primary', className = '', disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2
        font-medium transition-colors duration-150
        focus:outline-2 focus:outline-offset-2
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
