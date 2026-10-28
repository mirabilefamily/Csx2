import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, ShoppingBag, ThumbsDown, ThumbsUp, Truck, X } from 'lucide-react'
import type { WidgetSettings } from '@/types'

// Mock feedback log for thumbs (REQ-787); nothing is sent.
export const feedbackLog: { at: number; bot: string; value: 'up' | 'down' | null }[] = []
const recordFeedback = (bot: string, value: 'up' | 'down' | null) => { feedbackLog.push({ at: Date.now(), bot, value }) }

// Floating top controls (REQ-779): Back (conversation), Cart, Track orders pill, Close.
export function FloatingBar({ s, onBack, onCart, onTrack, onClose }: { s: WidgetSettings; onBack?: () => void; onCart: () => void; onTrack: () => void; onClose: () => void }) {
  return (
    <div className="gw-float" data-testid="widget-float-bar">
      {onBack && <button type="button" className="gw-fbtn" onClick={onBack} aria-label="Back to home" data-testid="widget-back"><ArrowLeft size={18} aria-hidden /></button>}
      <span className="gw-float-spacer" />
      {s.home.cart.enabled && <button type="button" className="gw-fbtn" onClick={onCart} aria-label={s.home.cart.label || 'Cart'} data-testid="widget-cart"><ShoppingBag size={18} aria-hidden /></button>}
      {s.home.track.enabled && <button type="button" className="gw-fbtn is-pill" onClick={onTrack} data-testid="widget-track"><Truck size={16} aria-hidden />{s.home.track.label || 'Track orders'}</button>}
      <button type="button" className="gw-fbtn" onClick={onClose} aria-label="Close chat" data-testid="widget-close"><X size={18} aria-hidden /></button>
    </div>
  )
}

export function PillInput({ placeholder, disabled, onSend, autoFocus }: { placeholder: string; disabled?: boolean; onSend: (t: string) => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const send = () => { if (!text.trim() || disabled) return; onSend(text.trim()); setText('') }
  return (
    <div className="gw-pill-input">
      <label className="gw-sr" htmlFor="gw-composer-input">{placeholder}</label>
      <input id="gw-composer-input" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }} {...(autoFocus ? { 'data-autofocus': '' } : {})} data-testid="widget-composer-input" />
      <button type="button" className="gw-attach" aria-label="Attach an image" data-testid="widget-attach"><ImagePlus size={20} aria-hidden /></button>
      {text.trim() && <button type="button" className="gw-send" disabled={disabled} onClick={send} aria-label="Send message" data-testid="widget-send"><ArrowUp size={18} aria-hidden /></button>}
    </div>
  )
}

export function HomeView({ s, greeting, hasLast, onStarter, onLast }: { s: WidgetSettings; greeting: string; hasLast: boolean; onStarter: (id: string) => void; onLast: () => void }) {
  return (
    <div className="gw-home" data-testid="widget-home">
      {greeting && <p className="gw-home-greeting" data-testid="widget-home-greeting">{greeting}</p>}
      <div className="gw-starters" role="group" aria-label="Conversation starters" data-testid="widget-starters">
        {s.home.starters.map((st) => <button key={st.id} type="button" className="gw-starter" onClick={() => onStarter(st.id)} data-testid={`widget-starter-${st.id}`}>{st.label}</button>)}
        {hasLast && s.home.showLastConversation && <button type="button" className="gw-starter" onClick={onLast} data-testid="widget-starter-last">See last conversation</button>}
      </div>
    </div>
  )
}

export function ScrollLatest({ onClick }: { onClick: () => void }) {
  return <button type="button" className="gw-latest" onClick={onClick} aria-label="Scroll to latest message" data-testid="widget-scroll-latest"><ArrowDown size={18} aria-hidden /></button>
}

export function Thumbs({ label }: { label: string }) {
  const [v, setV] = useState<'up' | 'down' | null>(null)
  const pick = (x: 'up' | 'down') => { const next = v === x ? null : x; setV(next); recordFeedback(label, next) }
  return (
    <div className="gw-thumbs" role="group" aria-label={`Rate this reply from ${label}`} data-testid="widget-thumbs">
      <button type="button" className={`gw-thumb${v === 'up' ? ' is-on' : ''}`} aria-pressed={v === 'up'} aria-label="Helpful" onClick={() => pick('up')} data-testid="widget-thumb-up"><ThumbsUp size={15} aria-hidden /></button>
      <button type="button" className={`gw-thumb${v === 'down' ? ' is-on' : ''}`} aria-pressed={v === 'down'} aria-label="Not helpful" onClick={() => pick('down')} data-testid="widget-thumb-down"><ThumbsDown size={15} aria-hidden /></button>
    </div>
  )
}

export function NoticeSheet({ s, onClose }: { s: WidgetSettings; onClose: () => void }) {
  return (
    <div className="gw-sheet" role="dialog" aria-label="AI notice" data-testid="widget-ai-notice">
      <p className="gw-sheet-title">AI notice</p>
      <p>You're chatting with Goorin's AI assistant. A person can take over anytime.</p>
      <p><a className="gw-link" href="https://goorin.com/policies/privacy-policy" target="_blank" rel="noreferrer" data-testid="widget-notice-privacy">Privacy policy</a></p>
      <button type="button" className="gw-primary" onClick={onClose} data-autofocus="" data-testid="widget-notice-close">Got it</button>
    </div>
  )
}

export function CartDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="gw-sheet" role="dialog" aria-label="Your cart" data-testid="widget-cart-drawer">
      <p className="gw-sheet-title">Your cart · 1 item</p>
      <div className="gw-order-card"><strong>The Panther Trucker</strong><span>Black / One size · $48.00</span></div>
      <button type="button" className="gw-primary" onClick={onClose} data-autofocus="" data-testid="widget-cart-close">Keep shopping</button>
    </div>
  )
}

export function WidgetFooter({ onNotice }: { onNotice: () => void }) {
  return (
    <p className="gw-legal" data-testid="widget-legal">
      <button type="button" onClick={onNotice} data-testid="widget-ai-notice-open">AI notice</button> • <a href="https://goorin.com/policies/privacy-policy" target="_blank" rel="noreferrer" data-testid="widget-privacy">Privacy</a>
    </p>
  )
}
