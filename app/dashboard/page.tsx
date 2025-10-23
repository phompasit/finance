"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { StatCard } from "@/components/stat-card"
import { useData } from "@/lib/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, CreditCard, DollarSign, AlertCircle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function DashboardPage() {
  const { transactions, opos, debts, exchangeRates } = useData()

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount * exchangeRates[t.currency], 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount * exchangeRates[t.currency], 0)

  const netBalance = totalIncome - totalExpenses

  const pendingOPOs = opos.filter((o) => o.status === "pending").length
  const activeDebts = debts.filter((d) => d.status === "active").length
  const totalDebtAmount = debts
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + d.amount * exchangeRates[d.currency], 0)

  // Monthly data for charts
  const getMonthlyData = () => {
    const monthlyData: Record<string, { income: number; expenses: number }> = {}

    transactions.forEach((t) => {
      const month = new Date(t.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 }
      }

      const amountInTHB = t.amount * exchangeRates[t.currency]
      if (t.type === "income") {
        monthlyData[month].income += amountInTHB
      } else {
        monthlyData[month].expenses += amountInTHB
      }
    })

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income),
        expenses: Math.round(data.expenses),
        net: Math.round(data.income - data.expenses),
      }))
      .slice(-6)
  }

  // Category breakdown
  const getCategoryData = () => {
    const categoryData: Record<string, number> = {}

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const amountInTHB = t.amount * exchangeRates[t.currency]
        categoryData[t.category] = (categoryData[t.category] || 0) + amountInTHB
      })

    return Object.entries(categoryData)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }

  const monthlyData = getMonthlyData()
  const categoryData = getCategoryData()

  // Recent transactions
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your financial status</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Income"
            value={`฿${totalIncome.toLocaleString()}`}
            description="All time income"
            icon={TrendingUp}
          />
          <StatCard
            title="Total Expenses"
            value={`฿${totalExpenses.toLocaleString()}`}
            description="All time expenses"
            icon={TrendingDown}
          />
          <StatCard
            title="Net Balance"
            value={`฿${netBalance.toLocaleString()}`}
            description={netBalance >= 0 ? "Positive balance" : "Negative balance"}
            icon={DollarSign}
          />
          <StatCard
            title="Active Debts"
            value={activeDebts.toString()}
            description={`Total: ฿${totalDebtAmount.toLocaleString()}`}
            icon={CreditCard}
          />
        </div>

        {/* Alerts */}
        {(pendingOPOs > 0 || activeDebts > 0) && (
          <Card className="border-yellow-600/50 bg-yellow-600/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingOPOs > 0 && (
                <p className="text-sm">
                  You have <span className="font-semibold">{pendingOPOs}</span> pending OPO(s) awaiting approval
                </p>
              )}
              {activeDebts > 0 && (
                <p className="text-sm">
                  You have <span className="font-semibold">{activeDebts}</span> active debt(s) to manage
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ChartContainer
                  config={{
                    income: {
                      label: "Income",
                      color: "hsl(var(--chart-1))",
                    },
                    expenses: {
                      label: "Expenses",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="income" fill="var(--color-income)" name="Income" />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" name="Amount (THB)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      {transaction.type === "income" ? (
                        <div className="p-2 rounded-lg bg-green-600/20">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-red-600/20">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
