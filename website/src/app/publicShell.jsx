import { lazy, Suspense } from 'react'
import { NetworkStatus } from '../components/NetworkStatus'
import { WaveLoader } from '../components/WaveLoader'

export const AuthPage = lazy(() => import('../pages/AuthPage').then((m) => ({ default: m.AuthPage })))
export const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
export const OnboardingPage = lazy(() => import('../pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
export const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })))
export const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })))
export const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage })))
export const CustomPage = lazy(() => import('../pages/CustomPage').then((m) => ({ default: m.CustomPage })))
export const EveGlobalCompanionHost = lazy(() => import('../components/eve/avatar/EveGlobalCompanionHost').then((m) => ({ default: m.EveGlobalCompanionHost })))
export const AvatarOverlayManager = lazy(() => import('../components/eve/avatar/AvatarOverlayManager').then((m) => ({ default: m.AvatarOverlayManager })))
export const AvatarOverlayPage = lazy(() => import('../pages/AvatarOverlayPage').then((m) => ({ default: m.AvatarOverlayPage })))

export const routeTitles = {
  '/': 'StarWaves — Developer productivity workspace',
  '/login': 'Log in — StarWaves',
  '/signup': 'Create account — StarWaves',
  '/forgot-password': 'Forgot password — StarWaves',
  '/onboarding': 'Set up your workspace — StarWaves',
  '/privacy': 'Privacy policy — StarWaves',
  '/terms': 'Terms of service — StarWaves',
}

export function publicRoute(content) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <NetworkStatus />
      <Suspense fallback={<WaveLoader />}>{content}</Suspense>
    </>
  )
}
