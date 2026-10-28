import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { viewsApi, widgetApi, workflowsApi } from '@/api'
import { replyRun, startRun } from '@/lib/workflowRuntime'
import type { CsatQuestion, StorePageType, TestRun, WidgetCustomer, WidgetSettings, WidgetState, Workflow } from '@/types'
import { ShadowRoot } from './ShadowRoot'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import { GreetingBubble, Launcher, launcherSize } from './Launcher'
import { CartDrawer, FloatingBar, HomeView, NoticeSheet, PillInput, WidgetFooter } from './Home'
import { MessageList, type ChatMsg } from './ChatView'
import { toast } from 'sonner'
import { OfflineView, PreChatForm, type Identity } from './Forms'
import { CsatView, TranscriptSent } from './CsatView'
import { hiddenReason } from '@/lib/widgetRules'

export interface SupportWidgetProps {
  settings: WidgetSettings
  // 'live' pins to the viewport; 'contained' positions inside the nearest positioned parent (phase-5 device frame).
  mode?: 'live' | 'contained'
  // Initial state to render (demo jumps / admin preview). The widget stays interactive afterwards.
  forcedState?: WidgetState
  pageType?: StorePageType
  pagePath?: string
  loggedIn?: boolean
  outsideHours?: boolean
  viewport?: 'auto' | 'desktop' | 'mobile'
  // Styleguide only: start with the typing indicator showing.
  typing?: boolean
}

type View = 'home' | 'prechat' | 'chat' | 'offline' | 'csat' | 'transcript' | null
type Bubble = 'hidden' | 'shown' | 'dismissed'

const SHADOWS = {
  none: 'none',
  soft: '0 16px 40px rgba(31, 29, 26, 0.16), 0 2px 6px rgba(31, 29, 26, 0.08)',
  strong: '0 28px 70px rgba(31, 29, 26, 0.34), 0 6px 16px rgba(31, 29, 26, 0.18)',
}
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
let seq = 0
const uid = () => `wm-${++seq}`
const greetingFor = (s: WidgetSettings, first: string | null) => (first ? `Hi ${first}! ${s.messaging.greeting}` : s.messaging.greeting)

function initialState(s: WidgetSettings, forced?: WidgetState, loggedIn?: boolean) {
  const now = Date.now()
  const greet: ChatMsg = { id: uid(), author: 'ai', kind: 'greeting', text: greetingFor(s, null), at: now - 120_000 }
  const sample: ChatMsg[] = [
    greet,
    { id: uid(), author: 'customer', text: 'Where is my order #GB20411?', at: now - 90_000 },
    {
      id: uid(),
      author: 'ai',
      text: "I found order #GB20411. It's on its way with UPS.",
      at: now - 80_000,
      order: { number: '#GB20411', status: 'in_transit', productTitle: 'The Panther Trucker', variant: 'Black / One size', image: '/images/products/trucker-hat.jpg', carrier: 'UPS', trackingUrl: 'https://tracking.example.com/ups/1Z20411', eta: new Date(now + 2 * 86_400_000).toISOString() },
    },
  ]
  const base = { open: true, bubble: 'dismissed' as Bubble, view: 'chat' as View, messages: sample, handoff: false, transcriptTo: null as string | null }
  switch (forced) {
    case undefined:
      return { ...base, open: false, bubble: 'hidden' as Bubble, view: null, messages: [] }
    case 'launcher_closed':
      return { ...base, open: false, view: null, messages: [] }
    case 'home':
      return { ...base, view: 'home' as View, messages: [] }
    case 'order_tracking':
      return { ...base, messages: [
        { id: uid(), author: 'customer' as const, text: 'Where is my order?', at: now - 60_000 },
        { id: uid(), author: 'ai' as const, text: "Here are your recent orders. Your Panther Trucker is on its way.", at: now - 50_000, runOrders: [{ number: '#GB20411', date: 'Oct 2', items: 'The Panther Trucker', status: 'Shipped via UPS', total: 48, carrier: 'UPS', trackingUrl: 'https://tracking.example.com/ups/1Z20411' }, { number: '#GB20398', date: 'Sep 14', items: 'Hampton Wool Fedora', status: 'Delivered', total: 148, carrier: null, trackingUrl: null }] },
      ] }
    case 'greeting_bubble':
      return { ...base, open: false, bubble: 'shown' as Bubble, view: null, messages: [] }
    case 'prechat':
      return { ...base, view: 'prechat' as View, messages: [] }
    case 'active_chat':
      return base
    case 'handoff':
      return {
        ...base,
        handoff: true,
        messages: [
          ...sample,
          { id: uid(), author: 'customer' as const, text: 'I want to talk to a person', at: now - 30_000 },
          { id: uid(), author: 'ai' as const, text: "Of course. I'm bringing in one of our hatters, and they'll have this whole conversation in front of them.", at: now - 20_000 },
          { id: uid(), author: 'ai' as const, kind: 'handoff' as const, text: s.messaging.handoffMessage, at: now - 20_000 },
          { id: uid(), author: 'agent' as const, text: "Hi, it's Sam from the Goorin shop. I'm reading through now.", at: now - 5_000 },
        ],
      }
    case 'offline':
      return { ...base, view: 'offline' as View, messages: [] }
    case 'csat':
      return { ...base, view: 'csat' as View }
    case 'transcript_sent':
      return { ...base, view: 'transcript' as View, transcriptTo: loggedIn ? null : 'you@example.com' }
  }
}

function useWidth(mode: 'live' | 'contained', el: HTMLElement | null) {
  const [width, setWidth] = useState(() => (mode === 'live' ? window.innerWidth : 1024))
  useEffect(() => {
    if (mode === 'live') {
      const on = () => setWidth(window.innerWidth)
      window.addEventListener('resize', on)
      return () => window.removeEventListener('resize', on)
    }
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode, el])
  return width
}

function WidgetApp({ settings: s, mode = 'live', forcedState, pageType = 'other', pagePath, loggedIn = false, outsideHours = false, viewport = 'auto', typing: startTyping = false, inheritFont }: SupportWidgetProps & { inheritFont: string }) {
  const init = useMemo(() => initialState(s, forcedState, loggedIn), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState(init.open)
  const [view, setView] = useState<View>(init.view)
  const [bubble, setBubble] = useState<Bubble>(init.bubble)
  const [messages, setMessages] = useState<ChatMsg[]>(init.messages)
  const [handoff, setHandoff] = useState(init.handoff)
  const [wfRun, setWfRun] = useState<TestRun | null>(null)
  const wfRef = useRef<Workflow | null>(null)
  const [transcriptTo, setTranscriptTo] = useState(init.transcriptTo)
  const [unread, setUnread] = useState(forcedState && init.open ? 0 : 1)
  const [typing, setTyping] = useState(startTyping)
  const [notice, setNotice] = useState<'ai' | 'cart' | null>(null)
  const [last, setLast] = useState<ChatMsg[] | null>(null)
  const [identity, setIdentity] = useState<Identity>({ email: null, name: null, orderNumber: null })
  const [customer, setCustomer] = useState<WidgetCustomer | null>(null)
  const [questions, setQuestions] = useState<CsatQuestion[] | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [bounce, setBounce] = useState(false)
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef(open)
  const focusIntoPanel = useRef(false)
  openRef.current = open

  const width = useWidth(mode, rootEl)
  const isMobile = viewport === 'mobile' || (viewport === 'auto' && width < 640)
  const isSheet = open && isMobile
  const offlineActive = outsideHours && s.display.outsideHours === 'offline_form'
  const pre = s.messaging.preChat
  const needsPrechat = !loggedIn && s.conversation.askEmailFirst && !identity.email
  const firstName = customer?.firstName ?? identity.name?.split(' ')[0] ?? null
  const knownEmail = identity.email ?? customer?.email ?? null

  useEffect(() => {
    if (!loggedIn) return
    widgetApi.getLoggedInCustomer().then(setCustomer, () => setCustomer(null))
  }, [loggedIn])

  useEffect(() => {
    if (view !== 'csat' || questions) return
    widgetApi.getWidgetCsatQuestions().then(setQuestions, () => setQuestions([]))
  }, [view, questions])

  // Greeting goes in when a conversation starts, and follows the customer's name once known.
  useEffect(() => {
    if (view === 'chat' && messages.length === 0) setMessages([{ id: uid(), author: 'ai', kind: 'greeting', text: greetingFor(s, firstName), at: Date.now() }])
  }, [view, messages.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMessages((ms) => ms.map((m) => (m.kind === 'greeting' ? { ...m, text: greetingFor(s, firstName) } : m)))
    const g = messages.find((m) => m.kind === 'greeting')
    if (g && open) setAnnouncement(`Goorin assistant: ${greetingFor(s, firstName)}`)
  }, [firstName, s.messaging.greeting]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = s.messaging.proactive
    if (bubble !== 'hidden' || open || !p.enabled || !p.pages.includes(pageType)) return
    const t = setTimeout(() => setBubble('shown'), p.delaySec * 1000)
    return () => clearTimeout(t)
  }, [bubble, open, pageType, s.messaging.proactive])

  useEffect(() => {
    if (s.launcher.animation !== 'bounce' || open) return
    const t = setTimeout(() => setBounce(true), s.launcher.bounceAfterSec * 1000)
    return () => clearTimeout(t)
  }, [open, s.launcher.animation, s.launcher.bounceAfterSec])

  useEffect(() => {
    if (mode !== 'live' || !isSheet) return
    const html = document.documentElement
    const prev = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev[0]
      document.body.style.overflow = prev[1]
    }
  }, [mode, isSheet])

  useEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const root = panel.getRootNode() as ShadowRoot
    if (!focusIntoPanel.current && !panel.contains(root.activeElement)) return
    focusIntoPanel.current = false
    const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
  }, [open, view])

  const openPanel = () => {
    focusIntoPanel.current = true
    setOpen(true)
    setUnread(0)
    setBubble('dismissed')
    setBounce(false)
    if (mode === 'contained' && forcedState) {
      // Preview: reopening always returns to the selected view.
      const f = initialState(s, forcedState, loggedIn)
      if (f.open) { setView(f.view); setMessages(f.messages); setHandoff(f.handoff); setWfRun(null); wfRef.current = null; return }
    }
    if (!view) setView(offlineActive ? 'offline' : 'home')
  }
  const closePanel = () => {
    setOpen(false)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }

  // Home actions: starters, Track orders, Cart, last conversation (REQ-787..790). MOCKED.
  const startChat = (text: string, wf?: Workflow | null) => {
    if (needsPrechat) { pendingRef.current = text; setView('prechat'); return }
    setView('chat')
    if (messages.length > 1) setLast(messages)
    setMessages((m) => m.filter((x) => x.kind === 'greeting'))
    setWfRun(null); wfRef.current = null
    send(text, undefined, wf, true)
  }
  const pendingRef = useRef<string | null>(null)
  const onStarter = (id: string) => {
    const st = s.home.starters.find((x) => x.id === id)
    if (!st) return
    if (st.action === 'link' && st.url) { window.open(st.url, '_blank', 'noopener'); return }
    const wf = st.action === 'workflow' && st.workflowId ? workflowsApi.activeWorkflowById(st.workflowId) : null
    startChat(st.label, wf ?? undefined)
  }
  const onCart = () => (mode === 'contained' ? toast('Cart opens here on your store') : setNotice('cart'))
  const goHome = () => { if (messages.length > 1) setLast(messages); setView('home') }

  const send = async (text: string, retry?: ChatMsg, forceWf?: Workflow | null, fresh = false) => {
    const msg = retry ?? { id: uid(), author: 'customer' as const, text, at: Date.now() }
    setMessages((ms) => (retry ? ms.map((m) => (m.id === msg.id ? { ...m, failed: false } : m)) : [...ms, msg]))
    // Active "Order tracking" workflow runs order-status questions (REQ-757). MOCKED.
    const deps = { findOrders: workflowsApi.findOrdersByEmail, handoverText: s.messaging.handoffMessage, resolve: workflowsApi.resolveLive, refundLimit: viewsApi.autoRefundLimit() }
    let next: TestRun | null = null
    let seen = 0
    if (!fresh && wfRun && !wfRun.ended && wfRef.current) { next = replyRun(wfRef.current, wfRun, msg.text, deps); seen = wfRun.chat.length + 1 }
    else if (!retry) { const wf = forceWf ?? workflowsApi.activeWorkflowFor(msg.text); if (wf) { wfRef.current = wf; next = startRun(wf, 'chat', deps, undefined, msg.text); seen = 1 } }
    if (next) {
      const add: ChatMsg[] = next.chat.slice(seen).filter((m) => m.from === 'bot').map((m) => ({ id: uid(), author: 'ai' as const, at: Date.now(), text: [m.text, m.buttons ? `Reply: ${m.buttons.join(' / ')}` : ''].filter(Boolean).join('\n'), runOrders: m.orders, link: m.link }))
      setWfRun(next)
      setMessages((ms) => [...ms, ...add])
      setAnnouncement(add.map((a) => a.text).join(' '))
      if (next.ended?.startsWith('handed')) setHandoff(true)
      return
    }
    setTyping(true)
    try {
      const r = await widgetApi.sendChatMessage(msg.text, { email: knownEmail, orderNumber: identity.orderNumber, pageType })
      const add: ChatMsg[] = [{ id: uid(), author: 'ai', text: r.text, at: Date.now(), order: r.order }]
      let say = `Goorin assistant: ${r.text}`
      if (r.handoff && !handoff) {
        add.push({ id: uid(), author: 'ai', kind: 'handoff', text: s.messaging.handoffMessage, at: Date.now() })
        setHandoff(true)
        say += ` ${s.messaging.handoffMessage}. ${s.messaging.handoffResponseTime}`
      }
      setMessages((ms) => [...ms, ...add])
      setAnnouncement(say)
      if (!openRef.current) setUnread((u) => u + 1)
    } catch {
      setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, failed: true } : m)))
      setAnnouncement("Your message couldn't be sent.")
    }
    setTyping(false)
  }

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      return closePanel()
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const active = (panelRef.current.getRootNode() as ShadowRoot).activeElement
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
      e.preventDefault()
      first.focus()
    }
  }

  const path = pagePath ?? (mode === 'live' ? window.location.pathname : '')
  const hidden = !!hiddenReason(s, { pageType, pagePath: path, isMobile, outsideHours })
  const pro = s.messaging.proactive
  const bubbleAllowed = pro.enabled && pro.pages.includes(pageType)
  const ctx = s.display.customerContext
  const shared = [ctx.loggedInCustomer && 'your account', ctx.currentProduct && 'the product you are viewing', ctx.cartContents && 'your cart'].filter(Boolean)
  const contextNote = shared.length ? `The assistant can see ${shared.join(', ')}.` : "The assistant doesn't see your account or cart."

  const side = s.launcher.position.endsWith('left') ? 'left' : 'right'
  const vert = s.launcher.position.startsWith('top') ? 'top' : 'bottom'
  const off = isMobile ? s.launcher.mobileOffset : s.launcher.offset
  const size = launcherSize(s.launcher)
  const vars = {
    '--gw-primary': s.branding.colors.primary,
    '--gw-accent': s.branding.colors.accent,
    '--gw-header-bg': s.branding.colors.headerBackground,
    '--gw-header-text': s.branding.colors.headerText,
    '--gw-bg': '#FAF8F5',
    '--gw-panel': s.branding.panelColor,
    '--gw-text': '#1F1D1A',
    '--gw-customer-bubble': s.branding.colors.customerBubble,
    '--gw-link': s.branding.colors.link,
    '--gw-ai-bubble': s.branding.colors.aiBubble,
    '--gw-radius': `${s.branding.radius}px`,
    '--gw-shadow': SHADOWS[s.branding.shadow],
    '--gw-font': s.branding.font === 'inter' ? "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" : inheritFont,
    '--gw-launcher-bg': s.launcher.buttonColor === 'panel' ? s.branding.panelColor : s.launcher.backgroundColor,
    '--gw-launcher-fg': s.launcher.iconColor,
    '--gw-badge': s.launcher.badgeColor,
  } as CSSProperties
  const panelStyle: CSSProperties = isSheet
    ? {}
    : { [side]: off.x, [vert]: off.y + size + 16, height: `min(${view === 'home' ? 580 : 680}px, calc(100% - ${off.y + size + 32}px))`, maxWidth: `calc(100% - ${off.x * 2}px)` }
  const animation = bounce ? 'anim-bounce' : s.launcher.animation === 'pulse_once' && !open ? 'anim-pulse' : ''

  return (
    <div ref={setRootEl} className={`gw-root${mode === 'contained' ? ' is-contained' : ''}`} style={vars} data-testid="widget-root" data-state={hidden ? 'hidden' : open ? view ?? 'open' : bubble === 'shown' ? 'greeting_bubble' : 'closed'}>
      <div className="gw-sr" role="status" aria-live="polite" data-testid="widget-live-region">{announcement}</div>
      {!hidden && open && (
        <div
          ref={panelRef}
          className={`gw-panel${isSheet ? ' is-sheet' : ''}${s.branding.panelStyle === 'solid' ? ' is-solid' : ''}`}
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gw-title"
          onKeyDown={onPanelKey}
          data-testid="widget-panel"
          data-sheet={isSheet ? 'true' : 'false'}
        >
          <h2 className="gw-sr" id="gw-title">Chat with {s.messaging.headerTitle}</h2>
          <FloatingBar s={s} onBack={view && view !== 'home' ? goHome : undefined} onCart={onCart} onTrack={() => startChat(s.home.track.label || 'Track orders', workflowsApi.activeOrderTracking())} onClose={closePanel} />
          {notice === 'ai' && <NoticeSheet s={s} onClose={() => setNotice(null)} />}
          {notice === 'cart' && <CartDrawer onClose={() => setNotice(null)} />}
          <div className={`gw-body${view === 'home' ? ' is-home' : ''}`} data-testid="widget-body">
            {view === 'home' && <HomeView s={s} greeting={greetingFor(s, firstName)} hasLast={!!last} onStarter={onStarter} onLast={() => { setMessages(last!); setView('chat') }} />}
            {view === 'prechat' && (
              <PreChatForm
                preChat={pre}
                onSubmit={(id) => {
                  setIdentity(id)
                  setView('chat')
                  const t = pendingRef.current
                  pendingRef.current = null
                  if (t) setTimeout(() => send(t), 0)
                }}
              />
            )}
            {view === 'chat' && <p className="gw-sr" data-testid="widget-context-note">{contextNote}</p>}
            {view === 'chat' && <MessageList messages={messages} settings={s} typing={typing} onChip={(q) => send(q)} onRetry={(m) => send(m.text, m)} />}
            {view === 'offline' && <OfflineView settings={s} defaults={{ ...identity, email: knownEmail, name: customer?.name ?? identity.name }} />}
            {view === 'csat' && (
              <CsatView
                questions={questions}
                style={s.csat.style}
                skip={!s.csat.enabled}
                knownEmail={knownEmail}
                onTranscriptSent={(email) => {
                  setTranscriptTo(email)
                  setView('transcript')
                  setAnnouncement(`Transcript sent to ${email}`)
                }}
              />
            )}
            {view === 'transcript' && (
              <TranscriptSent
                email={transcriptTo ?? knownEmail ?? 'you@example.com'}
                onNewChat={() => {
                  setMessages([])
                  setWfRun(null)
                  setHandoff(false)
                  setView('chat')
                }}
              />
            )}
          </div>
          {view === 'chat' && (
            <>
              {wfRun && wfRun.inbox.length > 0 && (
                <details className="gw-mock-inbox" style={{ margin: '0 12px 6px', padding: '6px 10px', borderRadius: 10, background: '#F7F4EF', fontSize: 12, color: '#3A332C' }} data-testid="widget-mock-inbox">
                  <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 24 }}>Mock inbox ({wfRun.inbox.length}) · {wfRun.inbox[0].to}</summary>
                  <p style={{ marginTop: 4 }} data-testid="widget-mock-inbox-body"><strong>{wfRun.inbox[0].subject}</strong><br />From {wfRun.inbox[0].from}<br />{wfRun.inbox[0].body}</p>
                </details>
              )}
              <div className="gw-footer-row">
                <span>{handoff ? 'Connecting you with our team…' : ''}</span>
                <button type="button" className="gw-text-btn" onClick={() => setView('csat')} data-testid="widget-end-chat">End chat</button>
              </div>
              <PillInput placeholder="Reply" disabled={typing} onSend={(t) => send(t)} autoFocus />
            </>
          )}
          {view === 'home' && <PillInput placeholder="Ask anything" onSend={(t) => startChat(t)} />}
          {(view === 'home' || view === 'chat') && <WidgetFooter onNotice={() => setNotice('ai')} />}
        </div>
      )}
      {!hidden && !isSheet && (
        <div className={`gw-dock is-${side}${vert === 'top' ? ' is-top' : ''}`} style={{ [side]: off.x, [vert]: off.y }} onKeyDown={(e) => e.key === 'Escape' && open && closePanel()}>
          {!open && bubble === 'shown' && bubbleAllowed && <GreetingBubble text={greetingFor(s, firstName)} avatar={s.branding.aiAvatarUrl} onOpen={openPanel} onDismiss={() => setBubble('dismissed')} />}
          <Launcher settings={s.launcher} open={open} unread={unread} animation={animation} buttonRef={launcherRef} onToggle={open ? closePanel : openPanel} />
        </div>
      )}
    </div>
  )
}

export function SupportWidget(props: SupportWidgetProps) {
  // "Inherit from store theme" reads the font of the element the widget is mounted in.
  const [inheritFont, setInheritFont] = useState(() => getComputedStyle(document.body).fontFamily)
  const tree = (
    <ShadowRoot onHost={(host) => setInheritFont(getComputedStyle(host.parentElement ?? document.body).fontFamily)}>
      <WidgetErrorBoundary>
        <WidgetApp {...props} inheritFont={inheritFont} />
      </WidgetErrorBoundary>
    </ShadowRoot>
  )
  return props.mode === 'contained' ? tree : createPortal(tree, document.body)
}
