import { DashboardLayout } from "@/components/dashboard-layout"
import { OPOForm } from "@/components/opo-form"
import { OPOTable } from "@/components/opo-table"

export default function OPOPage() {
  return (
    <DashboardLayout allowedRoles={["admin", "staff"]}>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">OPO Management</h1>
          <p className="text-muted-foreground">Create and manage Official Payment Orders</p>
        </div>

        <div className="grid gap-6">
          <OPOForm />
          <OPOTable />
        </div>
      </div>
    </DashboardLayout>
  )
}
