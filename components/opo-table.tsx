"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Search, FileDown, CheckCircle, XCircle } from "lucide-react"

export function OPOTable() {
  const { user } = useAuth()
  const { opos, deleteOPO, updateOPO } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredOPOs = opos
    .filter((o) => {
      const matchesSearch =
        o.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleApprove = (id: string) => {
    updateOPO(id, { status: "approved" })
  }

  const handleReject = (id: string) => {
    updateOPO(id, { status: "rejected" })
  }

  const handleExportPDF = (opo: (typeof opos)[0]) => {
    alert(`Exporting OPO #${opo.id} to PDF\nRecipient: ${opo.recipient}\nAmount: ${opo.amount} ${opo.currency}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const canApprove = user?.role === "admin" || user?.role === "staff"

  return (
    <Card>
      <CardHeader>
        <CardTitle>OPO Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search OPOs..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No OPOs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOPOs.map((opo) => (
                  <TableRow key={opo.id}>
                    <TableCell>{new Date(opo.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{opo.recipient}</TableCell>
                    <TableCell className="max-w-xs truncate">{opo.purpose}</TableCell>
                    <TableCell className="font-medium">
                      {opo.amount.toLocaleString()} {opo.currency}
                    </TableCell>
                    <TableCell>{opo.approvedBy}</TableCell>
                    <TableCell>{getStatusBadge(opo.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canApprove && opo.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(opo.id)} title="Approve">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleReject(opo.id)} title="Reject">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {opo.status === "approved" && (
                          <Button variant="ghost" size="icon" onClick={() => handleExportPDF(opo)} title="Export PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteOPO(opo.id)} title="Delete">
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
            Showing {filteredOPOs.length} of {opos.length} OPOs
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
