import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, LogOut, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { TransactionPage } from "./TransactionPage"
import { TransactionResponse, TransactionType, transactionService } from "../services/transactionService"

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions'>('dashboard')
  const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadDashboardData()
    }
  }, [currentView])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const transactions = await transactionService.getTransactions()
      setRecentTransactions(transactions.slice(0, 5)) // Get 5 most recent
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyTransactions = recentTransactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })

    const income = monthlyTransactions
      .filter(t => t.type === TransactionType.Income)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = monthlyTransactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0)
    
    return { income, expenses, balance: income - expenses }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (currentView === 'transactions') {
    return <TransactionPage onBack={() => setCurrentView('dashboard')} />
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Finance Tracker</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('transactions')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Manage Transactions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.balance)}</div>
              <p className="text-xs text-muted-foreground">Current balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.income)}</div>
              <p className="text-xs text-muted-foreground">This month's income</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.expenses)}</div>
              <p className="text-xs text-muted-foreground">This month's expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Total transactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Spending Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Income vs Expenses Chart</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading transactions...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setCurrentView('transactions')}
                  >
                    Add your first transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center">
                      <CreditCard className="h-9 w-9 text-muted-foreground" />
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {transaction.note || transaction.categoryName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.categoryName} • {formatDate(transaction.date)}
                        </p>
                      </div>
                      <div className={`ml-auto font-medium ${
                        transaction.type === TransactionType.Income ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === TransactionType.Income ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
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