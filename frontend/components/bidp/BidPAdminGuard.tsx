// BidP — Admin Module route guard
// Wraps admin/* child routes under /bidp so only roles with admin module
// access (BPS Admin, BPS DH, VS RC — see BIDP_ROLE_DEFINITIONS) can reach
// them. Any other role (Employee, FLM, Manager, Dept General Manager,
// General Manager) is redirected back to the Employee home if they try
// to reach an admin URL directly. Roles with a restricted
// `allowedAdminPaths` list (e.g. VS RC → General Enquiry & MIS Report
// only) are further redirected away from any admin page not in their
// allow-list.
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { bidpRoleHasAdminAccess, bidpRoleCanAccessAdminPath } from "@/lib/bidp/roles";

const BidPAdminGuard = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  if (!bidpRoleHasAdminAccess(user.bidpRole)) {
    return <Navigate to="/bidp/employee" replace />;
  }

  // e.g. "/bidp/admin/mis-report" → "mis-report"
  const currentAdminPath = location.pathname.split("/admin/")[1]?.split("/")[0] ?? "";
  if (!bidpRoleCanAccessAdminPath(user.bidpRole, currentAdminPath)) {
    return <Navigate to="/bidp/admin/general-enquiry" replace />;
  }

  return <Outlet />;
};

export default BidPAdminGuard;
