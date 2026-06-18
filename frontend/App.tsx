import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SuggestionProvider } from "@/contexts/SuggestionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PlantProvider } from "@/contexts/PlantContext";
import { CategoryProvider } from "@/contexts/CategoryContext";
import PlantGuard from "@/components/PlantGuard";

// â”€â”€ Landing pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Index from "./pages/Index";
import SelectRole from "./pages/SelectRole";
import NotFound from "./pages/NotFound";

// â”€â”€ Shared layouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import EmployeeLayout from "./layouts/EmployeeLayout";
import AdminLayout from "./layouts/AdminLayout";
import BidPUnifiedLayout from "./layouts/BidPUnifiedLayout";

// â”€â”€ BidP â€” Employee pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import BidPEmployeeHome      from "./pages/bidp/employee/EmployeeHome";
import BidPNewSuggestion     from "./pages/bidp/employee/NewSuggestion";
import BidPCopySuggestion    from "./pages/bidp/employee/CopySuggestion";
import BidPMyPending         from "./pages/bidp/employee/MyPending";

import BidPMySuggestions     from "./pages/bidp/employee/MySuggestions";
import BidPMyAwards          from "./pages/bidp/employee/MyAwards";
import BidPMyApprovals       from "./pages/bidp/employee/MyApprovals";
import BidPProcedure         from "./pages/bidp/employee/Procedure";

// â”€â”€ BidP â€” Admin pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import BidPGeneralEnquiry     from "./pages/bidp/admin/GeneralEnquiry";
import BidPNeftReport         from "./pages/bidp/admin/NeftReport";
import BidPMisGraphical       from "./pages/bidp/admin/MisGraphical";
import BidPDeptMapping        from "./pages/bidp/admin/DeptMapping";
import BidPCategoryMaster     from "./pages/bidp/admin/CategoryMaster";
import BidPTransferSuggestion from "./pages/bidp/admin/TransferSuggestion";
import BidPReopenSuggestion   from "./pages/bidp/admin/ReopenSuggestion";
import BidPAwardLetter        from "./pages/bidp/admin/AwardLetter";
import BidPRoleSelect         from "./pages/bidp/BidPRoleSelect";

// ── BidP — Kiosk pages ──────────────────────────────────────────────────────
import KioskLogin            from "./pages/bidp/kiosk/KioskLogin";
import KioskLayout           from "./layouts/KioskLayout";
import KioskHome             from "./pages/bidp/kiosk/KioskHome";
import KioskNewSuggestion    from "./pages/bidp/kiosk/KioskNewSuggestion";
import KioskMySuggestions    from "./pages/bidp/kiosk/KioskMySuggestions";
import KioskMyAwards         from "./pages/bidp/kiosk/KioskMyAwards";
import KioskChangePassword   from "./pages/bidp/kiosk/KioskChangePassword";

// â”€â”€ JaP â€” Employee pages (expand as JaP workflow is defined) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import JaPEmployeeHome  from "./pages/jap/employee/JaPEmployeeHome";
import JaPNewSuggestion from "./pages/jap/employee/NewSuggestion";
import JaPMySuggestions from "./pages/jap/employee/MySuggestions";
import JaPMyRewards     from "./pages/jap/employee/MyRewards";
import JaPRoleSelect    from "./pages/jap/JaPRoleSelect";

// ── JaP — Admin pages ──────────────────────────────────────────────────────
import JaPAdminHome          from "./pages/jap/admin/JaPAdminHome";
import JaPAssignAuthority    from "./pages/jap/admin/AssignAuthority";
import JaPViewSuggestions    from "./pages/jap/admin/ViewSuggestions";
import JaPAwardManagement    from "./pages/jap/admin/AwardManagement";
import JaPMisGraphical       from "./pages/jap/admin/MisGraphical";
import JaPReopenSuggestion   from "./pages/jap/admin/ReopenSuggestion";
import JaPEvalQuantifiable    from "./pages/jap/admin/EvalQuantifiable";
import JaPEvalNonQuantifiable from "./pages/jap/admin/EvalNonQuantifiable";
import JaPApprovalInbox       from "./pages/jap/admin/ApprovalInbox";
import JaPWorkflowInbox       from "./pages/jap/admin/WorkflowInbox";
import JaPBpsSettings         from "./pages/jap/admin/BpsSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/*
        PlantProvider is the outermost data-scoping provider.
        All data contexts (SuggestionProvider, NotificationProvider) sit inside
        it so they always know the active plant before making any API call.
      */}
      <PlantProvider>
        <AuthProvider>
          <SuggestionProvider>
            <NotificationProvider>
              <LanguageProvider>
                <CategoryProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter> 
                  <Routes>

                    {/* â”€â”€ Step 1: Plant selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <Route path="/" element={<Index />} />

                    {/* â”€â”€ Step 2: Role selection (per plant) â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <Route path="/:plantCode" element={<SelectRole />} />

                    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                        BidP â€” Bidadi Plant
                        All routes wrapped in PlantGuard which validates
                        the plant code and syncs context from the URL.
                        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                    {/* BidP role selection */}
                    <Route path="/bidp/select-role" element={<BidPRoleSelect />} />

                    <Route path="/bidp" element={
                      <PlantGuard><BidPUnifiedLayout /></PlantGuard>
                    }>
                      {/* Default: Employee Home */}
                      <Route index element={<Navigate to="employee" replace />} />

                      {/* Employee pages */}
                      <Route path="employee"                     element={<BidPEmployeeHome />} />
                      <Route path="employee/new-suggestion"       element={<BidPNewSuggestion />} />
                      <Route path="employee/copy-suggestion"      element={<BidPCopySuggestion />} />

                      <Route path="employee/my-suggestions"       element={<BidPMySuggestions />} />
                      <Route path="employee/my-approvals"         element={<BidPMyApprovals />} />
                      <Route path="employee/my-awards"            element={<BidPMyAwards />} />
                      <Route path="employee/procedure"            element={<BidPProcedure />} />

                      {/* Admin pages */}
                      <Route path="admin/general-enquiry"     element={<BidPGeneralEnquiry />} />
                      <Route path="admin/neft-report"         element={<BidPNeftReport />} />
                      <Route path="admin/mis-graphical"       element={<BidPMisGraphical />} />
                      <Route path="admin/dept-mapping"        element={<BidPDeptMapping />} />
                      <Route path="admin/category-master"     element={<BidPCategoryMaster />} />
                      <Route path="admin/transfer-suggestion" element={<BidPTransferSuggestion />} />
                      <Route path="admin/reopen-suggestion"   element={<BidPReopenSuggestion />} />
                      <Route path="admin/award-letter"        element={<BidPAwardLetter />} />
                    </Route>

                    {/* BidP Kiosk — Employee self-service kiosk with login */}
                    <Route path="/bidp/kiosk/login" element={<KioskLogin />} />
                    <Route path="/bidp/kiosk" element={<KioskLayout />}>
                      <Route index element={<KioskHome />} />
                      <Route path="new-suggestion" element={<KioskNewSuggestion />} />
                      <Route path="my-suggestions" element={<KioskMySuggestions />} />
                      <Route path="my-awards" element={<KioskMyAwards />} />
                      <Route path="change-password" element={<KioskChangePassword />} />
                    </Route>

                    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                        JaP â€” Jaipur Plant
                        Add new pages here as JaP workflow is defined.
                        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                    {/* JaP role selection */}
                    <Route path="/jap/select-role" element={<JaPRoleSelect />} />

                    <Route path="/jap/employee" element={
                      <PlantGuard><EmployeeLayout /></PlantGuard>
                    }>
                      <Route index element={<JaPEmployeeHome />} />
                      <Route path="new-suggestion"  element={<JaPNewSuggestion />} />
                      <Route path="my-suggestions"  element={<JaPMySuggestions />} />
                      <Route path="my-rewards"       element={<JaPMyRewards />} />
                    </Route>

                    <Route path="/jap/admin" element={
                      <PlantGuard><AdminLayout /></PlantGuard>
                    }>
                      <Route index element={<JaPAdminHome />} />
                      <Route path="workflow-inbox"        element={<JaPWorkflowInbox />} />
                      <Route path="assign-authority"      element={<JaPAssignAuthority />} />
                      <Route path="view-suggestions"      element={<JaPViewSuggestions />} />
                      <Route path="eval-quantifiable"     element={<JaPEvalQuantifiable />} />
                      <Route path="eval-non-quantifiable" element={<JaPEvalNonQuantifiable />} />
                      <Route path="award-management"      element={<JaPAwardManagement />} />
                      <Route path="mis-graphical"         element={<JaPMisGraphical />} />
                      <Route path="reopen-suggestion"     element={<JaPReopenSuggestion />} />
                      <Route path="approval-inbox"        element={<JaPApprovalInbox />} />
                      <Route path="bps-settings"          element={<JaPBpsSettings />} />
                    </Route>

                    {/* â”€â”€ Legacy redirects â€” keeps old bookmarks working â”€â”€â”€ */}
                    <Route path="/employee/*" element={<Navigate to="/bidp/employee" replace />} />
                    <Route path="/admin/*"    element={<Navigate to="/bidp/admin"    replace />} />

                    <Route path="*" element={<NotFound />} />

                  </Routes>
                </BrowserRouter>
              </CategoryProvider>
            </LanguageProvider>
            </NotificationProvider>
          </SuggestionProvider>
        </AuthProvider>
      </PlantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
