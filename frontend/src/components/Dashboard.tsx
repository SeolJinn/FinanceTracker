import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Finance Tracker</h1>
          </div>
          <ThemeToggle />
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
              <div className="text-2xl font-bold">$12,458.67</div>
              <p className="text-xs text-muted-foreground">+5.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$4,250.00</div>
              <p className="text-xs text-muted-foreground">+2.1% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$3,124.88</div>
              <p className="text-xs text-muted-foreground">-8.3% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,125.12</div>
              <p className="text-xs text-muted-foreground">26.5% of monthly budget</p>
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
              <div className="space-y-8">
                <div className="flex items-center">
                  <CreditCard className="h-9 w-9 text-muted-foreground" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Grocery Store</p>
                    <p className="text-sm text-muted-foreground">Food & Dining</p>
                  </div>
                  <div className="ml-auto font-medium text-red-600">-$85.32</div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-9 w-9 text-muted-foreground" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Salary Deposit</p>
                    <p className="text-sm text-muted-foreground">Income</p>
                  </div>
                  <div className="ml-auto font-medium text-green-600">+$2,125.00</div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-9 w-9 text-muted-foreground" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Gas Station</p>
                    <p className="text-sm text-muted-foreground">Transportation</p>
                  </div>
                  <div className="ml-auto font-medium text-red-600">-$42.50</div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-9 w-9 text-muted-foreground" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Netflix</p>
                    <p className="text-sm text-muted-foreground">Entertainment</p>
                  </div>
                  <div className="ml-auto font-medium text-red-600">-$15.99</div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-9 w-9 text-muted-foreground" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Coffee Shop</p>
                    <p className="text-sm text-muted-foreground">Food & Dining</p>
                  </div>
                  <div className="ml-auto font-medium text-red-600">-$4.75</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}