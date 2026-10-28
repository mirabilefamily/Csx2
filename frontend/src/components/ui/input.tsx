import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-lg border border-border-strong bg-surface px-3 text-sm max-sm:text-base text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-600'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, 'h-10', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-[88px] py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('block text-sm font-medium text-ink', className)} {...props} />
))
Label.displayName = 'Label'

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-700">
      {children}
    </p>
  )
}
