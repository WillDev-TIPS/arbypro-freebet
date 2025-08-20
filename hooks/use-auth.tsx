"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, User, getSession, signOut as supabaseSignOut, isSupabaseConfigured } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Verificar se o Supabase está configurado
        if (!isSupabaseConfigured()) {
          console.warn("Supabase não está configurado corretamente. Configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
          toast({
            title: "Configuração incompleta",
            description: "O Supabase não está configurado. Algumas funcionalidades podem não funcionar.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        
        const { data } = await getSession()
        console.log("Sessão encontrada:", data.session ? "Sim" : "Não")
        setUser(data.session?.user || null)
      } catch (error) {
        console.error("Erro ao buscar sessão:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Configurar listener para mudanças de autenticação apenas se o Supabase estiver configurado
    let authListener: { subscription: { unsubscribe: () => void } } | undefined
    
    if (isSupabaseConfigured()) {
      const result = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Evento de autenticação:", event)
          setUser(session?.user || null)
          setLoading(false)
        }
      )
      authListener = result.data
    }

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [toast])

  const signOut = async () => {
    try {
      await supabaseSignOut()
      setUser(null)
      router.push("/login")
      router.refresh()
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
