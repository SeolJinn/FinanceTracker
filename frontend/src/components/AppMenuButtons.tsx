import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AppMenuButtons() {
  const navigate = useNavigate()
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/wallets')}
      >
        Wallets
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/goals')}
      >
        Savings
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/friends')}
      >
        Friends
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/peer-payments')}
      >
        Peer Pay
      </Button>
    </>
  )
}


