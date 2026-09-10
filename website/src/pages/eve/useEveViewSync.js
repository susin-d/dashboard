import { useEffect } from 'react'
import { TAB_PAGE_ID } from './eveConstants'

export function useEveCompanionBroadcast({ isSending, streamText, thinkingText, activeTool, error }) {
  useEffect(() => {
    const detail = { isSending, isEveSpeaking: Boolean(streamText) && isSending, isEveThinking: Boolean(thinkingText) && isSending, thinkingText, activeTool, streamText, error }
    window.dispatchEvent(new CustomEvent('starwaves:eve-state', { detail }))
  }, [isSending, streamText, thinkingText, activeTool, error])
}

export function useEveActiveTab({ activeSubpage, setActiveTab, onNavigate }) {
  useEffect(() => {
    if (activeSubpage) {
      setActiveTab(activeSubpage)
    }
  }, [activeSubpage, setActiveTab])

  const switchTab = (tabId) => {
    setActiveTab(tabId)
    onNavigate?.(TAB_PAGE_ID[tabId])
  }
  return { switchTab }
}

export function useEveTabNavigation({ setActiveTab, onNavigate }) {
  const switchTab = (tabId) => {
    setActiveTab(tabId)
    onNavigate?.(TAB_PAGE_ID[tabId])
  }
  return { switchTab }
}
