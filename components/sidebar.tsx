"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "staff", "user"] },
  { name: "Income", href: "/income", icon: TrendingUp, roles: ["admin", "staff", "user"] },
  { name: "Expenses", href: "/expenses", icon: TrendingDown, roles: ["admin", "staff", "user"] },
  { name: "OPO", href: "/opo", icon: FileText, roles: ["admin", "staff"] },
  { name: "Debts", href: "/debts", icon: CreditCard, roles: ["admin", "staff", "user"] },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "staff"] },
  { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredNavigation = navigation.filter((item) => user && item.roles.includes(user.role))

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">FinanceApp</h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
