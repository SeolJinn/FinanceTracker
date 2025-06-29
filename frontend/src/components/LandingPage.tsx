import { Wallet, TrendingUp, Shield, PieChart } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Finance Tracker</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Take Control of Your Finances</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track your income, manage expenses, and achieve your financial goals with our intuitive finance tracker.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/register">
              <Button size="lg">Start Tracking Free</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg">View Demo</Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Track Your Income</CardTitle>
              <CardDescription>
                Monitor all your income sources and see how your money flows in
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <PieChart className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Manage Expenses</CardTitle>
              <CardDescription>
                Categorize and track your spending to understand where your money goes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your financial data is encrypted and secure with bank-level security
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-muted/50 rounded-lg p-8">
          <div className="grid gap-8 md:grid-cols-3 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$2.5M+</div>
              <div className="text-muted-foreground">Money Tracked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}