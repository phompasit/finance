import { combineReducers } from "@reduxjs/toolkit";
import incomeExpenseReducer from "./reducer/incomeExpense";
import partnerReducer from "./reducer/partner";
import advanceReducer from "./reducer/advance";
import chartAccountReducer from "./accountingReducer/chartAccounting";
import sliceReducer from "./accountingReducer/openingBalanceSlice";
import journalReducer from "./accountingReducer/journalSlice";
import plReducer from "./accountingReducer/plSlice";
import balanceReducer from "./accountingReducer/balanceSlice";
import generalLegerReducer from "./accountingReducer/generalLedgerSlice";
import reportsReducer from "./accountingReducer/reportsSlice";
import assetsReducer from "./accountingReducer/assetsSlice";
import incomeReducer from "./accountingReducer/incomeSlice";
import fixedAssetReducer from "./accountingReducer/fixedAssetSlice.js";
const rootReducer = combineReducers({
  incomeExpense: incomeExpenseReducer,
  partner: partnerReducer,
  advance: advanceReducer,
  chartAccount: chartAccountReducer,
  openingBalance: sliceReducer,
  journal: journalReducer,
  pl: plReducer,
  balance: balanceReducer,
  ledger: generalLegerReducer,
  reports: reportsReducer,
  assets: assetsReducer,
  income: incomeReducer,
  fixedAsset: fixedAssetReducer,
});
export default rootReducer;
