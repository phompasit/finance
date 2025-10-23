"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useData } from "@/lib/data-context"

export default function SettingsPage() {
  const { exchangeRates } = useData()

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Rates</CardTitle>
            <CardDescription>Current exchange rates (Base: THB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(exchangeRates).map(([currency, rate]) => (
                <div key={currency} className="space-y-2">
                  <Label htmlFor={currency}>{currency}</Label>
                  <Input id={currency} type="number" step="0.0001" value={rate} readOnly />
                </div>
              ))}
            </div>
            <Button className="mt-4">Update Exchange Rates</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Update company details for reports and documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="Your Company Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Address</Label>
              <Input id="companyAddress" placeholder="Company Address" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone</Label>
                <Input id="companyPhone" placeholder="+66 XX XXX XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input id="companyEmail" type="email" placeholder="contact@company.com" />
              </div>
            </div>
            <Button>Save Company Information</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
