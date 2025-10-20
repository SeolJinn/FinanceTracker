import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { walletService, WalletDto } from '@/services/walletService'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const [newWallet, setNewWallet] = useState<{ name: string; currencyCode: string }>({ name: '', currencyCode: 'USD' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [baseCurrency, setBaseCurrency] = useState<string>('EUR')
  const [quoteCurrency, setQuoteCurrency] = useState<string>('USD')
  const [ratesData, setRatesData] = useState<{ date: string; rate: number }[]>([])
  const [ratesLoading, setRatesLoading] = useState<boolean>(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const list = await walletService.list()
      setWallets(list)
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchRates = async () => {
      if (!baseCurrency || !quoteCurrency) return
      setRatesLoading(true)
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 30)
        const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const url = `https://api.frankfurter.app/${toYMD(start)}..${toYMD(end)}?from=${encodeURIComponent(baseCurrency)}&to=${encodeURIComponent(quoteCurrency)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch rates')
        const json = await res.json()
        const rates = json?.rates || {}
        const points: { date: string; rate: number }[] = Object.keys(rates)
          .sort()
          .map(k => ({ date: k, rate: Number(rates[k]?.[quoteCurrency]) || 0 }))
        setRatesData(points)
      } catch {
        setRatesData([])
      } finally {
        setRatesLoading(false)
      }
    }
    fetchRates()
  }, [baseCurrency, quoteCurrency])

  const yDomain = useMemo(() => {
    if (!ratesData || ratesData.length === 0) return undefined as unknown as [number, number]
    const vals = ratesData.map(p => p.rate).filter(x => isFinite(x))
    if (vals.length === 0) return undefined as unknown as [number, number]
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = max - min
    const pad = span > 0 ? span * 0.2 : (max || 1) * 0.02
    return [Math.max(0, min - pad), max + pad] as [number, number]
  }, [ratesData])

  const create = async () => {
    if (!newWallet.name.trim()) {
      setError('Please enter a wallet name')
      return
    }
    try {
      setError('')
      await walletService.create({ name: newWallet.name.trim(), currencyCode: newWallet.currencyCode })
      setNewWallet({ name: '', currencyCode: 'USD' })
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to create wallet')
    }
  }

  const saveEdit = async (id: number) => {
    if (!editingName.trim()) return setEditingId(null)
    try {
      await walletService.update(id, { name: editingName.trim() })
      setEditingId(null)
      setEditingName('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to update wallet')
    }
  }

  const remove = async (id: number) => {
    try {
      await walletService.delete(id)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete wallet')
    }
  }

  const [transferForm, setTransferForm] = useState<{ fromId: string; toId: string; amount: string; rate: string }>({ fromId: '', toId: '', amount: '', rate: '' })
  const [liveRate, setLiveRate] = useState<string>('')

  useEffect(() => {
    const fetchRate = async () => {
      setLiveRate('')
      const fromWalletId = parseInt(transferForm.fromId)
      const toWalletId = parseInt(transferForm.toId)
      if (!fromWalletId || !toWalletId) return
      const from = wallets.find(w => w.id === fromWalletId)
      const to = wallets.find(w => w.id === toWalletId)
      if (!from || !to) return
      if (from.currencyCode === to.currencyCode) {
        setLiveRate('1.0000')
        return
      }
      try {
        const r = await walletService.getRate(fromWalletId, toWalletId)
        setLiveRate((Number(r) || 0).toFixed(4))
      } catch {}
    }
    fetchRate()
  }, [transferForm.fromId, transferForm.toId, wallets])
  const doTransfer = async () => {
    const fromWalletId = parseInt(transferForm.fromId)
    const toWalletId = parseInt(transferForm.toId)
    const amount = parseFloat(transferForm.amount)
    if (!fromWalletId || !toWalletId || !isFinite(amount) || amount <= 0 || fromWalletId === toWalletId) {
      setError('Please fill transfer fields correctly')
      return
    }
    try {
      setError('')
      await walletService.transfer({ fromWalletId, toWalletId, amount })
      setTransferForm({ fromId: '', toId: '', amount: '', rate: '' })
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to transfer')
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallet Management</h1>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your wallets</CardTitle>
            <CardDescription>Create, rename or delete wallets</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading wallets...</div>
            ) : wallets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No wallets yet</div>
            ) : (
              <div className="space-y-3">
                {wallets.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded border">
                    {editingId === w.id ? (
                      <>
                        <input
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition flex-1"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                        />
                        <Button size="sm" onClick={() => saveEdit(w.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingName('') }}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium">{w.name}</div>
                          <div className="text-xs text-muted-foreground">Currency: {w.currencyCode}</div>
                          <div className="text-xs">Balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currencyCode }).format(w.balance)}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(w.id); setEditingName(w.name) }}>Rename</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(w.id)}>Delete</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a wallet</CardTitle>
              <CardDescription>Add a wallet with currency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
                  placeholder="Name (e.g. Main, Savings)"
                  value={newWallet.name}
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                />
                <Select
                  value={newWallet.currencyCode}
                  onValueChange={(val) => setNewWallet({ ...newWallet, currencyCode: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD','EUR','JPY','CNY','GBP','AUD','CAD','CHF','RON'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={create}>Create</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer between wallets</CardTitle>
              <CardDescription>Move funds; optionally set a custom FX rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={transferForm.fromId} onValueChange={(v) => setTransferForm({ ...transferForm, fromId: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={transferForm.toId} onValueChange={(v) => setTransferForm({ ...transferForm, toId: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>)}
                  </SelectContent>
                </Select>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
                  placeholder="Amount"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                />
                <div className="text-xs text-muted-foreground self-center">
                  {(() => {
                    const from = wallets.find(w => String(w.id) === transferForm.fromId)
                    const to = wallets.find(w => String(w.id) === transferForm.toId)
                    if (!from || !to) return 'Select wallets to see rate'
                    const amt = parseFloat(transferForm.amount)
                    const converted = isFinite(amt) && amt > 0 && liveRate ? (amt * parseFloat(liveRate)).toFixed(2) : ''
                    const preview = converted ? ` · ${amt} ${from.currencyCode} → ${converted} ${to.currencyCode}` : ''
                    return `Rate: ${liveRate ? liveRate : '…'} (${from.currencyCode}→${to.currencyCode})${preview}`
                  })()}
                </div>
              </div>
              <div className="mt-3">
                {(() => {
                  const from = wallets.find(w => String(w.id) === transferForm.fromId)
                  const amt = parseFloat(transferForm.amount)
                  const insufficient = !from || !isFinite(amt) || amt <= 0 || (from && amt > (from.balance || 0))
                  return (
                    <Button size="sm" onClick={doTransfer} disabled={insufficient} title={insufficient ? 'Insufficient balance or invalid amount' : undefined}>Transfer</Button>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exchange Rate</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD','EUR','JPY','CNY','GBP','AUD','CAD','CHF','RON'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">→</span>
              <Select value={quoteCurrency} onValueChange={setQuoteCurrency}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD','EUR','JPY','CNY','GBP','AUD','CAD','CHF','RON'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] xl:h-[380px]">
            {ratesLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading rates…</div>
            ) : ratesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratesData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
                  {yDomain ? (
                    <YAxis tickFormatter={(v: number) => v.toFixed(2)} width={60} domain={yDomain} />
                  ) : (
                    <YAxis tickFormatter={(v: number) => v.toFixed(2)} width={60} />
                  )}
                  <RechartsTooltip formatter={(value: number) => (value as number).toFixed(4)} labelFormatter={(l: string) => new Date(l).toLocaleDateString()} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" name={`${baseCurrency}/${quoteCurrency}`} stroke="#3b82f6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


