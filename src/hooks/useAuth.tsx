import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isRole: (role: UserRole) => boolean
  isCurator: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true) // Start as loading
  const [error, setError] = useState<string | null>(null)
  const profilePromiseCache = useRef<Record<string, Promise<Profile | null>>>({})
  const initialized = useRef(false)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return null
    console.log('[Auth] Fetching profile for:', userId)
    
    // If already fetching, return the existing promise
    if (userId in profilePromiseCache.current) {
      return profilePromiseCache.current[userId]
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error('[Auth] Profile fetch timeout for userId:', userId)
        delete profilePromiseCache.current[userId]
        reject(new Error('Profile fetch timeout'))
      }, 10000) // 10 second timeout
    })

    const promise = (async () => {
      console.log('[Auth] Starting profile query for userId:', userId)
      try {
        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        const result = await Promise.race([queryPromise, timeoutPromise])

        if (result.error) {
          console.error('[Auth] Error fetching profile:', result.error)
          if (result.error.code === 'PGRST116' || result.error.message?.includes('No rows found')) {
            console.log('[Auth] Profile not found, attempting to create new profile')
            // Try to get user from session to create profile
            const sessionResult = await supabase.auth.getSession()
            console.log('[Auth] Session result:', sessionResult)
            const user = sessionResult.data.session?.user
            
            if (user && user.id === userId) {
              const profileData = {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                role: 'user' as const,
                is_active: true
              }
              
              const createResult = await supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single()
              
              if (createResult.error) {
                console.error('[Auth] Error creating profile:', createResult.error)
                return null
              }
              
              console.log('[Auth] Created new profile:', createResult.data)
              return createResult.data as Profile
            }
          }
          return null
        }

        console.log('[Auth] Profile fetched successfully:', result.data)
        return result.data as Profile
      } catch (err) {
        console.error('[Auth] Unexpected error fetching profile:', err)
        return null
      } finally {
        // Remove from cache when done
        delete profilePromiseCache.current[userId]
        console.log('[Auth] Profile fetch completed for:', userId)
      }
    })()

    profilePromiseCache.current[userId] = promise
    return promise
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    // Safety timeout to ensure loading state is always cleared
    const safetyTimeout = setTimeout(() => {
      console.warn('[Auth] Safety timeout: Setting loading to false')
      if (mounted) setLoading(false)
    }, 15000) // 15 second safety timeout

    async function initialize() {
      if (initialized.current) return
      initialized.current = true

      console.log('[Auth] Initializing auth state...')
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          // Handle AbortError or other session errors gracefully
          if (sessionError.message?.includes('AbortError')) {
            console.warn('[Auth] Session fetch aborted, will rely on onAuthStateChange')
          } else {
            throw sessionError
          }
        }

        if (!mounted) return

        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          const p = await fetchProfile(initialSession.user.id)
          if (mounted && p) setProfile(p)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setError(err instanceof Error ? err.message : 'Initialization failed')
      } finally {
        if (mounted) {
          console.log('[Auth] Initialization completed, setting loading to false')
          setLoading(false)
        }
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[Auth] Auth state changed:', event, currentSession ? 'Session exists' : 'No session')
      
      if (!mounted) return
      
      setSession(currentSession)
      const newUser = currentSession?.user ?? null
      setUser(newUser)

      // Set loading to false immediately when auth state changes, regardless of profile fetch
      setLoading(false)
      console.log('[Auth] Auth state change processed, setting loading to false immediately')

      if (newUser) {
        // Only fetch if needed and not already fetching
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && !initialized.current) || (!profile || profile.id !== newUser.id)) {
          const p = await fetchProfile(newUser.id)
          if (mounted && p) setProfile(p)
        }
      } else {
        setProfile(null)
      }
    })

    return () => {
      clearTimeout(safetyTimeout)
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, profile?.id])

  // Sign in
  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (profile && !profile.is_active) {
          await supabase.auth.signOut()
          return { success: false, error: 'Account is inactive. Please contact an administrator.' }
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      if (data.user && !data.session) {
        return { success: true, error: 'Please check your email to confirm your account.' }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign out
  const signOut = async () => {
    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  // Check role
  const isRole = useCallback((role: UserRole): boolean => {
    if (!profile?.is_active) return false

    if (profile.role === 'admin') return true
    if (profile.role === 'curator' && (role === 'curator' || role === 'user')) return true
    if (profile.role === 'user' && role === 'user') return true

    return false
  }, [profile])

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isRole,
    isCurator: isRole('curator'),
    isAdmin: profile?.role === 'admin' && profile?.is_active === true,
  }), [user, profile, session, loading, error, signIn, signUp, signOut, refreshProfile, isRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
