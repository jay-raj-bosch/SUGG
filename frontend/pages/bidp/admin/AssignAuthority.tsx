// AssignAuthority — fetches employees and authorities from backend API
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import * as apiService from "@/lib/apiService";
import { useDeptMappings } from "@/contexts/DeptMappingContext";

interface AuthorityRow {
  id: string;
  plantCode: string;
  empNo: string;
  name: string;
  dept: string;
  role: string;
  type: string;
  email: string;
  ntid: string;
  suggestionRange: string;
}

const AssignAuthority = () => {
  const { t } = useLanguage();
  const { uniqueRanges } = useDeptMappings();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterPlant, setFilterPlant] = useState("All");
  const [authorities, setAuthorities] = useState<AuthorityRow[]>([]);

  const [plantCode, setPlantCode] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [ntid, setNtid] = useState("");
  const [role, setRole] = useState("");
  const [suggestionRange, setSuggestionRange] = useState("");
  const [lookupDone, setLookupDone] = useState(false);

  // Load authorities from backend on mount
  useEffect(() => {
    apiService.fetchAuthority().then(list => {
      setAuthorities(list.map(a => ({
        id: String(a.id),
        plantCode: a.plant_code,
        empNo: a.employee_no,
        name: a.name,
        dept: a.department || "",
        role: a.role,
        type: a.type,
        email: a.email || "",
        ntid: a.ntid || "",
        suggestionRange: "",
      })));
    }).catch(() => {});
  }, []);

  // Clear auto-filled fields helper
  const clearAutoFill = () => {
    setName(""); setEmail(""); setDept(""); setNtid(""); setLookupDone(false);
  };

  // Lookup employee from backend API
  const lookupEmployee = async () => {
    const val = empNo.trim().toUpperCase();
    if (!val) { clearAutoFill(); return; }

    try {
      const employees = await apiService.fetchEmployees(plantCode || undefined);
      const found = employees.find(e => e.employee_no === val);
      if (!found) { clearAutoFill(); toast.error("Employee not found"); return; }

      setName(found.name);
      setEmail(found.email);
      setDept(found.department);
      setNtid(found.ntid);
      setLookupDone(true);
    } catch {
      clearAutoFill();
      toast.error("Failed to look up employee");
    }
  };

  // Re-validate when type or plantCode changes — only if empNo has a value
  useEffect(() => {
    // Always clear the cached auto-fill first so the user never sees a stale
    // employee from the previous plant while the lookup is still pending.
    if (lookupDone) clearAutoFill();
    if (!empNo.trim()) return;
    lookupEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, plantCode]);

  const handleAdd = async () => {
    if (!empNo || !type || !role || !name) {
      toast.error("Please fill Employee No, Type, and Authority Role");
      return;
    }
    try {
      const created = await apiService.addAuthority({
        plant_code: plantCode || "PLT-01",
        employee_no: empNo.trim().toUpperCase(),
        name, department: dept, role: role as any, type: type as any, email, ntid,
      });
      const newAuth: AuthorityRow = {
        id: String(created.id),
        plantCode: created.plant_code,
        empNo: created.employee_no,
        name: created.name,
        dept: created.department || "",
        role: created.role,
        type: created.type,
        email: created.email || "",
        ntid: created.ntid || "",
        suggestionRange,
      };
      setAuthorities(prev => [newAuth, ...prev]);
      toast.success(`Authority assigned: ${name} as ${role}`);
      addNotification(`Authority assigned: ${name} as ${role}`, "success");
    } catch {
      toast.error("Failed to add authority");
    }
    setEmpNo(""); setType(""); setName(""); setEmail(""); setDept(""); setNtid(""); setRole(""); setSuggestionRange(""); setPlantCode(""); setLookupDone(false);
  };




  const filtered = authorities.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType  = filterType  === "All" || a.type      === filterType;
    const matchesPlant = filterPlant === "All" || a.plantCode === filterPlant;
    return matchesSearch && matchesType && matchesPlant;
  });

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">Assign Authority <span className="text-sm font-normal text-muted-foreground">/ {t("Assign Authority")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Plant Code <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Plant Code")}</span></Label>
              <Select value={plantCode} onValueChange={setPlantCode}>
                <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLT-01">PLT-01</SelectItem>
                  <SelectItem value="PLT-02">PLT-02</SelectItem>
                  <SelectItem value="PLT-03">PLT-03</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee No <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Employee No")}</span></Label>
              <Input
                placeholder="e.g. 30698665"
                value={empNo}
                onChange={e => { setEmpNo(e.target.value); if (!e.target.value.trim()) clearAutoFill(); }}
                onBlur={lookupEmployee}
                onKeyDown={e => { if (e.key === "Enter") lookupEmployee(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Type")}</span></Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Authority Role <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Authority Role")}</span></Label>
              <Select value={role} onValueChange={v => { setRole(v); setSuggestionRange(""); }}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLM">FLM</SelectItem>
                  <SelectItem value="BPS">BPS</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="HOD">HOD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role && (
              <div className="space-y-1.5">
                <Label className="text-xs">Suggestion Authority Range <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Range")}</span></Label>
                <Select value={suggestionRange} onValueChange={setSuggestionRange}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    {uniqueRanges.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="All">All Ranges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button className="gap-1.5" onClick={handleAdd} disabled={!lookupDone || !role || !suggestionRange}>
            <Plus className="h-3.5 w-3.5" /> Add Authority <span className="text-[10px] opacity-60">/ {t("Add Authority")}</span>
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name, emp no, dept, role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="External">External</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlant} onValueChange={setFilterPlant}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter by plant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Plants</SelectItem>
            <SelectItem value="PLT-01">PLT-01</SelectItem>
            <SelectItem value="PLT-02">PLT-02</SelectItem>
            <SelectItem value="PLT-03">PLT-03</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Plant <span className="text-[9px] opacity-70">/ {t("Plant")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Emp No <span className="text-[9px] opacity-70">/ {t("Emp No")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Name <span className="text-[9px] opacity-70">/ {t("Name")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Dept <span className="text-[9px] opacity-70">/ {t("Dept")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Role <span className="text-[9px] opacity-70">/ {t("Role")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Range <span className="text-[9px] opacity-70">/ {t("Range")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Type <span className="text-[9px] opacity-70">/ {t("Type")}</span></th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">NTID <span className="text-[9px] opacity-70">/ {t("NTID")}</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-2">{a.plantCode}</td>
                  <td className="py-2 font-mono text-xs">{a.empNo}</td>
                  <td className="py-2">{a.name}</td>
                  <td className="py-2 text-xs">{a.dept}</td>
                  <td className="py-2 text-xs">{a.role}</td>
                  <td className="py-2 text-xs">{a.suggestionRange || "—"}</td>
                  <td className="py-2 text-xs">{a.type}</td>
                  <td className="py-2 text-xs">{a.ntid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignAuthority;
