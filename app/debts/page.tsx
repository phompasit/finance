import { DashboardLayout } from "@/components/dashboard-layout"
import { DebtForm } from "@/components/debt-form"
import { DebtTable } from "@/components/debt-table"

export default function DebtsPage() {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Debt Management</h1>
          <p className="text-muted-foreground">Track and manage debts with installment payments</p>
        </div>

        <div className="grid gap-6">
          <DebtForm />
          <DebtTable />
        </div>
      </div>
    </DashboardLayout>
  )
}
