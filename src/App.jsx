import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.page";
import NotFound from "./components/NotFound";
import Verify2FA from "./pages/Verify2FA";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./context/RoleRoute";
import Layout from "./components/Layout";
import "./index.css";

// ─── Preload helper ───────────────────────────────────────────────────────────
// ใช้ Component.preload() ใน onMouseEnter ของ NavLink เพื่อ prefetch ก่อนคลิก
const preload = (importFn) => {
  const Component = lazy(importFn);
  Component.preload = importFn;
  return Component;
};

// ─── Lazy components ──────────────────────────────────────────────────────────
const Dashboard                    = preload(() => import("./pages/Dashboard"));
const IncomeExpense                 = preload(() => import("./pages/IncomeExpense"));
const OPO                          = preload(() => import("./pages/OPO"));
const Debt                         = preload(() => import("./pages/Debt"));
const Partner                      = preload(() => import("./pages/Partner"));
const Users                        = preload(() => import("./pages/Users"));
const PrepaidExpenseDashboard      = preload(() => import("./pages/PrepaidExpenseDashboard"));
const FormIncomeExpense            = preload(() => import("./pages/FormIncomeExpense"));
const TwoFactorAuth                = preload(() => import("./pages/TwoFactorAuth"));
const RegisterForSuperAdmin        = preload(() => import("./pages/RegisterForSuperAdmin"));

const RenderFields                 = preload(() => import("./components/Income_Expense/FormFieldsAdd"));
const RenderFieldPrepaid           = preload(() => import("./components/Prepaid_components/RenderFieldPrepaid"));
const EditForm                     = preload(() => import("./components/Prepaid_components/EditForm"));
const RenderOpoForm                = preload(() => import("./components/Opo_components/RenderOpoForm"));
const RenderForm_Debt              = preload(() => import("./components/Debt/RenderForm_Debt"));

// ✅ ย้ายจาก static import มาเป็น lazy (ลด initial bundle)
const DisbursementList             = preload(() => import("./pages/DisbursementList"));
const DisbursementForm             = preload(() => import("./components/Opo_components/DistForms"));

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

// ─── Loading fallback ─────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100%",
    }}
  >
    {/* ถ้าใช้ Chakra UI: เปลี่ยนเป็น <Spinner size="xl" color="blue.500" /> */}
    <div
      style={{
        width: 48,
        height: 48,
        border: "4px solid #e2e8f0",
        borderTop: "4px solid #3182ce",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      {/*
        ✅ Suspense ครอบ Routes ทั้งหมดในที่เดียว
           — ทุก lazy component ด้านในจะใช้ fallback นี้ร่วมกัน
           — ไม่ต้องใส่ Suspense ซ้ำในแต่ละ Route
      */}
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<RegisterForSuperAdmin />} />
          <Route path="/2faVerify" element={<Verify2FA />} />

          {/* ── Protected routes ── */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Income / Expense */}
            <Route path="income-expense"      element={<IncomeExpense />} />
            <Route path="form_income_expense" element={<FormIncomeExpense />} />
            <Route path="fields"              element={<RenderFields />} />

            {/* OPO */}
            <Route path="opo"      element={<OPO />} />
            <Route path="opo_form" element={<RenderOpoForm />} />

            {/* Debt */}
            <Route path="debt"      element={<Debt />} />
            <Route path="debt_form" element={<RenderForm_Debt />} />

            {/* Prepaid */}
            <Route path="prepaid"          element={<PrepaidExpenseDashboard />} />
            <Route path="form_prepaid_add" element={<RenderFieldPrepaid />} />
            <Route path="prepaid_form_edit" element={<EditForm />} />

            {/* Disbursement */}
            <Route path="disbursement"              element={<DisbursementList />} />
            <Route path="disbursement_form/:mode"   element={<DisbursementForm />} />

            {/* Partner */}
            <Route path="partner" element={<Partner />} />

            {/* Users — role protected */}
            <Route
              path="users"
              element={
                <RoleRoute allow={["admin", "master", "staff"]}>
                  <Users />
                </RoleRoute>
              }
            />

            {/* Accounting */}
            <Route path="chart-account"   element={<ChartOfAccounts />} />
            <Route path="opening-balance" element={<OpeningBalancePage />} />

            {/* Journal */}
            <Route path="journal"          element={<JournalEntryPage />} />
            <Route path="journal/:id"      element={<JournalDetailPage />} />
            <Route path="journal/print"    element={<PrintJournalPage />} />
            <Route path="journal_add&edit" element={<JournalModal />} />

            {/* Reports */}
            <Route path="income-statement"             element={<IncomeStatementPage />} />
            <Route path="balance-sheet"                element={<BalanceSheetPage />} />
            <Route path="balance-sheet-before"         element={<Balanc_sheet_before />} />
            <Route path="income-expense-balance-sheet" element={<BalanceSheetIncomeAndExpense />} />
            <Route path="ledger"                       element={<GeneralLedgerPage />} />
            <Route path="statement"                    element={<StatementOfFinancialPosition />} />

            {/* Assets */}
            <Route path="assets"                  element={<AssetsPage />} />
            <Route path="fixed-assets"            element={<FixedAssetApp />} />
            <Route path="fixed-add/:id"           element={<AddAssetModal />} />
            <Route path="fixed-add-Depreciation"  element={<DepreciationPreviewModal />} />

            {/* Period */}
            <Route path="closing_account" element={<ClosePeriodPage />} />
          </Route>

          {/* ── 2FA Setup ── */}
          <Route
            path="/2fa-setup"
            element={<PrivateRoute><TwoFactorAuth /></PrivateRoute>}
          />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;