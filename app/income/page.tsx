import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionForm } from "@/components/transaction-form"
import { TransactionTable } from "@/components/transaction-table"

export default function IncomePage() {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Income Management</h1>
          <p className="text-muted-foreground">Track and manage your income sources</p>
        </div>

        <div className="grid gap-6">
          <TransactionForm type="income" />
          <TransactionTable type="income" />
        </div>
      </div>
    </DashboardLayout>
  )
}
