import * as React from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuRadioGroup = Menu.RadioGroup

export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof Menu.Content>, React.ComponentPropsWithoutRef<typeof Menu.Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <Menu.Portal>
      <Menu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn('z-[60] min-w-[220px] overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', className)}
        {...props}
      />
    </Menu.Portal>
  ),
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

const itemBase = 'relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink outline-none transition-colors data-[highlighted]:bg-surface-muted data-[highlighted]:ring-2 data-[highlighted]:ring-ring/60 data-[disabled]:opacity-50 [&_svg]:size-4'

export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof Menu.Item>, React.ComponentPropsWithoutRef<typeof Menu.Item>>(
  ({ className, ...props }, ref) => <Menu.Item ref={ref} className={cn(itemBase, className)} {...props} />,
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuRadioItem = React.forwardRef<React.ElementRef<typeof Menu.RadioItem>, React.ComponentPropsWithoutRef<typeof Menu.RadioItem>>(
  ({ className, children, ...props }, ref) => (
    <Menu.RadioItem ref={ref} className={cn(itemBase, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <Menu.ItemIndicator>
          <Check className="text-tobacco-600" aria-hidden />
        </Menu.ItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  ),
)
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export const DropdownMenuCheckboxItem = React.forwardRef<React.ElementRef<typeof Menu.CheckboxItem>, React.ComponentPropsWithoutRef<typeof Menu.CheckboxItem>>(
  ({ className, children, ...props }, ref) => (
    <Menu.CheckboxItem ref={ref} className={cn(itemBase, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <Menu.ItemIndicator>
          {props.checked === 'indeterminate' ? <Minus className="text-tobacco-600" aria-hidden /> : <Check className="text-tobacco-600" aria-hidden />}
        </Menu.ItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  ),
)
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export const DropdownMenuSub = Menu.Sub
export const DropdownMenuSubTrigger = React.forwardRef<React.ElementRef<typeof Menu.SubTrigger>, React.ComponentPropsWithoutRef<typeof Menu.SubTrigger>>(
  ({ className, children, ...props }, ref) => (
    <Menu.SubTrigger ref={ref} className={cn(itemBase, 'data-[state=open]:bg-surface-muted', className)} {...props}>
      {children}
      <ChevronRight className="ml-auto text-ink-muted" aria-hidden />
    </Menu.SubTrigger>
  ),
)
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'
export const DropdownMenuSubContent = React.forwardRef<React.ElementRef<typeof Menu.SubContent>, React.ComponentPropsWithoutRef<typeof Menu.SubContent>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <Menu.Portal>
      <Menu.SubContent ref={ref} sideOffset={sideOffset} className={cn('z-[60] min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-popover data-[state=open]:animate-in data-[state=open]:fade-in-0', className)} {...props} />
    </Menu.Portal>
  ),
)
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

export const DropdownMenuLabel = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof Menu.Label>) => (
  <Menu.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-ink-muted', className)} {...p} />
)

export const DropdownMenuSeparator = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof Menu.Separator>) => (
  <Menu.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...p} />
)
