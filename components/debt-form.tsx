"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData, type Currency } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CURRENCIES: Currency[] = ["THB", "USD", "EUR", "GBP", "JPY"]

export function DebtForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth()
  const { addDebt } = useData()

  const [formData, setFormData] = useState({
    creditor: "",
    debtor: "",
    amount: "",
    currency: "THB" as Currency,
    interestRate: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    installments: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    addDebt({
      creditor: formData.creditor,
      debtor: formData.debtor,
      amount: Number.parseFloat(formData.amount),
      currency: formData.currency,
      interestRate: Number.parseFloat(formData.interestRate),
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      installments: Number.parseInt(formData.installments),
      paidInstallments: 0,
      status: "active",
      createdBy: user.email,
    })

    setFormData({
      creditor: "",
      debtor: "",
      amount: "",
      currency: "THB",
      interestRate: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      installments: "",
    })

    onSuccess?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Debt Record</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditor">Creditor</Label>
              <Input
                id="creditor"
                value={formData.creditor}
                onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                placeholder="Lender name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debtor">Debtor</Label>
              <Input
                id="debtor"
                value={formData.debtor}
                onChange={(e) => setFormData({ ...formData, debtor: e.target.value })}
                placeholder="Borrower name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Installments</Label>
              <Input
                id="installments"
                type="number"
                value={formData.installments}
                onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                placeholder="Number of payments"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Add Debt Record
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
