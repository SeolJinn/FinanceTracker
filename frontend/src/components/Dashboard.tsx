import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, LogOut, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { AppMenuButtons } from "./AppMenuButtons"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { TransactionPage } from "./TransactionPage"
import { walletService } from "../services/walletService"
import { TransactionResponse, TransactionType, transactionService } from "../services/transactionService"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from "recharts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Dashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions'>('dashboard')
  const [allTransactions, setAllTransactions] = useState<TransactionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '3m' | '6m' | '12m' | 'ytd'>('6m')
  const [wallets, setWallets] = useState<{ id: number; name: string; currencyCode: string }[]>([])
  const [currentWalletId, setCurrentWalletId] = useState<number | null>(null)

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadDashboardData()
    }
  }, [currentView, currentWalletId])

  useEffect(() => {
    (async () => {
      try {
        const ws = await walletService.list()
        setWallets(ws)
        if (ws.length > 0 && currentWalletId == null) {
          const saved = localStorage.getItem('selectedWalletId')
          const savedId = saved ? parseInt(saved, 10) : NaN
          const exists = ws.some(w => w.id === savedId)
          setCurrentWalletId(exists ? savedId : ws[0].id)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (currentWalletId != null) {
      localStorage.setItem('selectedWalletId', String(currentWalletId))
    }
  }, [currentWalletId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const transactions = await transactionService.getTransactions(undefined, undefined, undefined, currentWalletId ?? undefined)
      const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setAllTransactions(sorted)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === TransactionType.Income)
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0)

    const overallIncome = allTransactions
      .filter(t => t.type === TransactionType.Income)
      .reduce((sum, t) => sum + t.amount, 0)

    const overallExpenses = allTransactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
      overallBalance: overallIncome - overallExpenses,
    }
  }

  type ChartPoint = { label: string; income: number; expenses: number }

  const buildIncomeExpenseChartData = (range: '7d' | '30d' | '3m' | '6m' | '12m' | 'ytd'): ChartPoint[] => {
    if (allTransactions.length === 0) return []

    const now = new Date()
    const startEnd = (() => {
      switch (range) {
        case '7d': {
          const start = new Date(now)
          start.setDate(start.getDate() - 6)
          return { start, end: now, granularity: 'day' as const }
        }
        case '30d': {
          const start = new Date(now)
          start.setDate(start.getDate() - 29)
          return { start, end: now, granularity: 'day' as const }
        }
        case '3m': {
          return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now, granularity: 'month' as const }
        }
        case '6m': {
          return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: now, granularity: 'month' as const }
        }
        case '12m': {
          return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: now, granularity: 'month' as const }
        }
        case 'ytd': {
          return { start: new Date(now.getFullYear(), 0, 1), end: now, granularity: 'month' as const }
        }
      }
    })()

    const { start, end, granularity } = startEnd

    const buckets: { key: string; label: string }[] = []
    if (granularity === 'day') {
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = toYMD(cursor)
        const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        buckets.push({ key, label })
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
      const cursor = new Date(startMonth)
      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`
        const label = cursor.toLocaleDateString('en-US', { month: 'short' })
        buckets.push({ key, label })
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }

    const sums = new Map<string, { income: number; expenses: number; label: string }>()
    for (const b of buckets) {
      sums.set(b.key, { income: 0, expenses: 0, label: b.label })
    }

    for (const t of allTransactions) {
      const d = new Date(t.date)
      if (d < start || d > end) continue
      const key = granularity === 'day' ? toYMD(d) : `${d.getFullYear()}-${d.getMonth()}`
      if (!sums.has(key)) continue
      const entry = sums.get(key)!
      if (t.type === TransactionType.Income) {
        entry.income += t.amount
      } else if (t.type === TransactionType.Expense) {
        entry.expenses += t.amount
      }
    }

    return buckets.map(b => {
      const e = sums.get(b.key)!
      return { label: e.label, income: e.income, expenses: e.expenses }
    })
  }

  const formatCurrency = (amount: number) => {
    const currency = wallets.find(w => w.id === currentWalletId)?.currencyCode || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const toYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }


  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || ''
    const last = user?.lastName?.[0] || ''
    return (first + last || 'FT').toUpperCase()
  }, [user])

  type CategorySlice = { name: string; value: number }

  const expenseByCategory: CategorySlice[] = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthly = allTransactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const map = new Map<string, number>()
    for (const t of monthly) {
      if (t.type !== TransactionType.Expense) continue
      const key = t.categoryName || 'Other'
      map.set(key, (map.get(key) || 0) + t.amount)
    }
    const data: CategorySlice[] = Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    data.sort((a, b) => b.value - a.value)
    if (data.length > 6) {
      const top = data.slice(0, 5)
      const othersTotal = data.slice(5).reduce((s, x) => s + x.value, 0)
      return [...top, { name: 'Others', value: othersTotal }]
    }
    return data
  }, [allTransactions])

  const pieColors: string[] = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8b5cf6',
  ]


  if (currentView === 'transactions') {
    return <TransactionPage onBack={() => setCurrentView('dashboard')} />
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[1600px] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold leading-tight">Finance Tracker</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Your money, beautifully organized</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentView('transactions')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add / Manage
            </Button>
            <AppMenuButtons />
            <div className="hidden md:flex items-center gap-2 ml-1">
              <div className="text-xs text-muted-foreground">Wallet:</div>
              <Select
                value={String(currentWalletId ?? '')}
                onValueChange={(val: string) => setCurrentWalletId(val ? parseInt(val) : null)}
              >
                <SelectTrigger className="h-8 w-[200px]">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name} ({w.currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ThemeToggle />
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-medium">{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</div>
                    <div className="text-muted-foreground">{user?.email ?? 'Not signed in'}</div>
                  </div>
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="ml-1"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="bg-gradient-to-br from-primary/5 to-background lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.overallBalance)}</div>
              <p className="text-xs text-muted-foreground">Current balance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/5 to-background lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.monthlyIncome)}</div>
              <p className="text-xs text-muted-foreground">This month's income</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/5 to-background lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.monthlyExpenses)}</div>
              <p className="text-xs text-muted-foreground">This month's expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/5 to-background lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Total transactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Spending Overview</CardTitle>
                <div className="flex gap-1">
                  {(['7d','30d','3m','6m','12m','ytd'] as const).map((r) => (
                    <Button
                      key={r}
                      variant={chartRange === r ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartRange(r)}
                    >
                      {r.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px] xl:h-[520px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                ) : allTransactions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Add transactions to see your income vs expenses</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildIncomeExpenseChartData(chartRange)} margin={{ left: 8, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                       <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: wallets.find(w => w.id === currentWalletId)?.currencyCode || 'USD' }).format(value)} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>This month by category</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="h-[320px] xl:h-[360px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                ) : expenseByCategory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No expenses this month</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={0}
                        stroke="none"
                        strokeWidth={0}
                      >
                        {expenseByCategory.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number, name: string) => [
                        new Intl.NumberFormat('en-US', { style: 'currency', currency: wallets.find(w => w.id === currentWalletId)?.currencyCode || 'USD' }).format(value as number),
                        name as string
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {expenseByCategory.map((c, idx) => (
                  <div key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto font-medium">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">

          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Loading transactions...</div>
              ) : allTransactions.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No transactions yet</div>
              ) : (
                <div className="divide-y">
                  {allTransactions.slice(0, 8).map((t) => (
                    <div key={t.id} className="py-3 flex items-center gap-3">
                      <div className={`h-8 w-8 grid place-items-center rounded-md ${t.type === TransactionType.Income ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {t.type === TransactionType.Income ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{t.note || (t.type === TransactionType.Income ? 'Income' : 'Expense')}</div>
                          {t.categoryName && (
                            <span className="text-xs text-muted-foreground truncate">· {t.categoryName}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className={`font-medium ${t.type === TransactionType.Income ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === TransactionType.Expense ? '-' : '+'}{formatCurrency(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Monthly Insights</CardTitle>
              <CardDescription>Quick performance glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const now = new Date()
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()
                const monthStart = new Date(currentYear, currentMonth, 1)
                const daysElapsed = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)))
                const savingsRate = totals.monthlyIncome > 0 ? (totals.monthlyBalance / totals.monthlyIncome) : 0
                const avgDailyExpense = totals.monthlyExpenses / daysElapsed
                const topCat = expenseByCategory[0]

                return (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Savings rate</div>
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold">{(savingsRate * 100).toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Balance ÷ Income</div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(0, Math.min(100, savingsRate * 100))}%` }} />
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Avg daily spend</div>
                      <div className="text-2xl font-bold">{formatCurrency(avgDailyExpense || 0)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Top expense category</div>
                      {topCat ? (
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: pieColors[0] }} />
                          <div className="font-medium">{topCat.name}</div>
                          <div className="ml-auto">{formatCurrency(topCat.value)}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No expenses yet this month</div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}