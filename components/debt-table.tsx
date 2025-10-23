"use client"

import { useState } from "react"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trash2, Search, Plus, Minus } from "lucide-react"

export function DebtTable() {
  const { debts, deleteDebt, updateDebt } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredDebts = debts
    .filter((d) => {
      const matchesSearch =
        d.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.debtor.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || d.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const handlePayInstallment = (id: string, currentPaid: number, total: number) => {
    if (currentPaid < total) {
      const newPaid = currentPaid + 1
      updateDebt(id, {
        paidInstallments: newPaid,
        status: newPaid === total ? "paid" : "active",
      })
    }
  }

  const handleUnpayInstallment = (id: string, currentPaid: number) => {
    if (currentPaid > 0) {
      updateDebt(id, {
        paidInstallments: currentPaid - 1,
        status: "active",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="secondary">Active</Badge>
    }
  }

  const calculateProgress = (paid: number, total: number) => {
    return (paid / total) * 100
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debt Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search debts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creditor</TableHead>
                <TableHead>Debtor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No debts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.creditor}</TableCell>
                    <TableCell>{debt.debtor}</TableCell>
                    <TableCell className="font-medium">
                      {debt.amount.toLocaleString()} {debt.currency}
                    </TableCell>
                    <TableCell>{debt.interestRate}%</TableCell>
                    <TableCell>{new Date(debt.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {debt.paidInstallments}/{debt.installments}
                          </span>
                          <span>{Math.round(calculateProgress(debt.paidInstallments, debt.installments))}%</span>
                        </div>
                        <Progress value={calculateProgress(debt.paidInstallments, debt.installments)} />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(debt.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePayInstallment(debt.id, debt.paidInstallments, debt.installments)}
                          disabled={debt.paidInstallments >= debt.installments}
                          title="Pay installment"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnpayInstallment(debt.id, debt.paidInstallments)}
                          disabled={debt.paidInstallments === 0}
                          title="Undo payment"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDebt(debt.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDebts.length} of {debts.length} debts
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
