import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-black text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-500 dark:text-white dark:hover:bg-red-600',
        outline:
          'rounded-sm border border-neutral-300 bg-background hover:bg-neutral-50 hover:text-accent-foreground dark:border-neutral-700 dark:bg-black dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800',
        ghost: 'border-neutral-300 hover:bg-neutral-50 hover:text-accent-foreground dark:border-neutral-700 dark:hover:bg-neutral-900/50 dark:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline dark:text-neutral-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
