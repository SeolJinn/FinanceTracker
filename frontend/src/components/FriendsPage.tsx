import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { friendService, FriendDto, FriendRequestDto } from '@/services/friendService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendDto[]>([])
  const [incoming, setIncoming] = useState<FriendRequestDto[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequestDto[]>([])
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingFriendId, setEditingFriendId] = useState<number | null>(null)
  const [editingNickname, setEditingNickname] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [list, inc, out] = await Promise.all([
        friendService.list(),
        friendService.listIncomingRequests(),
        friendService.listOutgoingRequests()
      ])
      setFriends(list)
      setIncoming(inc)
      setOutgoing(out)
    } catch (e: any) {
      setError(e?.message || 'Failed to load friends')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onAdd = async () => {
    try {
      setLoading(true)
      setError(null)
      // Send a friend request instead of immediate add
      await friendService.createRequest({ email, nickname: nickname || undefined })
      setEmail('')
      setNickname('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to add friend')
    } finally {
      setLoading(false)
    }
  }

  const onRemove = async (friendUserId: number) => {
    try {
      setLoading(true)
      setError(null)
      await friendService.remove(friendUserId)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to remove friend')
    } finally {
      setLoading(false)
    }
  }

  const onEditNickname = (friendUserId: number, currentNickname: string) => {
    setEditingFriendId(friendUserId)
    setEditingNickname(currentNickname)
  }

  const onSaveNickname = async () => {
    if (!editingFriendId) return
    try {
      setLoading(true)
      setError(null)
      await friendService.updateNickname(editingFriendId, { nickname: editingNickname })
      setEditingFriendId(null)
      setEditingNickname('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to update nickname')
    } finally {
      setLoading(false)
    }
  }

  const onCancelEdit = () => {
    setEditingFriendId(null)
    setEditingNickname('')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Friends</h1>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Friends</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="friend@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Input placeholder="Nickname (optional)" value={nickname} onChange={e => setNickname(e.target.value)} />
            <Button onClick={onAdd} disabled={loading || !email}>Add</Button>
          </div>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="text-sm text-muted-foreground">No friends yet</div>
          ) : (
            <div className="divide-y">
              {friends.map(f => (
                <div key={f.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{f.nickname}</div>
                    <div className="text-xs text-muted-foreground truncate">{f.displayName} · {f.email}</div>
                  </div>
                  {editingFriendId === f.friendUserId ? (
                    <div className="flex items-center gap-2">
                      <Input className="w-[200px]" value={editingNickname} onChange={e => setEditingNickname(e.target.value)} />
                      <Button onClick={onSaveNickname} disabled={loading || !editingNickname.trim()}>Save</Button>
                      <Button variant="outline" onClick={onCancelEdit} disabled={loading}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => onEditNickname(f.friendUserId, f.nickname)}>Nickname</Button>
                  )}
                  <Button variant="destructive" onClick={() => onRemove(f.friendUserId)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mt-6 pb-8">
          <Card>
            <CardHeader>
              <CardTitle>Incoming Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {incoming.length === 0 ? (
                <div className="text-sm text-muted-foreground">No incoming requests</div>
              ) : (
                <div className="divide-y">
                  {incoming.map(r => (
                    <div key={r.id} className="py-3 flex items-center gap-2">
                      <div className="min-w-0 flex-1 text-sm">
                        Request from {r.requesterName} ({r.requesterEmail})
                      </div>
                      <Button variant="default" onClick={async () => { setLoading(true); setError(null); try { await friendService.acceptRequest(r.id); await load(); } catch (e: any) { setError(e?.message || 'Failed to accept'); } finally { setLoading(false); } }}>Accept</Button>
                      <Button variant="destructive" onClick={async () => { setLoading(true); setError(null); try { await friendService.rejectRequest(r.id); await load(); } catch (e: any) { setError(e?.message || 'Failed to reject'); } finally { setLoading(false); } }}>Reject</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {outgoing.length === 0 ? (
                <div className="text-sm text-muted-foreground">No outgoing requests</div>
              ) : (
                <div className="divide-y">
                  {outgoing.map(r => (
                    <div key={r.id} className="py-3 flex items-center gap-2">
                      <div className="min-w-0 flex-1 text-sm">
                        Pending: {r.receiverName} ({r.receiverEmail})
                      </div>
                      <Button variant="outline" onClick={async () => { setLoading(true); setError(null); try { await friendService.cancelRequest(r.id); await load(); } catch (e: any) { setError(e?.message || 'Failed to cancel'); } finally { setLoading(false); } }}>Cancel</Button>
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


