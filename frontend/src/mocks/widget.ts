import type { ShopifyInstallStatus, StoreProduct, ThemeEmbedSettings, WidgetSettings } from '@/types'
import { hoursAgo } from './time'

export const widgetSettings: WidgetSettings = {
  home: {
    cart: { enabled: true, label: 'Cart' },
    track: { enabled: true, label: 'Track orders' },
    showLastConversation: true,
    starters: [
      { id: 'st-returns', label: 'Returns Info', action: 'ai' },
      { id: 'st-drops', label: 'Friday Drops Info', action: 'ai' },
      { id: 'st-order', label: 'Where is my order?', action: 'workflow', workflowId: 'wf-order-tracking' },
      { id: 'st-cancel', label: 'Can I cancel / edit my order?', action: 'workflow', workflowId: 'wf-cancel' },
      { id: 'st-wholesale', label: 'Wholesale Inquiry', action: 'workflow', workflowId: 'wf-wholesale' },
    ],
  },
  conversation: { botName: 'Goorin AI', thumbs: true, askEmailFirst: false },
  branding: {
    panelStyle: 'frosted',
    panelColor: '#E8E3D8',
    colors: {
      primary: '#6B4F3A',
      accent: '#B08D57',
      headerBackground: '#3E2D21',
      headerText: '#FAF8F5',
      customerBubble: '#6B4F3A',
      aiBubble: '#FFFFFF',
      link: '#6B4F3A',
    },
    logoUrl: '/images/brand/goorin-wordmark-cream.svg',
    aiAvatarUrl: '/images/brand/ai-avatar.svg',
    agentAvatarUrl: null,
    font: 'inter',
    radius: 14,
    shadow: 'soft',
  },
  launcher: {
    icon: 'chat',
    customIconUrl: null,
    iconColor: '#1F1D1A',
    buttonColor: 'white',
    backgroundColor: '#FFFFFF',
    style: 'circle',
    label: 'Need help?',
    size: 'l',
    position: 'bottom-right',
    offset: { x: 24, y: 24 },
    mobileOffset: { x: 16, y: 16 },
    badgeColor: '#B3261E',
    animation: 'pulse_once',
    bounceAfterSec: 10,
  },
  messaging: {
    headerTitle: 'Goorin Bros.',
    headerSubtitle: 'Hat makers since 1895 · Replies in minutes',
    greeting: '',
    proactive: { enabled: true, delaySec: 5, pages: ['home', 'product', 'collection', 'cart'] },
    preChat: { email: 'required', name: 'optional', orderNumber: 'optional' },
    aiDisclosure: "You're chatting with Goorin's AI assistant",
    handoffMessage: 'Connecting you with our team',
    handoffResponseTime: 'Typical reply: about 2 hours',
    offlineMessage: "Our hatters have closed the shop for the day. We're back Monday to Friday, 8am to 6pm Pacific.",
    offlineEmailFallback: true,
    quickReplies: ['Track my order', 'Returns', 'Sizing help', 'Wholesale'],
  },
  display: {
    mode: 'all',
    pageTypes: ['home', 'product', 'collection', 'cart'],
    urlInclude: [],
    urlExclude: ['/checkout/*'],
    hideOnMobile: false,
    outsideHours: 'offline_form',
    customerContext: { loggedInCustomer: true, currentProduct: true, cartContents: true },
  },
  csat: { enabled: true, style: 'stars' },
  sources: { primary: 'desk', accent: 'desk', launcherPosition: 'theme', hideOnMobile: 'theme' },
}

// Values saved in the Shopify theme editor's app embed block.
export const themeEmbed: ThemeEmbedSettings = {
  enabled: true,
  primary: '#1F1D1A',
  accent: '#C4A574',
  launcherPosition: 'bottom-right',
  hideOnMobile: false,
}

export const shopifyInstall: ShopifyInstallStatus = {
  shopDomain: 'goorin.myshopify.com',
  embedEnabled: true,
  themeName: 'Dawn – Goorin 2026',
  lastSeenAt: hoursAgo(0.07),
  method: 'app_embed',
}

const P = '/images/products'
export const storeProducts: StoreProduct[] = [
  { id: 'hampton', name: 'Hampton Wool Fedora', price: 148, image: `${P}/wool-fedora.jpg`, category: 'Fedoras', colors: ['Tobacco', 'Black', 'Grey'], description: 'Our signature fedora, blocked by hand from Australian wool felt and finished with a grosgrain band. Packable, water-resistant and made to be worn for decades.' },
  { id: 'bushwick', name: 'Bushwick Flat Cap', price: 68, image: `${P}/flat-cap.jpg`, category: 'Caps', colors: ['Charcoal', 'Olive'], description: 'Herringbone tweed flat cap with a quilted satin lining.' },
  { id: 'panther', name: 'The Panther Trucker', price: 45, image: `${P}/trucker-hat.jpg`, category: 'Truckers', colors: ['Cream'], description: 'Mesh-back snapback with a hand-embroidered animal patch.' },
  { id: 'mae', name: 'Mae Felt Cloche', price: 118, image: `${P}/cloche.jpg`, category: 'Women', colors: ['Rose', 'Camel'], description: 'Soft wool felt cloche with a tailored bow.' },
  { id: 'harbor', name: 'Harbor Rib Beanie', price: 42, image: `${P}/beanie.jpg`, category: 'Knits', colors: ['Oatmeal'], description: 'Chunky rib knit with a leather label.' },
  { id: 'cuba', name: 'Cuba Cowboy', price: 165, image: `${P}/cowboy-hat.jpg`, category: 'Western', colors: ['Sand', 'Chocolate'], description: 'Wool felt cattleman crown with a leather band.' },
  { id: 'watkins', name: 'Watkins Straw Panama', price: 128, image: `${P}/straw-panama.jpg`, category: 'Straw', colors: ['Natural'], description: 'Hand-woven toquilla straw with a black band.' },
  { id: 'sage', name: 'Sage Bucket Hat', price: 58, image: `${P}/bucket-hat.jpg`, category: 'Bucket', colors: ['Olive'], description: 'Waxed canvas bucket hat with a leather trim.' },
]

// Survey links: tok_GB<ticket number> is valid for resolved tickets; "done" is already completed.
export const surveyTokens: Record<string, { ticketId: string; completed: boolean }> = {
  tok_GB1066: { ticketId: 'GB-1066', completed: false },
  tok_GB1070: { ticketId: 'GB-1070', completed: false },
  done: { ticketId: 'GB-1062', completed: true },
}
