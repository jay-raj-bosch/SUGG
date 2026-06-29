// JaP — Assign Authority
// Assigns evaluators for each workflow stage: Opinion, Implementation, Evaluation, Award
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import * as apiService from "@/lib/apiService";
import { mockEmployees } from "@/lib/mockData";
import SuggestionCombobox from "@/components/SuggestionCombobox";

interface AuthorityRow {
  id: string;
  empNo: string;
  name: string;
  dept: string;
  stage: string;
  email: string;
  ntid: string;
}

const JaPAssignAuthority = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();

  const [authorities, setAuthorities] = useState<AuthorityRow[]>([]);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>(() =>
    mockEmployees.filter(e => e.plantCode === "PLT-02").map(e => ({
      employee_no: e.employeeNo, name: e.name, department: e.department,
      plant_code: e.plantCode, role: "employee", ntid: e.ntid, email: e.email,
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("All");

  const [empNo, setEmpNo]   = useState("");
  const [stage, setStage]   = useState("");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [dept, setDept]     = useState("");
  const [ntid, setNtid]     = useState("");
  const [lookupDone, setLookupDone] = useState(false);

  // Load existing JaP authorities from backend on mount
  useEffect(() => {
    apiService.fetchAuthority("jap").then(list => {
      setAuthorities(
        list
          .filter(a => a.plant_code?.toLowerCase() === "jap")
          .map(a => ({
            id: String(a.id),
            empNo: a.employee_no,
            name: a.name,
            dept: a.department || "",
            stage: a.role || "opinion",
            email: a.email || "",
            ntid: a.ntid || "",
          }))
      );
    }).catch(() => {});
    apiService.fetchEmployees("jap").then(list => {
      const jap = list.filter(e => e.plant_code === "PLT-02");
      if (jap.length) setAllEmployees(jap);
    }).catch(() => {});
  }, []);

  const clearAutoFill = () => { setName(""); setEmail(""); setDept(""); setNtid(""); setLookupDone(false); };

  const handleEmpSelect = (val: string) => {
    setEmpNo(val);
    if (!val) { clearAutoFill(); return; }
    const found = allEmployees.find(e => e.employee_no === val);
    if (found) {
      setName(found.name);
      setEmail(found.email);
      setDept(found.department);
      setNtid(found.ntid);
      setLookupDone(true);
    } else {
      clearAutoFill();
    }
  };

  const employeeOptions = useMemo(() =>
    allEmployees.map(e => ({
      value: e.employee_no,
      label: `${e.employee_no} — ${e.name}`,
      sublabel: e.department,
    })), [allEmployees]);

  // Re-validate when stage changes if empNo already entered
  useEffect(() => {
    if (!empNo.trim()) return;
    handleEmpSelect(empNo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleAdd = async () => {
    if (!empNo.trim() || !stage || !name) {
      toast.error("Please fill Employee No and Workflow Stage");
      return;
    }
    let newRow: AuthorityRow;
    try {
      const created = await apiService.addAuthority("jap", {
        plant_code: "JAP",
        employee_no: empNo.trim().toUpperCase(),
        name, department: dept, role: stage as any, type: "Internal", email, ntid,
      });
      newRow = {
        id: String(created.id),
        empNo: created.employee_no,
        name: created.name,
        dept: created.department || "",
        stage: created.role,
        email: created.email || "",
        ntid: created.ntid || "",
      };
    } catch {
      // Backend offline — persist locally
      newRow = {
        id: `local-${Date.now()}`,
        empNo: empNo.trim().toUpperCase(),
        name, dept, stage, email, ntid,
      };
    }
    setAuthorities(prev => [newRow, ...prev]);
    toast.success(`Authority assigned: ${name} for ${stage} stage`);
    addNotification(`JaP authority assigned: ${name} — ${stage}`, "success");
    setEmpNo(""); setStage(""); setName(""); setEmail(""); setDept(""); setNtid(""); setLookupDone(false);
  };
  
  const filtered = authorities.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.dept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === "All" || a.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  const STAGE_LABELS: Record<string, string> = {
    opinion:        "In Opinion / विचाराधीन",
    implementation: "In Implementation / क्रियान्वयन में",
    evaluation:     "In Evaluation / मूल्यांकन में",
    award:          "Award Stage / पुरस्कार चरण",
  };

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Assign Authority <span className="text-sm font-normal text-muted-foreground">/ {t("Assign Authority")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee No <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Employee No")}</span></Label>
              <SuggestionCombobox
                options={employeeOptions}
                value={empNo}
                onChange={handleEmpSelect}
                placeholder="Type employee no or name..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow Stage <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ कार्यप्रवाह चरण</span></Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opinion">In Opinion / विचाराधीन</SelectItem>
                  <SelectItem value="implementation">In Implementation / क्रियान्वयन में</SelectItem>
                  <SelectItem value="evaluation">In Evaluation / मूल्यांकन में</SelectItem>
                  <SelectItem value="award">Award Stage / पुरस्कार चरण</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-[10px] text-muted-foreground font-normal">/ {t("Name")}</span></Label>
              <Input value={name} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mail ID <span className="text-[10px] text-muted-foreground font-normal">/ {t("Mail ID")}</span></Label>
              <Input value={email} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department <span className="text-[10px] text-muted-foreground font-normal">/ {t("Department")}</span></Label>
              <Input value={dept} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NTID <span className="text-[10px] text-muted-foreground font-normal">/ {t("NTID")}</span></Label>
              <Input value={ntid} readOnly className="bg-muted/50" />
            </div>
          </div>
          <Button className="gap-1.5" onClick={handleAdd} disabled={!lookupDone || !stage}>
            <Plus className="h-3.5 w-3.5" /> Add Authority <span className="text-[10px] opacity-60">/ {t("Add Authority")}</span>
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name, emp no, dept..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Stages</SelectItem>
            <SelectItem value="opinion">In Opinion</SelectItem>
            <SelectItem value="implementation">In Implementation</SelectItem>
            <SelectItem value="evaluation">In Evaluation</SelectItem>
            <SelectItem value="award">Award Stage</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Total: {filtered.length}</span>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Employee No" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Name" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Stage / चरण</th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Mail ID" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="NTID" /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">No authorities assigned yet</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-2 font-mono text-xs">{row.empNo}</td>
                  <td className="py-2 px-2 font-medium text-xs">{row.name}</td>
                  <td className="py-2 px-2 text-xs">{row.dept || "—"}</td>
                  <td className="py-2 px-2 text-xs">{STAGE_LABELS[row.stage] || row.stage}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{row.email || "—"}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{row.ntid || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JaPAssignAuthority;
