"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData, type Currency } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CURRENCIES: Currency[] = ["THB", "USD", "EUR", "GBP", "JPY"]

export function OPOForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth()
  const { addOPO } = useData()

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    recipient: "",
    purpose: "",
    amount: "",
    currency: "THB" as Currency,
    approvedBy: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    addOPO({
      date: formData.date,
      recipient: formData.recipient,
      purpose: formData.purpose,
      amount: Number.parseFloat(formData.amount),
      currency: formData.currency,
      approvedBy: formData.approvedBy,
      status: "pending",
      createdBy: user.email,
    })

    setFormData({
      date: new Date().toISOString().split("T")[0],
      recipient: "",
      purpose: "",
      amount: "",
      currency: "THB",
      approvedBy: "",
    })

    onSuccess?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create OPO (Official Payment Order)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder="Recipient name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Detailed purpose of payment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="approvedBy">Approved By</Label>
            <Input
              id="approvedBy"
              value={formData.approvedBy}
              onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
              placeholder="Approver name"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Create OPO
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
