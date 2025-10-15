import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, LogOut, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { TransactionPage } from "./TransactionPage"
import { TransactionResponse, TransactionType, transactionService } from "../services/transactionService"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarComponent } from "./Calendar"
import { savingsGoalService } from "../services/savingsGoalService"

export default function Dashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions'>('dashboard')
  const [allTransactions, setAllTransactions] = useState<TransactionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '3m' | '6m' | '12m' | 'ytd'>('6m')

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadDashboardData()
    }
  }, [currentView])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const transactions = await transactionService.getTransactions()
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const toYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const parseYMD = (value?: string) => {
    if (!value) return undefined as unknown as Date | undefined
    const [y, m, d] = value.split('-').map((x) => parseInt(x, 10))
    if (!y || !m || !d) return undefined as unknown as Date | undefined
    return new Date(y, m - 1, d)
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

  type SavingsGoal = {
    targetAmount: number
    targetDate: string
    startDate: string
  }

  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal | null>(null)
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalForm, setGoalForm] = useState<{ targetAmount: string; targetDate: string; startDate: string }>({
    targetAmount: '',
    targetDate: '',
    startDate: ''
  })
  const [goalError, setGoalError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const goal = await savingsGoalService.get()
        if (goal) {
          setSavingsGoal({
            targetAmount: goal.targetAmount,
            startDate: goal.startDate.split('T')[0],
            targetDate: goal.targetDate.split('T')[0],
          })
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (goalEditing && savingsGoal) {
      setGoalForm({
        targetAmount: String(savingsGoal.targetAmount),
        startDate: savingsGoal.startDate,
        targetDate: savingsGoal.targetDate,
      })
    }
  }, [goalEditing, savingsGoal])

  const saveSavingsGoal = () => {
    setGoalError('')
    const amount = parseFloat(goalForm.targetAmount)
    if (!isFinite(amount) || amount <= 0) {
      setGoalError('Please enter a valid target amount greater than 0.')
      return
    }
    if (!goalForm.startDate || !goalForm.targetDate) {
      setGoalError('Please select both a start date and a target date.')
      return
    }
    const start = new Date(goalForm.startDate)
    const end = new Date(goalForm.targetDate)
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      setGoalError('Dates are invalid. Please pick valid dates.')
      return
    }
    if (end <= start) {
      setGoalError('Target date must be after the start date.')
      return
    }
    const goal: SavingsGoal = { targetAmount: amount, targetDate: goalForm.targetDate, startDate: goalForm.startDate }
    ;(async () => {
      try {
        await savingsGoalService.upsert({
          targetAmount: goal.targetAmount,
          startDate: goal.startDate,
          targetDate: goal.targetDate,
        })
        setSavingsGoal(goal)
        setGoalEditing(false)
      } catch (e: any) {
        setGoalError(e?.message || 'Failed to save goal')
      }
    })()
  }

  const clearSavingsGoal = () => {
    ;(async () => {
      try {
        await savingsGoalService.delete()
        setSavingsGoal(null)
        setGoalError('')
      } catch (e: any) {
        setGoalError(e?.message || 'Failed to clear goal')
      }
    })()
  }

  type SavingsPoint = { label: string; ideal: number; actual: number }

  const buildSavingsChartData = (goal: SavingsGoal | null): SavingsPoint[] => {
    if (!goal) return []
    const start = parseYMD(goal.startDate) as Date
    const end = parseYMD(goal.targetDate) as Date
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return []
    const now = new Date()
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const useMonthly = totalDays > 210

    const buckets: { key: string; label: string; date: Date }[] = []
    if (useMonthly) {
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
      const cursor = new Date(startMonth)
      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`
        const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        buckets.push({ key, label, date: new Date(cursor) })
        cursor.setMonth(cursor.getMonth() + 1)
      }
    } else {
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = toYMD(cursor)
        const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        buckets.push({ key, label, date: new Date(cursor) })
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    const netByKey = new Map<string, number>()
    for (const b of buckets) netByKey.set(b.key, 0)
    for (const t of allTransactions) {
      const d = new Date(t.date)
      // Compare using local date keys to avoid timezone drift
      const dayKey = toYMD(d)
      const startKey = goal.startDate
      const endKey = goal.targetDate
      if (dayKey < startKey || dayKey > endKey) continue
      const key = useMonthly ? `${d.getFullYear()}-${d.getMonth()}` : dayKey
      if (!netByKey.has(key)) continue
      const delta = t.type === TransactionType.Income ? t.amount : -t.amount
      netByKey.set(key, (netByKey.get(key) || 0) + delta)
    }

    const totalDurationMs = end.getTime() - start.getTime()
    let runningActual = 0
    const data: SavingsPoint[] = []
    for (const b of buckets) {
      if (b.date <= now) {
        runningActual += netByKey.get(b.key) || 0
      }
      const timeMs = Math.min(b.date.getTime(), end.getTime()) - start.getTime()
      const fraction = Math.max(0, Math.min(1, timeMs / totalDurationMs))
      const ideal = goal.targetAmount * fraction
      data.push({ label: b.label, ideal, actual: Math.max(0, runningActual) })
    }
    return data
  }

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
                       <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
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
                        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number),
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
          <Card className="lg:col-span-12 order-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Savings Goal</CardTitle>
                {!goalEditing && (
                  <div className="flex gap-2">
                    {savingsGoal && (
                      <Button variant="outline" size="sm" onClick={() => setGoalEditing(true)}>Edit</Button>
                    )}
                    {savingsGoal && (
                      <Button variant="destructive" size="sm" onClick={clearSavingsGoal}>Clear</Button>
                    )}
                  </div>
                )}
              </div>
              <CardDescription>Track progress toward a target amount by a target date</CardDescription>
            </CardHeader>
            <CardContent>
              {!savingsGoal || goalEditing ? (
                <div className="grid gap-3 max-w-xl">
                  {goalError && (
                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                      {goalError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <div className="text-xs text-muted-foreground mb-1">Target amount</div>
                      <input
                        type="number"
                        value={goalForm.targetAmount}
                        onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                        placeholder="e.g. 5000"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-xs text-muted-foreground mb-1">Start date</div>
                      <CalendarComponent
                        value={goalForm.startDate ? parseYMD(goalForm.startDate) : undefined}
                        onChange={(d) => setGoalForm({ ...goalForm, startDate: d ? toYMD(d) : '' })}
                        placeholder="Pick start date"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-xs text-muted-foreground mb-1">Target date</div>
                      <CalendarComponent
                        value={goalForm.targetDate ? parseYMD(goalForm.targetDate) : undefined}
                        onChange={(d) => setGoalForm({ ...goalForm, targetDate: d ? toYMD(d) : '' })}
                        placeholder="Pick target date"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveSavingsGoal}>Save goal</Button>
                    {savingsGoal && (
                      <Button variant="outline" size="sm" onClick={() => setGoalEditing(false)}>Cancel</Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Target</div>
                      <div className="font-medium">{formatCurrency(savingsGoal.targetAmount)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Start</div>
                      <div className="font-medium">{(parseYMD(savingsGoal.startDate) as Date).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Target date</div>
                      <div className="font-medium">{(parseYMD(savingsGoal.targetDate) as Date).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      {(() => {
                        const data = buildSavingsChartData(savingsGoal)
                        const current = data.length ? data[data.length - 1].actual : 0
                        const pct = Math.max(0, Math.min(100, (current / (savingsGoal.targetAmount || 1)) * 100))
                        return (
                          <>
                            <div className="text-xs text-muted-foreground">Progress</div>
                            <div className="font-medium">{pct.toFixed(0)}%</div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  {(() => {
                    const data = buildSavingsChartData(savingsGoal)
                    const current = data.length ? data[data.length - 1].actual : 0
                    const now = new Date()
                    const end = parseYMD(savingsGoal.targetDate) as Date
                    const msPerDay = 1000 * 60 * 60 * 24
                    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / msPerDay))
                    const remaining = Math.max(0, savingsGoal.targetAmount - current)
                    const neededPerDay = daysLeft > 0 ? remaining / daysLeft : 0
                    return (
                      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Remaining</div>
                          <div className="font-medium">{formatCurrency(remaining)}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Days left</div>
                          <div className="font-medium">{daysLeft}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Needed per day</div>
                          <div className="font-medium">{formatCurrency(neededPerDay)}</div>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="h-[320px] xl:h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={buildSavingsChartData(savingsGoal)} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                        <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="ideal" name="Ideal trajectory" stroke="#3b82f6" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="actual" name="Actual savings" stroke="#10b981" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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