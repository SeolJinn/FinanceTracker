import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { peerPaymentService, PeerPaymentRequestDto } from '@/services/peerPaymentService'
import { friendService, FriendDto, WalletDto as FriendWallet } from '@/services/friendService'
import { walletService, WalletDto } from '@/services/walletService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function PeerPaymentsPage() {
  const navigate = useNavigate()
  const [incoming, setIncoming] = useState<PeerPaymentRequestDto[]>([])
  const [outgoing, setOutgoing] = useState<PeerPaymentRequestDto[]>([])
  const [friends, setFriends] = useState<FriendDto[]>([])
  const [friendWallets, setFriendWallets] = useState<Record<number, FriendWallet[]>>({})
  const [myWallets, setMyWallets] = useState<WalletDto[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null)
  const [recipientWalletId, setRecipientWalletId] = useState<number | null>(null)
  const [fromWalletId, setFromWalletId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [incomingErrors, setIncomingErrors] = useState<Record<number, string | null>>({})
  const [incomingLoading, setIncomingLoading] = useState<Record<number, boolean>>({})
  const [incomingFromWallet, setIncomingFromWallet] = useState<Record<number, number | null>>({})
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const load = async () => {
    try {
      setListLoading(true)
      const [inc, out, fr, mine] = await Promise.all([
        peerPaymentService.listIncoming(),
        peerPaymentService.listOutgoing(),
        friendService.list(),
        walletService.list()
      ])
      setIncoming(inc)
      setOutgoing(out)
      setFriends(fr)
      setMyWallets(mine)
      if (mine.length > 0 && fromWalletId == null) setFromWalletId(mine[0].id)
    } catch (e: any) {
      // ignore; page level fetch error could be added separately
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    (async () => {
      if (selectedFriendId == null) return
      if (friendWallets[selectedFriendId]) return
      try {
        const ws = await friendService.listFriendWallets(selectedFriendId)
        setFriendWallets(prev => ({ ...prev, [selectedFriendId]: ws }))
        if (ws.length > 0) setRecipientWalletId(ws[0].id)
      } catch (e: any) {
        setSendError(e?.message || 'Failed to load friend wallets')
      }
    })()
  }, [selectedFriendId])

  const friendOptions = useMemo(() => friends.map(f => ({ id: f.friendUserId, label: `${f.nickname} (${f.email})` })), [friends])
  const selectedFriendWallets = useMemo(() => selectedFriendId ? (friendWallets[selectedFriendId] || []) : [], [selectedFriendId, friendWallets])

  const onSend = async () => {
    if (!selectedFriendId || !recipientWalletId || !fromWalletId) return
    try {
      setSendLoading(true)
      setSendError(null)
      await peerPaymentService.send({ recipientUserId: selectedFriendId, targetWalletId: recipientWalletId, fromWalletId, amount: parseFloat(amount), note: note || undefined })
      setAmount('')
      setNote('')
      await load()
    } catch (e: any) {
      setSendError(e?.message || 'Failed to send payment')
    } finally {
      setSendLoading(false)
    }
  }

  const onAccept = async (id: number) => {
    const chosen = incomingFromWallet[id]
    if (!chosen) return
    try {
      setIncomingLoading(prev => ({ ...prev, [id]: true }))
      setIncomingErrors(prev => ({ ...prev, [id]: null }))
      await peerPaymentService.accept(id, { fromWalletId: chosen })
      await load()
    } catch (e: any) {
      setIncomingErrors(prev => ({ ...prev, [id]: e?.message || 'Failed to accept request' }))
    } finally {
      setIncomingLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const onReject = async (id: number) => {
    try {
      setIncomingLoading(prev => ({ ...prev, [id]: true }))
      setIncomingErrors(prev => ({ ...prev, [id]: null }))
      await peerPaymentService.reject(id)
      await load()
    } catch (e: any) {
      setIncomingErrors(prev => ({ ...prev, [id]: e?.message || 'Failed to reject request' }))
    } finally {
      setIncomingLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const onCancel = async (id: number) => {
    try {
      setIncomingLoading(prev => ({ ...prev, [id]: true }))
      setIncomingErrors(prev => ({ ...prev, [id]: null }))
      await peerPaymentService.cancel(id)
      await load()
    } catch (e: any) {
      setIncomingErrors(prev => ({ ...prev, [id]: e?.message || 'Failed to cancel request' }))
    } finally {
      setIncomingLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Peer Payments</h1>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Send Money</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Friend</div>
              <Select value={String(selectedFriendId ?? '')} onValueChange={(v) => setSelectedFriendId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select friend" />
                </SelectTrigger>
                <SelectContent>
                  {friendOptions.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Recipient wallet</div>
              <Select value={String(recipientWalletId ?? '')} onValueChange={(v) => setRecipientWalletId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFriendWallets.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">From my wallet</div>
              <Select value={String(fromWalletId ?? '')} onValueChange={(v) => setFromWalletId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {myWallets.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Amount</div>
              <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid gap-2 mt-3">
            <div className="text-sm text-muted-foreground">Note</div>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={onSend} disabled={sendLoading || !selectedFriendId || !recipientWalletId || !fromWalletId || !amount}>Send</Button>
          </div>
          {sendError && <div className="text-sm text-red-600 mt-3">{sendError}</div>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Request Money</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">From friend</div>
              <Select value={String(selectedFriendId ?? '')} onValueChange={(v) => setSelectedFriendId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select friend" />
                </SelectTrigger>
                <SelectContent>
                  {friendOptions.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">To my wallet</div>
              <Select value={String(fromWalletId ?? '')} onValueChange={(v) => setFromWalletId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {myWallets.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Amount</div>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid gap-2 mt-3">
            <div className="text-sm text-muted-foreground">Note</div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={async () => {
                if (!selectedFriendId || !fromWalletId) return
                try {
                  setRequestLoading(true)
                  setRequestError(null)
                  await peerPaymentService.createRequest({ payerUserId: selectedFriendId, targetWalletId: fromWalletId, amount: parseFloat(amount), note: note || undefined })
                  setAmount('')
                  setNote('')
                  await load()
                } catch (e: any) {
                  setRequestError(e?.message || 'Failed to create request')
                } finally {
                  setRequestLoading(false)
                }
              }}
              disabled={requestLoading || !selectedFriendId || !fromWalletId || !amount}
            >
              Request
            </Button>
          </div>
          {requestError && (
            <div className="text-sm text-red-600 mt-3">{requestError}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incoming Requests</CardTitle></CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : incoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incoming requests</div>
            ) : (
              <div className="divide-y">
                {incoming.map(r => (
                  <div key={r.id} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Request #{r.id}</div>
                      <div className="text-xs text-muted-foreground">Amount: {r.amount} {r.targetWalletCurrencyCode || ''} · Status: {r.status}</div>
                      {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                      {incomingErrors[r.id] && (
                        <div className="text-xs text-red-600 mt-1">{incomingErrors[r.id]}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground hidden md:block">Pay from</div>
                      <Select
                        value={String(incomingFromWallet[r.id] ?? '')}
                        onValueChange={(v) => setIncomingFromWallet(prev => ({ ...prev, [r.id]: parseInt(v) }))}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {myWallets.map(w => (
                            <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.currencyCode})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="default" onClick={() => onAccept(r.id)} disabled={!incomingFromWallet[r.id] || !!incomingLoading[r.id]}>Accept</Button>
                    <Button variant="destructive" onClick={() => onReject(r.id)} disabled={!!incomingLoading[r.id]}>Reject</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Outgoing Requests</CardTitle></CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : outgoing.length === 0 ? (
              <div className="text-sm text-muted-foreground">No outgoing requests</div>
            ) : (
              <div className="divide-y">
                {outgoing.map(r => (
                  <div key={r.id} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Request #{r.id}</div>
                      <div className="text-xs text-muted-foreground">Amount: {r.amount} {r.targetWalletCurrencyCode || ''} · Status: {r.status}</div>
                      {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                    </div>
                    <Button variant="outline" onClick={() => onCancel(r.id)}>Cancel</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </main>
    </div>
  )
}


