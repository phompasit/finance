"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type TransactionType = "income" | "expense"
export type Currency = "THB" | "USD" | "EUR" | "GBP" | "JPY"

export interface Transaction {
  id: string
  type: TransactionType
  date: string
  category: string
  description: string
  amount: number
  currency: Currency
  paymentMethod: string
  reference?: string
  createdBy: string
  createdAt: string
}

export interface OPO {
  id: string
  date: string
  recipient: string
  purpose: string
  amount: number
  currency: Currency
  approvedBy: string
  status: "pending" | "approved" | "rejected"
  createdBy: string
  createdAt: string
}

export interface Debt {
  id: string
  creditor: string
  debtor: string
  amount: number
  currency: Currency
  interestRate: number
  startDate: string
  dueDate: string
  installments: number
  paidInstallments: number
  status: "active" | "paid" | "overdue"
  createdBy: string
  createdAt: string
}

interface DataContextType {
  transactions: Transaction[]
  opos: OPO[]
  debts: Debt[]
  addTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => void
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  addOPO: (opo: Omit<OPO, "id" | "createdAt">) => void
  updateOPO: (id: string, opo: Partial<OPO>) => void
  deleteOPO: (id: string) => void
  addDebt: (debt: Omit<Debt, "id" | "createdAt">) => void
  updateDebt: (id: string, debt: Partial<Debt>) => void
  deleteDebt: (id: string) => void
  exchangeRates: Record<Currency, number>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

// Mock exchange rates (THB as base)
const EXCHANGE_RATES: Record<Currency, number> = {
  THB: 1,
  USD: 0.028,
  EUR: 0.026,
  GBP: 0.022,
  JPY: 4.2,
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [opos, setOPOs] = useState<OPO[]>([])
  const [debts, setDebts] = useState<Debt[]>([])

  useEffect(() => {
    const storedTransactions = localStorage.getItem("transactions")
    const storedOPOs = localStorage.getItem("opos")
    const storedDebts = localStorage.getItem("debts")

    if (storedTransactions) setTransactions(JSON.parse(storedTransactions))
    if (storedOPOs) setOPOs(JSON.parse(storedOPOs))
    if (storedDebts) setDebts(JSON.parse(storedDebts))
  }, [])

  const addTransaction = (transaction: Omit<Transaction, "id" | "createdAt">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...transactions, newTransaction]
    setTransactions(updated)
    localStorage.setItem("transactions", JSON.stringify(updated))
  }

  const updateTransaction = (id: string, transaction: Partial<Transaction>) => {
    const updated = transactions.map((t) => (t.id === id ? { ...t, ...transaction } : t))
    setTransactions(updated)
    localStorage.setItem("transactions", JSON.stringify(updated))
  }

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id)
    setTransactions(updated)
    localStorage.setItem("transactions", JSON.stringify(updated))
  }

  const addOPO = (opo: Omit<OPO, "id" | "createdAt">) => {
    const newOPO: OPO = {
      ...opo,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...opos, newOPO]
    setOPOs(updated)
    localStorage.setItem("opos", JSON.stringify(updated))
  }

  const updateOPO = (id: string, opo: Partial<OPO>) => {
    const updated = opos.map((o) => (o.id === id ? { ...o, ...opo } : o))
    setOPOs(updated)
    localStorage.setItem("opos", JSON.stringify(updated))
  }

  const deleteOPO = (id: string) => {
    const updated = opos.filter((o) => o.id !== id)
    setOPOs(updated)
    localStorage.setItem("opos", JSON.stringify(updated))
  }

  const addDebt = (debt: Omit<Debt, "id" | "createdAt">) => {
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...debts, newDebt]
    setDebts(updated)
    localStorage.setItem("debts", JSON.stringify(updated))
  }

  const updateDebt = (id: string, debt: Partial<Debt>) => {
    const updated = debts.map((d) => (d.id === id ? { ...d, ...debt } : d))
    setDebts(updated)
    localStorage.setItem("debts", JSON.stringify(updated))
  }

  const deleteDebt = (id: string) => {
    const updated = debts.filter((d) => d.id !== id)
    setDebts(updated)
    localStorage.setItem("debts", JSON.stringify(updated))
  }

  return (
    <DataContext.Provider
      value={{
        transactions,
        opos,
        debts,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addOPO,
        updateOPO,
        deleteOPO,
        addDebt,
        updateDebt,
        deleteDebt,
        exchangeRates: EXCHANGE_RATES,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
