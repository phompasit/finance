import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";

// pages
import Login from "./pages/Login.page";
import Dashboard from "./pages/Dashboard";
import IncomeExpense from "./pages/IncomeExpense";
import OPO from "./pages/OPO";
import Debt from "./pages/Debt";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Partner from "./pages/Partner";
import PrepaidExpenseDashboard from "./pages/PrepaidExpenseDashboard";
import RegisterForm from "./pages/RegisterForSuperAdmin";
import "./index.css";
// accounting
import ChartOfAccounts from "./accounting/ChartOfAccounts";
import OpeningBalancePage from "./accounting/OpeningBalancePage";
import JournalEntryPage from "./accounting/Journal/JournalEntryPage";
import JournalDetailPage from "./accounting/Journal/JournalDetailPage";
import PrintJournalPage from "./accounting/Journal/PrintJournalPage";
import IncomeStatementPage from "./accounting/IncomeStatementPage";
import BalanceSheetPage from "./accounting/BalanceSheetPage";
import GeneralLedgerPage from "./accounting/GeneralLedgerPage";
import StatementOfFinancialPosition from "./accounting/StatementOfFinancialPosition";
import AssetsPage from "./accounting/AssetsPage";
import RoleRoute from "./context/RoleRoute";
import NotFound from "./components/NotFound";
import RenderFields from "./components/Income_Expense/FormFieldsAdd";
import FormIncomeExpense from "./pages/FormIncomeExpense";
import RenderFieldPrepaid from "./components/Prepaid_components/RenderFieldPrepaid";
import EditForm from "./components/Prepaid_components/EditForm";
import RenderOpoForm from "./components/Opo_components/RenderOpoForm";
import RenderForm_Debt from "./components/Debt/RenderForm_Debt";
import JournalModal from "./accounting/Journal/JournalModal";
import ClosePeriodPage from "./accounting/ClosePeriodPage";
import Balanc_sheet_before from "./accounting/Balanc_sheet_before";
import BalanceSheetIncomeAndExpense from "./accounting/BalanceSheetIncomeAndExpense";
import FixedAssetApp from "./accounting/FixedAssetApp";
import AddAssetModal from "./components/FixedAsset/AddAssetModal";
import DepreciationPreviewModal from "./components/FixedAsset/DepreciationPreviewModal";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import Verify2FA from "./pages/Verify2FA";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterForm />} />
        {/* ================= PRIVATE ================= */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="income-expense" element={<IncomeExpense />} />
          <Route path="opo" element={<OPO />} />
          <Route path="opo_form" element={<RenderOpoForm />} />
          <Route path="debt" element={<Debt />} />
          <Route path="debt_form" element={<RenderForm_Debt />} />
          <Route path="fields" element={<RenderFields />} />
          <Route path="form_income_expense" element={<FormIncomeExpense />} />
          {/* <Route path="reports" element={<Reports />} /> */}
          <Route path="form_prepaid_add" element={<RenderFieldPrepaid />} />
          <Route path="prepaid" element={<PrepaidExpenseDashboard />} />
          <Route path="prepaid_form_edit" element={<EditForm />} />
          <Route path="partner" element={<Partner />} />
          <Route
            path="users"
            element={
              <RoleRoute allow={["admin", "master", "staff"]}>
                <Users />
              </RoleRoute>
            }
          />

          {/* accounting */}
          <Route path="chart-account" element={<ChartOfAccounts />} />
          <Route path="opening-balance" element={<OpeningBalancePage />} />
          <Route path="journal" element={<JournalEntryPage />} />
          <Route path="journal/:id" element={<JournalDetailPage />} />
          <Route path="journal/print" element={<PrintJournalPage />} />
          <Route path="income-statement" element={<IncomeStatementPage />} />
          <Route path="balance-sheet" element={<BalanceSheetPage />} />
          <Route
            path="balance-sheet-before"
            element={<Balanc_sheet_before />}
          />
          <Route
            path="income-expense-balance-sheet"
            element={<BalanceSheetIncomeAndExpense />}
          />
          <Route path="ledger" element={<GeneralLedgerPage />} />
          <Route path="statement" element={<StatementOfFinancialPosition />} />
          <Route path="assets" element={<AssetsPage />} />

          {/* ////// */}
          <Route path="fixed-assets" element={<FixedAssetApp />} />
          <Route path="fixed-add/:id" element={<AddAssetModal />} />
          <Route
            path="fixed-add-Depreciation"
            element={<DepreciationPreviewModal />}
          />

          {/* accounting component */}
          <Route path="journal_add&edit" element={<JournalModal />} />

          <Route path="closing_account" element={<ClosePeriodPage />} />
        </Route>
        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<NotFound />} />

        <Route path="2fa-setup" element={<TwoFactorAuth />} />
        <Route path="2faVerify" element={<Verify2FA />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
