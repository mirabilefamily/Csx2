import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from '@/components/auth/AuthContext'
import { AppShell } from '@/components/shell/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { UnsavedGuardProvider } from '@/components/UnsavedGuard'
import { TooltipProvider } from '@/components/ui/overlay'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import InboxPage from '@/pages/InboxPage'
import GuidancePage from '@/pages/GuidancePage'
import SettingsPage from '@/pages/SettingsPage'
import StyleguidePage from '@/pages/StyleguidePage'
import NotFoundPage from '@/pages/NotFoundPage'
import WidgetDemoPage from '@/pages/WidgetDemoPage'
import SurveyPage from '@/pages/SurveyPage'
import ThemeEditorPage from '@/pages/ThemeEditorPage'
import AiPage from '@/pages/AiPage'
import ChannelsPage from '@/pages/ChannelsPage'
import HelpHomePage from '@/pages/HelpHomePage'
import { HelpArticlePage, HelpFolderPage, HelpLegacy3Redirect, HelpLegacyRedirect, HelpSearchPage } from '@/pages/HelpPages'
import { useSearchParams } from 'react-router-dom'

// The old Guidance sandbox tab now lives in AI & Workflows → Conversation testing.
function GuidanceRoute() {
  const [params] = useSearchParams()
  return params.get('tab') === 'sandbox' ? <Navigate to="/ai/testing" replace /> : <GuidancePage />
}

function NotFoundRoute() {
  const { user } = useAuth()
  return user ? <AppShell><NotFoundPage /></AppShell> : <NotFoundPage />
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <UnsavedGuardProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/styleguide" element={<StyleguidePage />} />
            <Route path="/widget-demo" element={<WidgetDemoPage />} />
            <Route path="/widget-demo/theme-editor" element={<ThemeEditorPage />} />
            <Route path="/survey/:token" element={<SurveyPage />} />
            <Route path="/help" element={<HelpHomePage />} />
            <Route path="/help/search" element={<HelpSearchPage />} />
            <Route path="/help/topic/:id" element={<HelpLegacyRedirect kind="topic" />} />
            <Route path="/help/article/:id" element={<HelpLegacyRedirect kind="article" />} />
            <Route path="/help/:folder" element={<HelpFolderPage />} />
            <Route path="/help/:folder/:article" element={<HelpArticlePage />} />
            <Route path="/help/:folder/:sub/:article" element={<HelpLegacy3Redirect />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inbox/:ticketId?" element={<InboxPage />} />
                <Route path="/guidance" element={<GuidanceRoute />} />
                <Route path="/ai" element={<Navigate to="/ai/voice" replace />} />
                <Route path="/ai/routing" element={<Navigate to="/ai/workflows" replace />} />
                <Route path="/ai/:tab" element={<AiPage />} />
                <Route path="/ai/workflows/:workflowId" element={<AiPage />} />
                <Route path="/channels" element={<Navigate to="/channels/chat" replace />} />
                <Route path="/channels/:tab" element={<ChannelsPage />} />
                <Route path="/settings" element={<Navigate to="/settings/integrations" replace />} />
                <Route path="/settings/:tab" element={<SettingsPage />} />
                <Route path="/settings/integrations/:integrationId" element={<SettingsPage />} />
                <Route path="/settings/integrations/:integrationId/:sub" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundRoute />} />
          </Routes>
          <Toaster />
          </UnsavedGuardProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  )
}
