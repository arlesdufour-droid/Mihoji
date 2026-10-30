import type { ElementType, ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SignatureCardProps<T extends ElementType = 'section'> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export function SignatureCard<T extends ElementType = 'section'>({ as, className, children, ...props }: SignatureCardProps<T>) {
  const Component = as || 'section';
  return <Component className={cn('rounded-2xl border-2 border-slate-700 bg-slate-900 shadow-[0_3px_0_0_rgba(51,65,85,1)]', className)} {...props}>{children}</Component>;
}
