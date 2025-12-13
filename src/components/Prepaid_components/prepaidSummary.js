export const calcSummary = (advances = []) => {
  if (!Array.isArray(advances)) return [];

  const summaryByCurrency = {};

  advances.forEach((adv) => {
    // รวมยอดเบิก
    adv.amount_requested?.forEach((req) => {
      const { currency, amount } = req;
      if (!summaryByCurrency[currency]) {
        summaryByCurrency[currency] = {
          totalRequested: 0,
          totalSpent: 0,
          totalReturnCompany: 0,
          totalRefundEmployee: 0,
        };
      }
      summaryByCurrency[currency].totalRequested += amount || 0;
    });

    // รวมยอด summary (ใช้, คืนบริษัท, คืนพนักงาน)
    if (adv.summary) {
      Object.entries(adv.summary).forEach(([currency, sum]) => {
        if (!summaryByCurrency[currency]) {
          summaryByCurrency[currency] = {
            totalRequested: 0,
            totalSpent: 0,
            totalReturnCompany: 0,
            totalRefundEmployee: 0,
          };
        }

        summaryByCurrency[currency].totalSpent += sum.total_spent || 0;
        summaryByCurrency[currency].totalReturnCompany +=
          sum.total_return_to_company || 0;
        summaryByCurrency[currency].totalRefundEmployee +=
          sum.total_refund_to_employee || 0;
      });
    }
  });

  // สร้าง array สำหรับแสดงผล
  return Object.entries(summaryByCurrency).map(([currency, totals]) => {
    const totalNet =
      totals.totalSpent -
      totals.totalReturnCompany -
      totals.totalRefundEmployee;

    return {
      currency,
      ...totals,
      totalNet,
    };
  });
};
