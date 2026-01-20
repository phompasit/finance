import Company from "../models/company.js";

/**
 * 🔎 internal helper
 */
function buildAccountLookup(company) {
  const cashMap = new Map(
    (company.cashAccounts || []).map(a => [a._id.toString(), a])
  );
  const bankMap = new Map(
    (company.bankAccounts || []).map(a => [a._id.toString(), a])
  );

  const findAccount = (accountId) => {
    if (!accountId) {
      throw new Error("AccountId ไม่ถูกต้อง: undefined");
    }

    const id = accountId.toString();
    if (cashMap.has(id)) return cashMap.get(id);
    if (bankMap.has(id)) return bankMap.get(id);

    throw new Error(`AccountId ไม่ถูกต้อง: ${id}`);
  };

  return { findAccount };
}

/**
 * 🔑 normalize amount item
 */
function normalizeItem(item) {
  const accountId =
    item.accountId ||
    item.account?._id ||
    item.account ||
    null;

  if (!accountId) {
    throw new Error(
      `amount item ไม่มี accountId (${JSON.stringify(item)})`
    );
  }

  return {
    accountId,
    amount: Number(item.amount),
  };
}

/**
 * 💰 APPLY
 */
export async function applyBalance({ companyId, type, amounts }) {
  if (!amounts?.length) return;

  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  const direction = type === "income" ? 1 : -1;
  const { findAccount } = buildAccountLookup(company);

  for (const rawItem of amounts) {
    const item = normalizeItem(rawItem);
    if (isNaN(item.amount)) throw new Error("Amount ไม่ถูกต้อง");

    const account = findAccount(item.accountId);
    account.balance += direction * item.amount;
  }

  await company.save();
}

/**
 * 🔁 ROLLBACK
 */
export async function rollbackBalance({ companyId, type, amounts }) {
  if (!amounts?.length) return;

  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  const direction = type === "income" ? 1 : -1;
  const { findAccount } = buildAccountLookup(company);

  for (const rawItem of amounts) {
    const item = normalizeItem(rawItem);
    if (isNaN(item.amount)) throw new Error("Amount ไม่ถูกต้อง");

    const account = findAccount(item.accountId);
    account.balance -= direction * item.amount;
  }

  await company.save();
}
