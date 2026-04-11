import { lazy } from "react";  // ✅ เอา Suspense ออก
import { Routes, Route, Navigate } from "react-router-dom";  // ✅ เอา useLocation ออก

// ลบบรรทัดนี้ออก
// import { PageLoader } from "./components/PageLoader";
// import { PageTransition } from "./components/PageTransition";

import Login from "./pages/Login.page";
import NotFound from "./components/NotFound";
import Verify2FA from "./pages/Verify2FA";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./context/RoleRoute";
import Layout from "./components/Layout";
import "./index.css";

const preload = (importFn) => {
  const Component = lazy(importFn);
  Component.preload = importFn;
  return Component;
};

const Dashboard                    = preload(() => import("./pages/Dashboard"));
const IncomeExpense                 = preload(() => import("./pages/IncomeExpense"));
const OPO                          = preload(() => import("./pages/OPO"));
const Debt                         = preload(() => import("./pages/Debt"));
const Partner                      = preload(() => import("./pages/Partner"));
const Users                        = preload(() => import("./pages/Users"));
const PrepaidExpenseDashboard      = preload(() => import("./pages/PrepaidExpenseDashboard"));
const FormIncomeExpense            = preload(() => import("./pages/FormIncomeExpense"));
const TwoFactorAuth                = preload(() => import("./pages/TwoFactorAuth"));
const RenderFields                 = preload(() => import("./components/Income_Expense/FormFieldsAdd"));
const RenderFieldPrepaid           = preload(() => import("./components/Prepaid_components/RenderFieldPrepaid"));
const EditForm                     = preload(() => import("./components/Prepaid_components/EditForm"));
const RenderOpoForm                = preload(() => import("./components/Opo_components/RenderOpoForm"));
const RenderForm_Debt              = preload(() => import("./components/Debt/RenderForm_Debt"));
const ChartOfAccounts              = preload(() => import("./accounting/ChartOfAccounts"));
const OpeningBalancePage           = preload(() => import("./accounting/OpeningBalancePage"));
const JournalEntryPage             = preload(() => import("./accounting/Journal/JournalEntryPage"));
const JournalDetailPage            = preload(() => import("./accounting/Journal/JournalDetailPage"));
const PrintJournalPage             = preload(() => import("./accounting/Journal/PrintJournalPage"));
const JournalModal                 = preload(() => import("./accounting/Journal/JournalModal"));
const IncomeStatementPage          = preload(() => import("./accounting/IncomeStatementPage"));
const BalanceSheetPage             = preload(() => import("./accounting/BalanceSheetPage"));
const Balanc_sheet_before          = preload(() => import("./accounting/Balanc_sheet_before"));
const BalanceSheetIncomeAndExpense = preload(() => import("./accounting/BalanceSheetIncomeAndExpense"));
const GeneralLedgerPage            = preload(() => import("./accounting/GeneralLedgerPage"));
const StatementOfFinancialPosition = preload(() => import("./accounting/StatementOfFinancialPosition"));
const AssetsPage                   = preload(() => import("./accounting/AssetsPage"));
const FixedAssetApp                = preload(() => import("./accounting/FixedAssetApp"));
const ClosePeriodPage              = preload(() => import("./accounting/ClosePeriodPage"));
const AddAssetModal                = preload(() => import("./components/FixedAsset/AddAssetModal"));
const DepreciationPreviewModal     = preload(() => import("./components/FixedAsset/DepreciationPreviewModal"));
const RegisterForSuperAdmin        = preload(() => import("./pages/RegisterForSuperAdmin"));

function App() {
  return (
    <AuthProvider>
      {/* ✅ ไม่มี Suspense ที่นี่แล้ว — ย้ายไปอยู่ใน Layout.jsx */}
      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<RegisterForSuperAdmin />} />
        <Route path="/2faVerify" element={<Verify2FA />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"            element={<Dashboard />} />
          <Route path="income-expense"       element={<IncomeExpense />} />
          <Route path="form_income_expense"  element={<FormIncomeExpense />} />
          <Route path="fields"               element={<RenderFields />} />
          <Route path="opo"                  element={<OPO />} />
          <Route path="opo_form"             element={<RenderOpoForm />} />
          <Route path="debt"                 element={<Debt />} />
          <Route path="debt_form"            element={<RenderForm_Debt />} />
          <Route path="prepaid"              element={<PrepaidExpenseDashboard />} />
          <Route path="form_prepaid_add"     element={<RenderFieldPrepaid />} />
          <Route path="prepaid_form_edit"    element={<EditForm />} />
          <Route path="partner"              element={<Partner />} />
          <Route path="users"
            element={
              <RoleRoute allow={["admin", "master", "staff"]}>
                <Users />
              </RoleRoute>
            }
          />
          <Route path="chart-account"                element={<ChartOfAccounts />} />
          <Route path="opening-balance"              element={<OpeningBalancePage />} />
          <Route path="journal"                      element={<JournalEntryPage />} />
          <Route path="journal/:id"                  element={<JournalDetailPage />} />
          <Route path="journal/print"                element={<PrintJournalPage />} />
          <Route path="journal_add&edit"             element={<JournalModal />} />
          <Route path="income-statement"             element={<IncomeStatementPage />} />
          <Route path="balance-sheet"                element={<BalanceSheetPage />} />
          <Route path="balance-sheet-before"         element={<Balanc_sheet_before />} />
          <Route path="income-expense-balance-sheet" element={<BalanceSheetIncomeAndExpense />} />
          <Route path="ledger"                       element={<GeneralLedgerPage />} />
          <Route path="statement"                    element={<StatementOfFinancialPosition />} />
          <Route path="assets"                       element={<AssetsPage />} />
          <Route path="fixed-assets"                 element={<FixedAssetApp />} />
          <Route path="fixed-add/:id"                element={<AddAssetModal />} />
          <Route path="fixed-add-Depreciation"       element={<DepreciationPreviewModal />} />
          <Route path="closing_account"              element={<ClosePeriodPage />} />
        </Route>

        <Route path="/2fa-setup" element={<PrivateRoute><TwoFactorAuth /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;