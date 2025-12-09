const Company = require("../models/company");

const updateBalance = async (companyId, accountType, accountId, diff) => {
  const company = await Company.findById(companyId);

  let account;
  if (accountType === "bank") {
    account = company.bankAccounts.id(accountId);
  } else {
    account = company.cashAccounts.id(accountId);
  }

  account.balance += diff; // diff อาจเป็น + หรือ -
  await company.save();
};
