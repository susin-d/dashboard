import { useScrollReveal } from './useScrollReveal'
import { LandingNav } from './sections/LandingNav'
import { HeroSection } from './sections/HeroSection'
import { IntegrationsBar } from './sections/IntegrationsBar'
import { ShowcaseSection } from './sections/ShowcaseSection'
import { StatsSection } from './sections/StatsSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { EveSpotlightSection } from './sections/EveSpotlightSection'
import { WorkflowSection } from './sections/WorkflowSection'
import { FAQSection } from './sections/FAQSection'
import { GoogleDataSection } from './sections/GoogleDataSection'
import { FinalCTASection } from './sections/FinalCTASection'
import { LandingFooter } from './sections/LandingFooter'

export function LandingPage({ user, onNavigate }) {
  useScrollReveal()

  const scrollToShowcase = () => {
    document.getElementById('landing-showcase')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main id="main-content" className="public-page landing-cinematic landing-redesign" tabIndex={-1}>
      <LandingNav user={user} onNavigate={onNavigate} />
      <HeroSection onNavigate={onNavigate} onSeeAction={scrollToShowcase} />
      <IntegrationsBar />
      <ShowcaseSection onNavigate={onNavigate} />
      <StatsSection />
      <FeaturesSection />
      <EveSpotlightSection onNavigate={onNavigate} />
      <WorkflowSection />
      <FAQSection />
      <GoogleDataSection onNavigate={onNavigate} />
      <FinalCTASection user={user} onNavigate={onNavigate} />
      <LandingFooter onNavigate={onNavigate} />
    </main>
  )
}
