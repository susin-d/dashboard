import { useEffect, useState } from 'react'
import { consumeAuthTokenFromHash, fetchCurrentUser, getStoredUser } from '../lib/authApi'

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      consumeAuthTokenFromHash()
      const user = await fetchCurrentUser()
      if (mounted) {
        setCurrentUser(user)
        setAuthReady(true)
      }
    }

    checkAuth()

    const handleAuthChange = () => {
      if (mounted) {
        setCurrentUser(getStoredUser())
      }
    }

    window.addEventListener('starwaves:auth-change', handleAuthChange)
    return () => {
      mounted = false
      window.removeEventListener('starwaves:auth-change', handleAuthChange)
    }
  }, [])

  return { currentUser, authReady }
}
