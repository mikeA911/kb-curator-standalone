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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingProfileFor = useRef<string | null>(null)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfileFor.current === userId) {
      console.log('[Auth] Already fetching profile for:', userId)
      return null
    }

    console.log('[Auth] Fetching profile for:', userId)
    fetchingProfileFor.current = userId
    
    // Add a timeout to the profile fetch to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
    )

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('[Auth] Profile fetch error:', error)
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          console.log('[Auth] Profile not found, creating...')
          const { data: { session } } = await supabase.auth.getSession()
          const user = session?.user
          
          if (user && user.id === userId) {
            const profileData = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              role: 'user' as const,
              is_active: true
            }
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single()
            
            if (createError) {
              console.error('[Auth] Profile creation error:', createError)
              return null
            }
            console.log('[Auth] Profile created:', newProfile)
            return newProfile as Profile
          }
        }
        return null
      }

      console.log('[Auth] Profile fetched:', data)
      return data as Profile
    } catch (err) {
      console.error('[Auth] Unexpected error fetching profile:', err)
      return null
    } finally {
      fetchingProfileFor.current = null
    }
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    console.log('[Auth] Initializing...')
    
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, !!session)
        
        if (!mounted) return

        const currentUser = session?.user ?? null
        setSession(session)
        setUser(currentUser)

        try {
          if (currentUser) {
            // Only fetch profile if we don't have it or if the user changed
            if (!profile || profile.id !== currentUser.id) {
              const newProfile = await fetchProfile(currentUser.id)
              if (mounted) setProfile(newProfile)
            }
          } else {
            if (mounted) setProfile(null)
          }
        } catch (err) {
          console.error('[Auth] Profile fetch error in state change:', err)
        } finally {
          if (mounted) setLoading(false)
        }
      }
    )

    // Fallback: if onAuthStateChange doesn't fire or resolve within 10 seconds, stop loading
    const fallbackTimeout = setTimeout(() => {
      if (mounted && loading && !profile) {
        console.warn('[Auth] Initialization fallback triggered')
        setLoading(false)
      }
    }, 10000)

    return () => {
      mounted = false
      clearTimeout(fallbackTimeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

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
        if (!profile?.is_active) {
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
