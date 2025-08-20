"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase, FreebetDB, isSupabaseConfigured, clearFreebets, updateUserEmail } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { useSettings } from "@/hooks/use-settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, Plus, Trash2, TrendingUp, Settings, Check, Save, Trash, Mail, BarChart } from "lucide-react"

interface Freebet {
  id: string
  name: string
  value: number
  minOdds: number
  expiry: string
  used: boolean
  status: "active" | "expired" | "extracted"
  extractedValue?: number
  created_at?: string
}

interface ExtractionResult {
  backOdds: number
  layOdds: number
  freebetValue: number
  backStake: number
  layStake: number
  profit: number
  liability: number
  extractionRate: number
  commission: number
  backWin: number
  layWin: number
}

export function FreebetPlanner() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [freebets, setFreebets] = useState<Freebet[]>([])
  const [newFreebet, setNewFreebet] = useState({
    name: "",
    value: "",
    minOdds: "",
    expiry: "",
  })
  const [showExtractionModal, setShowExtractionModal] = useState(false)
  const [selectedFreebetId, setSelectedFreebetId] = useState<string | null>(null)
  const [extractionValue, setExtractionValue] = useState("")
  const [totalProfit, setTotalProfit] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)

  // Extraction Calculator State
  const [extractionData, setExtractionData] = useState({
    freebetValue: "",
    backOdds: "",
    layOdds: "",
    commission: "2",
  })
  
  // Usar o hook personalizado para gerenciar configurações
  const { 
    settings: userSettings, 
    updateSettings: setUserSettings,
    saveSettings: saveUserSettings,
    settingsChanged,
    isSaving: savingSettings
  } = useSettings()
  
  // Estado para armazenar o mês selecionado nas estatísticas
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Estado para armazenar estatísticas mensais calculadas
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)

  // Verificar se o Supabase está configurado
  useEffect(() => {
    const supabaseConfigured = isSupabaseConfigured()
    setIsSupabaseReady(!!supabaseConfigured)
    
    if (!supabaseConfigured) {
      setIsLoading(false)
      toast({
        title: "Modo de demonstração ativado",
        description: "O Supabase não está configurado. Os dados não serão salvos. Acesse /setup para ver as instruções.",
        variant: "destructive"
      })
      
      // Adicionar link para a página de configuração
      setTimeout(() => {
        if (typeof window !== "undefined") {
          const setupLink = document.createElement("a")
          setupLink.href = "/setup"
          setupLink.textContent = "Ver instruções de configuração"
          setupLink.className = "text-primary underline block mt-4 text-center"
          document.querySelector(".freebets-container")?.prepend(setupLink)
        }
      }, 500)
    }
  }, [toast])
  
  // Sincronizar o tema com as configurações do usuário
  useEffect(() => {
    if (userSettings.theme) {
      setTheme(userSettings.theme)
    }
  }, [userSettings.theme, setTheme])
  
  // Sincronizar a comissão padrão com a calculadora
  useEffect(() => {
    setExtractionData(prev => ({
      ...prev,
      commission: userSettings.defaultCommission
    }))
  }, [userSettings.defaultCommission])
  
  // Carregar configurações do usuário
  const loadUserSettings = async () => {
    // Configurações padrão
    const defaultSettings = {
      defaultCommission: "2.0",
      autoCalculate: false,
      theme: "light",
      email: ""
    }

    // Verificar se há configurações salvas no localStorage
    try {
      const savedSettings = localStorage.getItem('userSettings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        console.log("Configurações carregadas do localStorage:", parsedSettings)
        
        setUserSettings(parsedSettings)
        
        // Atualizar os dados da calculadora com a comissão padrão
        setExtractionData(prev => ({
          ...prev,
          commission: parsedSettings.defaultCommission
        }))
        
        // Aplicar o tema salvo
        if (parsedSettings.theme) {
          setTheme(parsedSettings.theme)
        }
        
        // Se o usuário estiver autenticado, tentar sincronizar com o Supabase
        if (isSupabaseReady && user) {
          try {
            await updateUserSettings({
              default_commission: parseFloat(parsedSettings.defaultCommission),
              auto_calculate: parsedSettings.autoCalculate,
              theme: parsedSettings.theme
            })
          } catch (error) {
            console.log("Erro ao sincronizar configurações com o Supabase", error)
          }
        }
        
        return
      }
    } catch (error) {
      console.log("Erro ao carregar configurações do localStorage", error)
    }
    
    // Se não houver configurações no localStorage ou ocorrer um erro, tentar carregar do Supabase
    if (isSupabaseReady && user) {
      try {
        const { data, error } = await getUserSettings()
        
        if (error) {
          console.log("Erro ao carregar configurações do Supabase, usando padrões", error)
          setUserSettings(defaultSettings)
          localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
          
          // Atualizar os dados da calculadora com a comissão padrão
          setExtractionData(prev => ({
            ...prev,
            commission: defaultSettings.defaultCommission
          }))
          
          return
        }
        
        if (data) {
          const settings = {
            defaultCommission: data.default_commission ? data.default_commission.toString() : "2.0",
            autoCalculate: data.auto_calculate !== null ? data.auto_calculate : false,
            theme: data.theme || "light",
            email: ""
          }
          
          console.log("Configurações carregadas do Supabase:", settings)
          
          setUserSettings(settings)
          localStorage.setItem('userSettings', JSON.stringify(settings))
          
          // Atualizar os dados da calculadora com a comissão padrão
          setExtractionData(prev => ({
            ...prev,
            commission: settings.defaultCommission
          }))
          
          // Aplicar o tema salvo
          if (settings.theme) {
            setTheme(settings.theme)
          }
        } else {
          // Se não existirem configurações, usar configurações padrão
          setUserSettings(defaultSettings)
          localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
          
          // Atualizar os dados da calculadora com a comissão padrão
          setExtractionData(prev => ({
            ...prev,
            commission: defaultSettings.defaultCommission
          }))
          
          // Tentar criar configurações padrão no banco
          try {
            await updateUserSettings({
              default_commission: parseFloat(defaultSettings.defaultCommission),
              auto_calculate: defaultSettings.autoCalculate,
              theme: defaultSettings.theme
            })
          } catch (saveError) {
            console.log("Não foi possível salvar configurações padrão no Supabase")
          }
        }
      } catch (error) {
        console.log("Erro ao carregar configurações do usuário, usando padrões")
        
        // Em caso de qualquer erro, usar configurações padrão
        setUserSettings(defaultSettings)
        localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
        
        // Atualizar os dados da calculadora com a comissão padrão
        setExtractionData(prev => ({
          ...prev,
          commission: defaultSettings.defaultCommission
        }))
      }
    } else {
      // Se não estiver autenticado ou o Supabase não estiver configurado, usar configurações padrão
      setUserSettings(defaultSettings)
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
      
      // Atualizar os dados da calculadora com a comissão padrão
      setExtractionData(prev => ({
        ...prev,
        commission: defaultSettings.defaultCommission
      }))
    }
  }
  
  // Carregar freebets do usuário quando o componente montar
  useEffect(() => {
    if (user && isSupabaseReady) {
      loadFreebets()
    } else if (!isSupabaseReady) {
      // Em modo de demonstração, usar dados locais
      setIsLoading(false)
    }
  }, [user, isSupabaseReady])
  
  // Sincronizar o tema com as configurações do usuário
  useEffect(() => {
    if (userSettings.theme && theme !== userSettings.theme) {
      console.log("Aplicando tema das configurações:", userSettings.theme)
      setTheme(userSettings.theme)
    }
  }, [userSettings.theme, theme, setTheme])

  // Carregar freebets do banco de dados
  const loadFreebets = async () => {
    setIsLoading(true)
    try {
      if (!isSupabaseReady) {
        setIsLoading(false)
        return
      }
      
      const user = await supabase.auth.getUser()
      if (!user.data.user) return
      
      const { data, error } = await supabase
        .from('freebets')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error("Erro ao carregar freebets:", error)
        return
      }
      
      if (data) {
        // Converter do formato do banco para o formato do componente
        const convertedFreebets: Freebet[] = data.map((fb: FreebetDB) => ({
          id: fb.id,
          name: fb.name,
          value: fb.value,
          minOdds: fb.min_odds,
          expiry: fb.expiry,
          used: fb.status !== "active",
          status: fb.status,
          extractedValue: fb.extracted_value,
          created_at: fb.created_at
        }))
        
        setFreebets(convertedFreebets)
        
        // Calcular o lucro total das freebets extraídas
        const profit = convertedFreebets
          .filter(f => f.status === "extracted")
          .reduce((sum, f) => sum + (f.extractedValue || 0), 0)
        
        setTotalProfit(profit)
        
        // Calcular estatísticas mensais
        calculateMonthlyStats(convertedFreebets)
      }
    } catch (error) {
      console.error("Erro ao carregar freebets:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Calcular estatísticas mensais
  const calculateMonthlyStats = (freebets: Freebet[]) => {
    const monthlyData: Record<string, any> = {}
    
    // Inicializar dados para os últimos 12 meses
    const today = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
      
      monthlyData[monthKey] = {
        month: monthName,
        monthKey,
        totalFreebets: 0,
        activeFreebets: 0,
        extractedFreebets: 0,
        expiredFreebets: 0,
        totalValue: 0,
        extractedValue: 0,
        profit: 0,
        extractionRate: 0
      }
    }
    
    // Processar freebets
    freebets.forEach(freebet => {
      // Determinar o mês da freebet (usando created_at ou expiry)
      const freebetDate = freebet.created_at ? new Date(freebet.created_at) : new Date(freebet.expiry)
      const monthKey = `${freebetDate.getFullYear()}-${String(freebetDate.getMonth() + 1).padStart(2, '0')}`
      
      // Se o mês não está no intervalo dos últimos 12 meses, ignorar
      if (!monthlyData[monthKey]) return
      
      // Atualizar estatísticas
      monthlyData[monthKey].totalFreebets++
      
      if (freebet.status === "active") {
        monthlyData[monthKey].activeFreebets++
        monthlyData[monthKey].totalValue += freebet.value
      } else if (freebet.status === "extracted") {
        monthlyData[monthKey].extractedFreebets++
        monthlyData[monthKey].extractedValue += freebet.value
        monthlyData[monthKey].profit += (freebet.extractedValue || 0)
      } else if (freebet.status === "expired") {
        monthlyData[monthKey].expiredFreebets++
      }
    })
    
    // Calcular taxas de extração
    Object.values(monthlyData).forEach((data: any) => {
      if (data.extractedValue > 0) {
        data.extractionRate = (data.profit / data.extractedValue) * 100
      }
    })
    
    // Converter para array e ordenar por mês
    const statsArray = Object.values(monthlyData).sort((a: any, b: any) => {
      return b.monthKey.localeCompare(a.monthKey)
    })
    
    setMonthlyStats(statsArray)
  }

  const addFreebet = async () => {
    if (newFreebet.name && newFreebet.value && newFreebet.minOdds && newFreebet.expiry) {
      // Verificar se a freebet já expirou
      const currentDate = new Date()
      const expiryDate = new Date(newFreebet.expiry)
      const status = expiryDate < currentDate ? "expired" : "active"
      
      // Se o Supabase não estiver configurado, usar dados locais
      if (!isSupabaseReady) {
        const newFreebetItem: Freebet = {
          id: Date.now().toString(),
          name: newFreebet.name,
          value: Number.parseFloat(newFreebet.value),
          minOdds: Number.parseFloat(newFreebet.minOdds),
          expiry: newFreebet.expiry,
          used: false,
          status: status,
        }
        
        setFreebets([...freebets, newFreebetItem])
        setNewFreebet({ name: "", value: "", minOdds: "", expiry: "" })
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('freebets')
          .insert([{
          name: newFreebet.name,
          value: Number.parseFloat(newFreebet.value),
          min_odds: Number.parseFloat(newFreebet.minOdds),
          expiry: newFreebet.expiry,
          status: status,
          user_id: user?.id || '',
        }])
        .select()
        
        if (error) {
          console.error("Erro ao adicionar freebet:", error)
          return
        }
        
        if (data && data[0]) {
          // Converter do formato do banco para o formato do componente
          const newFreebetItem: Freebet = {
            id: data[0].id,
            name: data[0].name,
            value: data[0].value,
            minOdds: data[0].min_odds,
            expiry: data[0].expiry,
            used: false,
            status: data[0].status,
          }
          
          setFreebets([...freebets, newFreebetItem])
          setNewFreebet({ name: "", value: "", minOdds: "", expiry: "" })
        }
      } catch (error) {
        console.error("Erro ao adicionar freebet:", error)
      }
    }
  }

  const removeFreebet = async (id: string) => {
    // Se o Supabase não estiver configurado, usar dados locais
    if (!isSupabaseReady) {
      setFreebets(freebets.filter((f) => f.id !== id))
      
      // Atualizar o lucro total se for uma freebet extraída
      const removedFreebet = freebets.find(f => f.id === id)
      if (removedFreebet && removedFreebet.status === "extracted" && removedFreebet.extractedValue) {
        setTotalProfit(prev => prev - removedFreebet.extractedValue!)
      }
      return
    }
    
    try {
      const { error } = await supabase
        .from('freebets')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error("Erro ao remover freebet:", error)
        return
      }
      
      setFreebets(freebets.filter((f) => f.id !== id))
      
      // Atualizar o lucro total se for uma freebet extraída
      const removedFreebet = freebets.find(f => f.id === id)
      if (removedFreebet && removedFreebet.status === "extracted" && removedFreebet.extractedValue) {
        setTotalProfit(prev => prev - removedFreebet.extractedValue!)
      }
    } catch (error) {
      console.error("Erro ao remover freebet:", error)
    }
  }

  const toggleFreebetUsed = (id: string) => {
    const freebet = freebets.find(f => f.id === id)
    if (freebet && !freebet.used) {
      setSelectedFreebetId(id)
      setShowExtractionModal(true)
    } else {
      // Se já está marcada como usada, apenas reativa
      updateFreebetStatus(id, "active")
    }
  }
  
  const updateFreebetStatus = async (id: string, status: "active" | "expired" | "extracted", extractedValue?: number) => {
    // Se o Supabase não estiver configurado, usar dados locais
    if (!isSupabaseReady) {
      // Atualizar o estado local
      setFreebets(freebets.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            used: status !== "active",
            status: status,
            extractedValue: extractedValue !== undefined ? extractedValue : f.extractedValue
          }
        }
        return f
      }))
      
      // Atualizar o lucro total se necessário
      if (status === "extracted" && extractedValue !== undefined) {
        const oldFreebet = freebets.find(f => f.id === id)
        const oldValue = (oldFreebet && oldFreebet.status === "extracted") ? (oldFreebet.extractedValue || 0) : 0
        setTotalProfit(prev => prev - oldValue + extractedValue)
      } else if (status === "active") {
        const oldFreebet = freebets.find(f => f.id === id)
        if (oldFreebet && oldFreebet.status === "extracted" && oldFreebet.extractedValue) {
          setTotalProfit(prev => prev - oldFreebet.extractedValue!)
        }
      }
      return
    }
    
    try {
      const updateData: Partial<FreebetDB> = { status }
      
      if (extractedValue !== undefined) {
        updateData.extracted_value = extractedValue
      }
      
      const { data, error } = await supabase
        .from('freebets')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) {
        console.error("Erro ao atualizar status da freebet:", error)
        return
      }
      
      if (data && data[0]) {
        // Atualizar o estado local
        setFreebets(freebets.map((f) => {
          if (f.id === id) {
            return {
              ...f,
              used: status !== "active",
              status: status,
              extractedValue: extractedValue !== undefined ? extractedValue : f.extractedValue
            }
          }
          return f
        }))
        
        // Atualizar o lucro total se necessário
        if (status === "extracted" && extractedValue !== undefined) {
          const oldFreebet = freebets.find(f => f.id === id)
          const oldValue = (oldFreebet && oldFreebet.status === "extracted") ? (oldFreebet.extractedValue || 0) : 0
          setTotalProfit(prev => prev - oldValue + extractedValue)
        } else if (status === "active") {
          const oldFreebet = freebets.find(f => f.id === id)
          if (oldFreebet && oldFreebet.status === "extracted" && oldFreebet.extractedValue) {
            setTotalProfit(prev => prev - oldFreebet.extractedValue!)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status da freebet:", error)
    }
  }
  
  const handleExtractionConfirm = (extractedValue: string) => {
    if (selectedFreebetId) {
      const value = parseFloat(extractedValue)
      updateFreebetStatus(selectedFreebetId, "extracted", value || 0)
      
      setShowExtractionModal(false)
      setSelectedFreebetId(null)
      setExtractionValue("")
    }
  }
  
  const closeExtractionModal = () => {
    setShowExtractionModal(false)
    setSelectedFreebetId(null)
    setExtractionValue("")
  }
  
  const applyExtractionResult = () => {
    if (extractionResult && selectedFreebetId) {
      updateFreebetStatus(selectedFreebetId, "extracted", extractionResult.profit)
      
      setShowExtractionModal(false)
      setSelectedFreebetId(null)
    }
  }

  const calculateExtraction = () => {
    const freebetValue = Number.parseFloat(extractionData.freebetValue)
    const backOdds = Number.parseFloat(extractionData.backOdds)
    const layOdds = Number.parseFloat(extractionData.layOdds)
    const commission = Number.parseFloat(extractionData.commission) / 100

    if (freebetValue && backOdds && layOdds) {
      // Stake Not Returned calculation
      const backStake = freebetValue
      const layStake = (freebetValue * (backOdds - 1)) / (layOdds - commission)
      const liability = layStake * (layOdds - 1)

      // Profit calculation - SNR (Stake Not Returned)
      // Para o exemplo de R$50, odd back 3, odd lay 3.4, comissão 4.5%:
      // layStake = 50 * (3 - 1) / (3.4 - 0.045) = 100 / 3.355 = 29.81
      // liability = 29.81 * (3.4 - 1) = 29.81 * 2.4 = 71.54
      // Lucro na casa = 100 - 71.54 = 28.46
      // Lucro na exchange = 29.81 - (29.81 * 0.045) = 29.81 - 1.34 = 28.47
      
      // Cálculo do lucro na casa (quando o back ganha)
      const backProfit = freebetValue * (backOdds - 1) - liability
      
      // Cálculo do lucro na exchange (quando o lay ganha)
      const layProfit = layStake * (1 - commission)
      
      const backWin = Math.round(backProfit * 100) / 100 // Arredondamento para duas casas decimais
      const layWin = Math.round(layProfit * 100) / 100 // Arredondamento para duas casas decimais
      const profit = Math.min(backWin, layWin) // Worst case scenario
      const extractionRate = (profit / freebetValue) * 100

      // Arredondamento para duas casas decimais
      const roundToTwo = (num: number) => Math.round(num * 100) / 100

      setExtractionResult({
        backOdds,
        layOdds,
        freebetValue,
        backStake,
        layStake: roundToTwo(layStake),
        profit: roundToTwo(profit),
        liability: roundToTwo(liability),
        extractionRate: roundToTwo(extractionRate),
        commission,
        backWin: roundToTwo(backWin),
        layWin: roundToTwo(layWin)
      })
    }
  }

  const activeFreebets = freebets.filter(f => f.status === "active").length
  const expiredFreebets = freebets.filter(f => f.status === "expired").length
  const extractedFreebets = freebets.filter(f => f.status === "extracted").length
  const totalFreebetValue = freebets.reduce((sum, f) => sum + (f.status === "active" ? f.value : 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6 freebets-container">
      {/* Modal de Extração */}
      <Dialog open={showExtractionModal} onOpenChange={setShowExtractionModal}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center sm:text-left">Extração de Freebet</DialogTitle>
            <DialogDescription className="text-center sm:text-left">
              Insira o valor extraído ou use a calculadora para obter o valor ideal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extractionValue">Valor Extraído (R$)</Label>
              <Input
                id="extractionValue"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={extractionValue}
                onChange={(e) => setExtractionValue(e.target.value)}
                className="text-lg"
              />
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                // Obter o valor da freebet selecionada
                const freebetValue = freebets.find(f => f.id === selectedFreebetId)?.value.toString() || "";
                
                // Atualizar os dados de extração com o valor da freebet
                setExtractionData({
                  ...extractionData,
                  freebetValue: freebetValue
                });
                
                // Fechar o modal
                closeExtractionModal();
                
                // Redirecionar para a aba da calculadora
                const tabsElement = document.querySelector('[role="tablist"]');
                if (tabsElement) {
                  const calculatorTab = tabsElement.querySelector('[value="extraction"]') as HTMLButtonElement;
                  if (calculatorTab) {
                    calculatorTab.click();
                  }
                }
              }}
            >
              Calcular Agora
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={closeExtractionModal}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={() => handleExtractionConfirm(extractionValue)}
                disabled={!extractionValue}
                className="flex-1 sm:flex-none"
              >
                <Check className="mr-2 h-4 w-4" />
                Adicionar Lucro
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">ArbyPro FreeBets</h1>
        <p className="text-muted-foreground text-lg">Gerencie suas freebets e calcule extrações com precisão</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Freebets Ativas</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{activeFreebets}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl sm:text-2xl font-bold text-secondary">R$ {totalFreebetValue.toFixed(2)}</p>
              </div>
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Extraídas</p>
                <p className="text-xl sm:text-2xl font-bold text-accent">{extractedFreebets}</p>
              </div>
              <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Lucro Total</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">R$ {totalProfit.toFixed(2)}</p>
              </div>
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="planner" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-4 gap-1 p-1 text-xs sm:text-sm">
          <TabsTrigger value="planner" className="flex flex-col items-center justify-center h-12 md:h-9 md:flex-row">
            <span className="md:hidden">📋</span>
            <span>Planilha</span>
          </TabsTrigger>
          <TabsTrigger value="extraction" className="flex flex-col items-center justify-center h-12 md:h-9 md:flex-row">
            <span className="md:hidden">🧮</span>
            <span>Calculadora</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex flex-col items-center justify-center h-12 md:h-9 md:flex-row">
            <span className="md:hidden">📈</span>
            <span>Estatísticas</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex flex-col items-center justify-center h-12 md:h-9 md:flex-row">
            <span className="md:hidden">⚙️</span>
            <span>Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Freebet Planner Tab */}
        <TabsContent value="planner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Nova Freebet
              </CardTitle>
              <CardDescription>Registre suas freebets para acompanhar melhor suas oportunidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="name">Nome/Casa</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Bet365 Promo"
                    value={newFreebet.name}
                    onChange={(e) => setNewFreebet({ ...newFreebet, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="50.00"
                    value={newFreebet.value}
                    onChange={(e) => setNewFreebet({ ...newFreebet, value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="minOdds">Odd Mínima</Label>
                  <Input
                    id="minOdds"
                    type="number"
                    step="0.01"
                    placeholder="1.50"
                    value={newFreebet.minOdds}
                    onChange={(e) => setNewFreebet({ ...newFreebet, minOdds: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry">Validade</Label>
                  <Input
                    id="expiry"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newFreebet.expiry}
                    onChange={(e) => setNewFreebet({ ...newFreebet, expiry: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addFreebet} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Freebet
              </Button>
            </CardContent>
          </Card>

          {/* Freebets List */}
          <Card>
            <CardHeader>
              <CardTitle>Suas Freebets</CardTitle>
              <CardDescription>
                {freebets.length === 0
                  ? "Nenhuma freebet cadastrada ainda"
                  : `${freebets.length} freebet(s) cadastrada(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Freebets Ativas */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary border-b pb-2">Freebets Ativas</h3>
                  {freebets.filter(f => f.status === "active").length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma freebet ativa</p>
                  ) : (
                    freebets
                      .filter(f => f.status === "active")
                      .map((freebet) => (
                        <div
                          key={freebet.id}
                          className="p-4 rounded-lg border bg-card border-border hover:shadow-md transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                                                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-sm sm:text-base">{freebet.name}</h3>
                                <Badge variant="default" className="text-xs">Ativa</Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Valor:</span> R$ {freebet.value.toFixed(2)}
                                </div>
                                <div>
                                  <span className="font-medium">Odd Min:</span> {freebet.minOdds}
                                </div>
                                <div>
                                  <span className="font-medium">Validade:</span>{" "}
                                  {new Date(freebet.expiry).toLocaleDateString("pt-BR")}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1 h-auto sm:h-9 sm:text-sm sm:px-3 sm:py-2"
                                onClick={() => toggleFreebetUsed(freebet.id)}
                              >
                                Extrair
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="text-xs px-2 py-1 h-auto sm:h-9 sm:text-sm sm:px-3 sm:py-2"
                                onClick={() => removeFreebet(freebet.id)}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                
                {/* Freebets Expiradas */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-destructive border-b pb-2">Freebets Expiradas</h3>
                  {freebets.filter(f => f.status === "expired").length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma freebet expirada</p>
                  ) : (
                    freebets
                      .filter(f => f.status === "expired")
                      .map((freebet) => (
                        <div
                          key={freebet.id}
                          className="p-4 rounded-lg border bg-muted/30 border-muted opacity-70 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                                                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-sm sm:text-base">{freebet.name}</h3>
                                <Badge variant="destructive" className="text-xs">Expirada</Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Valor:</span> R$ {freebet.value.toFixed(2)}
                                </div>
                                <div>
                                  <span className="font-medium">Odd Min:</span> {freebet.minOdds}
                                </div>
                                <div>
                                  <span className="font-medium">Validade:</span>{" "}
                                  {new Date(freebet.expiry).toLocaleDateString("pt-BR")}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="text-xs px-2 py-1 h-auto sm:h-9 sm:text-sm sm:px-3 sm:py-2"
                                onClick={() => removeFreebet(freebet.id)}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                
                {/* Freebets Extraídas */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-600 border-b pb-2">Freebets Extraídas</h3>
                  {freebets.filter(f => f.status === "extracted").length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma freebet extraída</p>
                  ) : (
                    freebets
                      .filter(f => f.status === "extracted")
                      .map((freebet) => (
                        <div
                          key={freebet.id}
                          className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/10 border-green-100 dark:border-green-900/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                                                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-sm sm:text-base">{freebet.name}</h3>
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                                  Extraída
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Valor Original:</span> R$ {freebet.value.toFixed(2)}
                                </div>
                                <div>
                                  <span className="font-medium">Lucro Extraído:</span>{" "}
                                  <span className="text-green-600 font-medium">
                                    R$ {(freebet.extractedValue || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Taxa de Extração:</span>{" "}
                                  {(((freebet.extractedValue || 0) / freebet.value) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1 h-auto sm:h-9 sm:text-sm sm:px-3 sm:py-2"
                                onClick={() => toggleFreebetUsed(freebet.id)}
                              >
                                Reativar
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="text-xs px-2 py-1 h-auto sm:h-9 sm:text-sm sm:px-3 sm:py-2"
                                onClick={() => removeFreebet(freebet.id)}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extraction Calculator Tab */}
        <TabsContent value="extraction" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Extração (SNR)
              </CardTitle>
              <CardDescription>Calcule a extração ideal para freebets Stake Not Returned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="freebetValue">Valor da Freebet (R$)</Label>
                  <Input
                    id="freebetValue"
                    type="number"
                    placeholder="50.00"
                    value={extractionData.freebetValue}
                    onChange={(e) => {
                      setExtractionData({ ...extractionData, freebetValue: e.target.value })
                      if (userSettings.autoCalculate && extractionData.backOdds && extractionData.layOdds) {
                        setTimeout(calculateExtraction, 100)
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="backOdds">Odd Back</Label>
                  <Input
                    id="backOdds"
                    type="number"
                    step="0.01"
                    placeholder="2.50"
                    value={extractionData.backOdds}
                    onChange={(e) => {
                      setExtractionData({ ...extractionData, backOdds: e.target.value })
                      if (userSettings.autoCalculate && extractionData.freebetValue && extractionData.layOdds) {
                        setTimeout(calculateExtraction, 100)
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="layOdds">Odd Lay</Label>
                  <Input
                    id="layOdds"
                    type="number"
                    step="0.01"
                    placeholder="2.60"
                    value={extractionData.layOdds}
                    onChange={(e) => {
                      setExtractionData({ ...extractionData, layOdds: e.target.value })
                      if (userSettings.autoCalculate && extractionData.freebetValue && extractionData.backOdds) {
                        setTimeout(calculateExtraction, 100)
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    value={extractionData.commission}
                    onChange={(e) => setExtractionData({ ...extractionData, commission: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={calculateExtraction} className="w-full md:w-auto">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Extração
                </Button>
                
                {extractionResult && selectedFreebetId && (
                  <Button 
                    onClick={applyExtractionResult}
                    variant="secondary" 
                    className="w-full md:w-auto"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Contabilizar Lucro Automaticamente
                  </Button>
                )}
              </div>

              {extractionResult && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">Resultado da Extração</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-secondary">Apostas Necessárias:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Back Stake (Freebet):</span>
                            <span className="font-medium">R$ {extractionResult.backStake.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lay Stake:</span>
                            <span className="font-medium">R$ {extractionResult.layStake.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Responsabilidade:</span>
                            <span className="font-medium">R$ {extractionResult.liability.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold text-secondary">Resultado:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Lucro Garantido:</span>
                            <span
                              className={`font-bold text-lg ${extractionResult.profit > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              R$ {extractionResult.profit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxa de Extração:</span>
                            <span className="font-medium">
                              {extractionResult.extractionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lucro se ganhar na Casa:</span>
                            <span className="font-medium">
                              R$ {extractionResult.backWin.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lucro se ganhar na Exchange:</span>
                            <span className="font-medium">
                              R$ {extractionResult.layWin.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>Personalize sua experiência com o Freebet Planner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Preferências de Cálculo</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="defaultCommission">Comissão Padrão (%)</Label>
                        <p className="text-sm text-muted-foreground">
                          Define a comissão padrão utilizada nos cálculos de extração
                        </p>
                      </div>
                      <Input
                        id="defaultCommission"
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        value={userSettings.defaultCommission}
                                                  onChange={(e) => {
                            setUserSettings({ ...userSettings, defaultCommission: e.target.value })
                          }}
                        className="w-24"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="autoCalculate" 
                        checked={userSettings.autoCalculate}
                        onCheckedChange={(checked) => {
                          setUserSettings({ ...userSettings, autoCalculate: !!checked })
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="autoCalculate"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Cálculo automático
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Atualiza os resultados automaticamente ao alterar os valores
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Aparência</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="theme">Tema</Label>
                        <p className="text-sm text-muted-foreground">
                          Escolha entre tema claro e escuro
                        </p>
                      </div>
                      <select
                        id="theme"
                        value={userSettings.theme}
                        onChange={(e) => {
                          setUserSettings({ ...userSettings, theme: e.target.value })
                          setTheme(e.target.value)
                        }}
                        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="system">Sistema</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Gerenciamento de Dados</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto mr-2"
                      onClick={() => {
                        // Exportar freebets para CSV
                        const csvContent = "data:text/csv;charset=utf-8," + 
                          "Nome,Valor,Odd Mínima,Validade,Status,Valor Extraído\n" +
                          freebets.map(fb => {
                            return `"${fb.name}",${fb.value},${fb.minOdds},${fb.expiry},${fb.status},${fb.extractedValue || 0}`
                          }).join("\n")
                        
                        const encodedUri = encodeURI(csvContent)
                        const link = document.createElement("a")
                        link.setAttribute("href", encodedUri)
                        link.setAttribute("download", "freebets.csv")
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      Exportar Freebets (CSV)
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full sm:w-auto"
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja limpar todo o histórico de freebets? Esta ação não pode ser desfeita.")) {
                          if (isSupabaseReady) {
                            clearFreebets().then(() => {
                              setFreebets([])
                              setTotalProfit(0)
                              toast({
                                title: "Histórico limpo",
                                description: "Todas as freebets foram removidas com sucesso.",
                              })
                            }).catch(error => {
                              console.error("Erro ao limpar histórico:", error)
                              toast({
                                title: "Erro",
                                description: "Ocorreu um erro ao limpar o histórico de freebets.",
                                variant: "destructive",
                              })
                            })
                          } else {
                            setFreebets([])
                            setTotalProfit(0)
                            toast({
                              title: "Histórico limpo",
                              description: "Todas as freebets foram removidas com sucesso.",
                            })
                          }
                        }
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Limpar Histórico
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Conta</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email">Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Altere seu endereço de email
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="email"
                          type="email"
                          placeholder={user?.email || ""}
                          className="w-48"
                          onChange={(e) => {
                            setUserSettings({ ...userSettings, email: e.target.value })
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (userSettings.email && userSettings.email !== user?.email) {
                              updateUserEmail(userSettings.email).then(() => {
                                toast({
                                  title: "Email atualizado",
                                  description: "Um link de confirmação foi enviado para o novo email.",
                                })
                              }).catch(error => {
                                toast({
                                  title: "Erro",
                                  description: error.message || "Ocorreu um erro ao atualizar o email.",
                                  variant: "destructive",
                                })
                              })
                            }
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sobre</h3>
                  <p className="text-sm text-muted-foreground">
                    ArbyPro FreeBets v1.0.0 - Uma ferramenta para gerenciar e extrair valor de freebets
                  </p>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end px-6 pb-6">
              <Button
                type="button"
                onClick={async () => {
                  if (!settingsChanged) return
                  
                  try {
                    // Salvar configurações usando o hook personalizado
                    const success = await saveUserSettings()
                    
                    if (!success) {
                      throw new Error("Erro ao salvar configurações")
                    }
                    
                    // Salvar configurações no localStorage
                    try {
                      localStorage.setItem('userSettings', JSON.stringify(userSettings))
                      console.log('Configurações salvas no localStorage:', userSettings)
                    } catch (e) {
                      console.error('Erro ao salvar no localStorage:', e)
                    }
                    
                    // Mostrar notificação de sucesso
                    toast({
                      title: "Configurações salvas",
                      description: "Suas preferências foram atualizadas com sucesso.",
                      variant: "default",
                    })
                  } catch (error: any) {
                    toast({
                      title: "Erro",
                      description: error.message || "Ocorreu um erro ao salvar as configurações.",
                      variant: "destructive",
                    })
                  }
                }}
                disabled={!settingsChanged || savingSettings}
                className="w-full sm:w-auto"
              >
                {savingSettings ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Estatísticas Mensais
              </CardTitle>
              <CardDescription>Acompanhe o desempenho das suas freebets por mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seletor de Mês/Ano */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i
                      return (
                        <option key={year} value={year}>{year}</option>
                      )
                    })}
                  </select>
                </div>
              </div>
              
              {/* Cards de Resumo do Mês Selecionado */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {monthlyStats.length > 0 && (() => {
                  // Encontrar estatísticas do mês selecionado
                  const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
                  const stats = monthlyStats.find(s => s.monthKey === selectedMonthKey) || {
                    totalFreebets: 0,
                    extractedFreebets: 0,
                    profit: 0,
                    extractionRate: 0
                  }
                  
                  return (
                    <>
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                          <h3 className="text-sm font-medium text-muted-foreground">Total de Freebets</h3>
                          <p className="text-2xl font-bold text-primary mt-1">{stats.totalFreebets}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-secondary/5 border-secondary/20">
                        <CardContent className="p-4">
                          <h3 className="text-sm font-medium text-muted-foreground">Freebets Extraídas</h3>
                          <p className="text-2xl font-bold text-secondary mt-1">{stats.extractedFreebets}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-500/5 border-green-500/20">
                        <CardContent className="p-4">
                          <h3 className="text-sm font-medium text-muted-foreground">Lucro Total</h3>
                          <p className="text-2xl font-bold text-green-600 mt-1">R$ {stats.profit.toFixed(2)}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-accent/5 border-accent/20">
                        <CardContent className="p-4">
                          <h3 className="text-sm font-medium text-muted-foreground">Taxa Média de Extração</h3>
                          <p className="text-2xl font-bold text-accent mt-1">{stats.extractionRate.toFixed(1)}%</p>
                        </CardContent>
                      </Card>
                    </>
                  )
                })()}
              </div>
              

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
