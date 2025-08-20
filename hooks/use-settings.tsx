"use client"

import { useState, useEffect } from "react"
import { updateUserSettings as updateSupabaseSettings, getUserSettings, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

// Tipo para as configurações do usuário
export interface UserSettings {
  defaultCommission: string
  autoCalculate: boolean
  theme: string
  email: string
}

// Configurações padrão
const defaultSettings: UserSettings = {
  defaultCommission: "2.0",
  autoCalculate: false,
  theme: "light",
  email: ""
}

// Chave para armazenar no localStorage
const STORAGE_KEY = "freebet-planner-settings"

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [settingsChanged, setSettingsChanged] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()

  // Carregar configurações do localStorage ao inicializar
  useEffect(() => {
    loadSettings()
  }, [])

  // Função para carregar configurações
  const loadSettings = async () => {
    setIsLoading(true)
    
    try {
      // Primeiro, tentar carregar do localStorage
      const savedSettings = localStorage.getItem(STORAGE_KEY)
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        console.log("Configurações carregadas do localStorage:", parsedSettings)
        setSettings(parsedSettings)
        setIsLoading(false)
        return
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do localStorage:", error)
    }
    
    // Se não encontrar no localStorage e o usuário estiver autenticado, tentar carregar do Supabase
    if (user) {
      try {
        const { data, error } = await getUserSettings()
        
        if (error) {
          console.error("Erro ao carregar configurações do Supabase:", error)
        } else if (data) {
          const supabaseSettings: UserSettings = {
            defaultCommission: data.default_commission ? data.default_commission.toString() : defaultSettings.defaultCommission,
            autoCalculate: data.auto_calculate !== null ? data.auto_calculate : defaultSettings.autoCalculate,
            theme: data.theme || defaultSettings.theme,
            email: ""
          }
          
          console.log("Configurações carregadas do Supabase:", supabaseSettings)
          setSettings(supabaseSettings)
          
          // Salvar no localStorage para uso futuro
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseSettings))
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do Supabase:", error)
      }
    }
    
    setIsLoading(false)
  }

  // Função para atualizar configurações
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    setSettingsChanged(true)
    
    // Salvar imediatamente no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings))
      console.log("Configurações salvas no localStorage:", updatedSettings)
    } catch (error) {
      console.error("Erro ao salvar configurações no localStorage:", error)
    }
  }

  // Função para salvar configurações no Supabase
  const saveSettings = async () => {
    // Sempre salvar no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      console.log("Configurações salvas no localStorage durante saveSettings:", settings)
    } catch (error) {
      console.error("Erro ao salvar configurações no localStorage:", error)
    }
    
    // Se o Supabase não estiver configurado ou o usuário não estiver autenticado,
    // apenas considerar o localStorage como suficiente
    if (!isSupabaseConfigured() || !user) {
      setSettingsChanged(false)
      return true
    }
    
    setIsSaving(true)
    
    try {
      // Preparar dados para salvar no Supabase
      const settingsToSave = {
        default_commission: parseFloat(settings.defaultCommission),
        auto_calculate: settings.autoCalculate,
        theme: settings.theme
      }
      
      console.log("Salvando configurações no Supabase:", settingsToSave)
      
      try {
        const { error } = await updateSupabaseSettings(settingsToSave)
        
        if (error) {
          console.error("Erro ao salvar configurações no Supabase:", error)
          // Mesmo com erro no Supabase, consideramos sucesso pois já salvamos no localStorage
        }
      } catch (supabaseError) {
        console.error("Exceção ao salvar no Supabase:", supabaseError)
        // Mesmo com erro no Supabase, consideramos sucesso pois já salvamos no localStorage
      }
      
      setSettingsChanged(false)
      return true
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    settings,
    updateSettings,
    saveSettings,
    isLoading,
    settingsChanged,
    isSaving
  }
}
