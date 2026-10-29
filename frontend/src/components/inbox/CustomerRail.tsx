import { Contact, PanelRightClose, PanelRightOpen, Settings2, Sparkles } from 'lucide-react'
import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { LoopMark } from './LoopReturns'
import { Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export const PANEL_SECTIONS = [['ticket', 'Ticket details'], ['customer', 'Customer'], ['past', 'Tickets'], ['shopify', 'Shopify'], ['purchases', 'Purchase summary'], ['orders', 'Orders'], ['loop', 'Loop returns']] as const
export type RailTarget = 'customer' | 'shopify' | 'loop' | 'ask'

interface Props {
  open: boolean
  active: RailTarget
  onToggle: () => void
  onPick: (t: RailTarget) => void
  hidden: string[]
  onHidden: (h: string[]) => void
}

const tile = (on: boolean) => cn('flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'bg-[#F1ECE4] text-ink shadow-[inset_0_0_0_1px_rgba(0,0,0,.03)]' : 'text-ink-muted hover:bg-[#F7F5F1] hover:text-ink')

function RailButton({ label, on, onClick, testId, children }: { label: string; on?: boolean; onClick?: () => void; testId: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} className={tile(!!on)} data-testid={testId}>{children}</button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}

// Always-visible right icon rail for the customer panel (REQ-1084..1090).
export function CustomerRail({ open, active, onToggle, onPick, hidden, onHidden }: Props) {
  const Toggle = open ? PanelRightClose : PanelRightOpen
  return (
    <nav aria-label="Customer panel" className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 border-l border-[#F0ECE6] bg-white py-3" data-testid="customer-rail">
      <RailButton label={open ? 'Hide panel  ]' : 'Show panel  ]'} onClick={onToggle} testId="rail-toggle"><Toggle className="h-4 w-4" strokeWidth={1.75} /></RailButton>
      <span className="my-1 h-px w-6 bg-[#F0ECE6]" aria-hidden />
      <RailButton label="Customer" on={open && active === 'customer'} onClick={() => onPick('customer')} testId="rail-customer"><Contact className="h-4 w-4" strokeWidth={1.75} /></RailButton>
      <RailButton label="Shopify" on={open && active === 'shopify'} onClick={() => onPick('shopify')} testId="rail-shopify"><ShopifyMark size={20} decorative /></RailButton>
      <RailButton label="Loop returns" on={open && active === 'loop'} onClick={() => onPick('loop')} testId="rail-loop"><LoopMark size={18} /></RailButton>
      <span className="my-1 h-px w-6 bg-[#F0ECE6]" aria-hidden />
      <RailButton label="Ask Goorin AI" on={open && active === 'ask'} onClick={() => onPick('ask')} testId="rail-ask"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></RailButton>
      <span className="my-1 h-px w-6 bg-[#F0ECE6]" aria-hidden />
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger className={tile(false)} aria-label="Panel settings" data-testid="rail-settings"><Settings2 className="h-4 w-4" strokeWidth={1.75} /></PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Panel settings</TooltipContent>
        </Tooltip>
        <PopoverContent side="left" align="start" className="w-60 p-2" data-testid="rail-settings-panel">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-ink-muted">Show in panel</p>
          {PANEL_SECTIONS.map(([id, label]) => {
            const on = !hidden.includes(id)
            return (
              <button key={id} type="button" role="switch" aria-checked={on} onClick={() => onHidden(on ? [...hidden, id] : hidden.filter((x) => x !== id))} className="flex h-9 w-full items-center justify-between rounded-md px-2 text-[13px] text-ink transition-colors hover:bg-[#F7F5F1]" data-testid={`rail-section-${id}`}>
                {label}
                <span className={cn('relative h-[18px] w-8 rounded-full transition-colors duration-150', on ? 'bg-tobacco-600' : 'bg-[#E4DFD7]')} aria-hidden>
                  <span className={cn('absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-150', on ? 'translate-x-[16px]' : 'translate-x-[2px]')} />
                </span>
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </nav>
  )
}
