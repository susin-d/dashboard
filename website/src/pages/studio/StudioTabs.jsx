import { AppWindow, Blocks, LayoutTemplate } from 'lucide-react'
import { TabNav } from '../../components/ui'

const STUDIO_TABS = [
  { id: 'studio', label: 'Builder', icon: Blocks },
  { id: 'studio-apps', label: 'Apps', icon: AppWindow },
  { id: 'studio-templates', label: 'Templates', icon: LayoutTemplate },
]

export function StudioTabs({ activeTab, onNavigate }) {
  return (
    <TabNav
      tabs={STUDIO_TABS}
      activeTab={activeTab}
      onChange={(id) => onNavigate?.(id)}
      ariaLabel="Studio sections"
    />
  )
}
