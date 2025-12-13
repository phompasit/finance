"use client";

import { useMemo } from "react";

export default function useStats(filteredTransactions) {
  return useMemo(() => {
    const totals = {};

    filteredTransactions.forEach((t) => {
      t.amounts.forEach((a) => {
        const amount = parseFloat(a.amount || 0);
        if (!totals[a.currency]) totals[a.currency] = { income: 0, expense: 0 };

        if (t.type === "income") totals[a.currency].income += amount;
        else if (t.type === "expense" && t.status_Ap !== "cancel")
          totals[a.currency].expense += amount;
      });
    });

    const summary = {};
    Object.keys(totals).forEach((currency) => {
      summary[currency] = {
        income: totals[currency].income,
        expense: totals[currency].expense,
        balance: totals[currency].income - totals[currency].expense,
      };
    });

    return summary;
  }, [filteredTransactions]);
}
