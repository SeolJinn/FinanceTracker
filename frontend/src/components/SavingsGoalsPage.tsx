import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarComponent } from '@/components/Calendar'
import { savingsGoalService, CreateSavingsGoalRequest, UpdateSavingsGoalRequest, SavingsGoalResponse } from '@/services/savingsGoalService'
import { transactionService, TransactionType, TransactionResponse } from '@/services/transactionService'
import { walletService } from '@/services/walletService'
import { ChevronDown } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'

export default function SavingsGoalsPage() {
  const navigate = useNavigate()
  const [wallets, setWallets] = useState<{ id: number; name: string; currencyCode: string }[]>([])
  const [currentWalletId, setCurrentWalletId] = useState<number | null>(null)
  const [goals, setGoals] = useState<SavingsGoalResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<{ title: string; targetAmount: string; startDate: string; targetDate: string; walletId: string }>({
    title: '',
    targetAmount: '',
    startDate: '',
    targetDate: '',
    walletId: '',
  })

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
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await savingsGoalService.list(currentWalletId ?? undefined)
        setGoals(data)
      } catch (e: any) {
        setError(e?.message || 'Failed to load goals')
      } finally {
        setLoading(false)
      }
    })()
  }, [currentWalletId])

  useEffect(() => {
    if (currentWalletId != null) {
      localStorage.setItem('selectedWalletId', String(currentWalletId))
    }
  }, [currentWalletId])

  const formatCurrency = (amount: number) => {
    const currency = wallets.find(w => w.id === (currentWalletId ?? -1))?.currencyCode || 'USD'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  const toYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const parseYMD = (value?: string) => {
    if (!value) return undefined as unknown as Date | undefined
    const [y, m, d] = value.split('-').map(x => parseInt(x, 10))
    if (!y || !m || !d) return undefined as unknown as Date | undefined
    return new Date(y, m - 1, d)
  }

  const openCreate = () => {
    setEditingId(null)
    setFormOpen(true)
    setForm({
      title: '',
      targetAmount: '',
      startDate: '',
      targetDate: '',
      walletId: currentWalletId ? String(currentWalletId) : '',
    })
  }

  const openEdit = (goal: SavingsGoalResponse) => {
    setEditingId(goal.id)
    setFormOpen(true)
    setForm({
      title: goal.title || '',
      targetAmount: String(goal.targetAmount),
      startDate: goal.startDate.split('T')[0],
      targetDate: goal.targetDate.split('T')[0],
      walletId: String(goal.walletId),
    })
  }

  const save = async () => {
    setError('')
    const amount = parseFloat(form.targetAmount)
    if (!isFinite(amount) || amount <= 0) {
      setError('Enter a valid target amount > 0')
      return
    }
    if (!form.startDate || !form.targetDate || !form.walletId) {
      setError('Select wallet, start date and target date')
      return
    }
    const start = new Date(form.startDate)
    const end = new Date(form.targetDate)
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setError('Dates are invalid')
      return
    }
    try {
      if (editingId == null) {
        const req: CreateSavingsGoalRequest = {
          walletId: parseInt(form.walletId, 10),
          targetAmount: amount,
          startDate: form.startDate,
          targetDate: form.targetDate,
          title: form.title?.trim() || undefined,
        }
        const created = await savingsGoalService.create(req)
        setGoals([created, ...goals])
      } else {
        const req: UpdateSavingsGoalRequest = {
          targetAmount: amount,
          startDate: form.startDate,
          targetDate: form.targetDate,
          title: form.title?.trim() || undefined,
        }
        const updated = await savingsGoalService.update(editingId, req)
        setGoals(goals.map(g => (g.id === editingId ? updated : g)))
      }
      setFormOpen(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to save goal')
    }
  }

  const remove = async (id: number) => {
    try {
      await savingsGoalService.delete(id)
      setGoals(goals.filter(g => g.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Failed to delete goal')
    }
  }

  const computeProgress = (goal: SavingsGoalResponse, txs: TransactionResponse[]) => {
    const start = new Date(goal.startDate)
    const end = new Date(goal.targetDate)
    const inRange = txs.filter(t => t.walletId === goal.walletId && new Date(t.date) >= start && new Date(t.date) <= end)
    const net = inRange.reduce((s, t) => s + (t.type === TransactionType.Income ? t.amount : -t.amount), 0)
    const pct = Math.max(0, Math.min(100, (net / (goal.targetAmount || 1)) * 100))
    return { net, pct }
  }

  const [walletTransactions, setWalletTransactions] = useState<TransactionResponse[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    (async () => {
      if (!currentWalletId) { setWalletTransactions([]); return }
      try {
        const txs = await transactionService.getTransactions(undefined, undefined, undefined, currentWalletId)
        setWalletTransactions(txs)
      } catch {}
    })()
  }, [currentWalletId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Savings Goals</h1>
            <p className="text-xs text-muted-foreground">Create and track goals per wallet</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/wallets')}>Wallets</Button>
            <div className="hidden md:flex items-center gap-2 ml-1">
              <div className="text-xs text-muted-foreground">Wallet:</div>
              <Select value={String(currentWalletId ?? '')} onValueChange={(val: string) => setCurrentWalletId(val ? parseInt(val) : null)}>
                <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={openCreate}>New goal</Button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        {error && (
          <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</div>
        )}

        {formOpen && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId == null ? 'Create goal' : 'Edit goal'}</CardTitle>
              <CardDescription>Track a target amount by a date</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Wallet</div>
                  <Select value={form.walletId} onValueChange={(v) => setForm({ ...form, walletId: v })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map(w => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Title (optional)</div>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Emergency fund" />
                </div>
                <div className="sm:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Target amount</div>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="sm:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Start date</div>
                  <CalendarComponent value={form.startDate ? parseYMD(form.startDate) : undefined} onChange={(d) => setForm({ ...form, startDate: d ? toYMD(d) : '' })} placeholder="Pick start" />
                </div>
                <div className="sm:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Target date</div>
                  <CalendarComponent value={form.targetDate ? parseYMD(form.targetDate) : undefined} onChange={(d) => setForm({ ...form, targetDate: d ? toYMD(d) : '' })} placeholder="Pick target" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No goals yet. Create your first one.</div>
          ) : (
            goals.map(g => (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{g.title || 'Untitled goal'}</CardTitle>
                    <CardDescription>
                      {formatCurrency(g.targetAmount)} · {new Date(g.startDate).toLocaleDateString()} → {new Date(g.targetDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="icon" variant="ghost" onClick={() => toggleExpand(g.id)} aria-label={expanded.has(g.id) ? 'Collapse' : 'Expand'} title={expanded.has(g.id) ? 'Collapse' : 'Expand'}>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded.has(g.id) ? 'rotate-180' : ''}`} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(g.id)}>Delete</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const { net, pct } = computeProgress(g, walletTransactions)
                    const now = new Date()
                    const end = new Date(g.targetDate)
                    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    const remaining = Math.max(0, g.targetAmount - net)
                    const neededPerDay = daysLeft > 0 ? remaining / daysLeft : 0
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Progress</div>
                          <div className="font-medium">{pct.toFixed(0)}%</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Saved</div>
                          <div className="font-medium">{formatCurrency(Math.max(0, net))}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Remaining</div>
                          <div className="font-medium">{formatCurrency(remaining)}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">Needed/day</div>
                          <div className="font-medium">{formatCurrency(neededPerDay)}</div>
                        </div>
                      </div>
                    )
                  })()}

                  {expanded.has(g.id) && (
                    <div className="mt-4 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={buildSavingsChartData(g, walletTransactions)} margin={{ left: 8, right: 8, top: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis tickFormatter={(v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                          <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: wallets.find(w => w.id === (currentWalletId ?? -1))?.currencyCode || 'USD' }).format(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="ideal" name="Ideal trajectory" stroke="#3b82f6" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="actual" name="Actual savings" stroke="#10b981" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

type SavingsPoint = { label: string; ideal: number; actual: number }

function buildSavingsChartData(goal: SavingsGoalResponse, txs: TransactionResponse[]): SavingsPoint[] {
  const start = new Date(goal.startDate)
  const end = new Date(goal.targetDate)
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
      const key = ymd(cursor)
      const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      buckets.push({ key, label, date: new Date(cursor) })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const sums = new Map<string, { net: number; label: string }>()
  for (const b of buckets) sums.set(b.key, { net: 0, label: b.label })

  for (const t of txs) {
    if (t.walletId !== goal.walletId) continue
    const d = new Date(t.date)
    if (d < start || d > end) continue
    const key = useMonthly ? `${d.getFullYear()}-${d.getMonth()}` : ymd(d)
    if (!sums.has(key)) continue
    const delta = t.type === TransactionType.Income ? t.amount : -t.amount
    const current = sums.get(key)!
    current.net += delta
    sums.set(key, current)
  }

  const totalDurationMs = end.getTime() - start.getTime()
  let runningActual = 0
  const data: SavingsPoint[] = []
  for (const b of buckets) {
    if (b.date <= now) {
      runningActual += sums.get(b.key)?.net || 0
    }
    const timeMs = Math.min(b.date.getTime(), end.getTime()) - start.getTime()
    const fraction = Math.max(0, Math.min(1, timeMs / totalDurationMs))
    const ideal = goal.targetAmount * fraction
    data.push({ label: b.label, ideal, actual: Math.max(0, runningActual) })
  }
  return data
}

function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


