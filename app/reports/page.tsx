"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDown, FileSpreadsheet, FileText } from "lucide-react"

export default function ReportsPage() {
  const { transactions, opos, debts, exchangeRates } = useData()

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "all",
    category: "all",
    currency: "all",
  })

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesDate =
      (!filters.startDate || new Date(t.date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(t.date) <= new Date(filters.endDate))
    const matchesType = filters.type === "all" || t.type === filters.type
    const matchesCategory = filters.category === "all" || t.category === filters.category
    const matchesCurrency = filters.currency === "all" || t.currency === filters.currency
    return matchesDate && matchesType && matchesCategory && matchesCurrency
  })

  // Calculate summary
  const summary = {
    totalIncome: filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount * exchangeRates[t.currency], 0),
    totalExpenses: filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount * exchangeRates[t.currency], 0),
    transactionCount: filteredTransactions.length,
  }

  summary.netBalance = summary.totalIncome - summary.totalExpenses

  // Get unique values for filters
  const categories = Array.from(new Set(transactions.map((t) => t.category)))
  const currencies = Array.from(new Set(transactions.map((t) => t.currency)))

  // Export functions
  const exportToCSV = () => {
    const headers = ["Date", "Type", "Category", "Description", "Amount", "Currency", "Payment Method", "Reference"]
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type,
      t.category,
      t.description,
      t.amount,
      t.currency,
      t.paymentMethod,
      t.reference || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financial-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const exportToPDF = () => {
    alert(
      `Exporting ${filteredTransactions.length} transactions to PDF\n\nTotal Income: ฿${summary.totalIncome.toLocaleString()}\nTotal Expenses: ฿${summary.totalExpenses.toLocaleString()}\nNet Balance: ฿${summary.netBalance.toLocaleString()}`,
    )
  }

  const exportToExcel = () => {
    alert(`Exporting ${filteredTransactions.length} transactions to Excel format`)
  }

  return (
    <DashboardLayout allowedRoles={["admin", "staff"]}>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate detailed financial reports with custom filters</p>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="transactions">Transaction Reports</TabsTrigger>
            <TabsTrigger value="opo">OPO Reports</TabsTrigger>
            <TabsTrigger value="debt">Debt Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Report Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => setFilters({ ...filters, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={filters.currency}
                      onValueChange={(value) => setFilters({ ...filters, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Currencies</SelectItem>
                        {currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({ startDate: "", endDate: "", type: "all", category: "all", currency: "all" })
                    }
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">฿{summary.totalIncome.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">฿{summary.totalExpenses.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ฿{summary.netBalance.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.transactionCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Export Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button onClick={exportToPDF} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export to PDF
                  </Button>
                  <Button onClick={exportToCSV} variant="outline" className="gap-2 bg-transparent">
                    <FileDown className="h-4 w-4" />
                    Export to CSV
                  </Button>
                  <Button onClick={exportToExcel} variant="outline" className="gap-2 bg-transparent">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export to Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No transactions found with current filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell className="capitalize">{transaction.type}</TableCell>
                            <TableCell>{transaction.category}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell
                              className={`font-medium ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {transaction.amount.toLocaleString()} {transaction.currency}
                            </TableCell>
                            <TableCell>{transaction.paymentMethod}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>OPO Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total OPOs</p>
                    <p className="text-2xl font-bold">{opos.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {opos.filter((o) => o.status === "pending").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-green-600">
                      {opos.filter((o) => o.status === "approved").length}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button onClick={() => alert("Exporting OPO report")} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export OPO Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Debt Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debts</p>
                    <p className="text-2xl font-bold">{debts.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {debts.filter((d) => d.status === "active").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {debts.filter((d) => d.status === "paid").length}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button onClick={() => alert("Exporting debt report")} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export Debt Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
