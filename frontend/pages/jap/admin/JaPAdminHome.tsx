import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlant } from "@/contexts/PlantContext";

// JaP admin root — redirect straight to Workflow Inbox
const JaPAdminHome = () => {
  const navigate = useNavigate();
  const { plantPrefix } = usePlant();

  useEffect(() => {
    navigate(`${plantPrefix}/admin/workflow-inbox`, { replace: true });
  }, [navigate, plantPrefix]);

  return null;
};

export default JaPAdminHome;
