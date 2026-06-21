// DeptMapping — wired to /api/dept-mappings
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as apiService from "@/lib/apiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import SuggestionCombobox from "@/components/SuggestionCombobox";

const knownDepartments = [
  "BIDP1/TEF", "BIDP2/QAL", "BIDP1/HRD", "BIDP1/MNT",
  "BIDP3/LOG", "BIDP2/RND", "BIDP1/FIN", "BIDP1/ITS", "BIDP1/SAF", "BIDP1/ENV",
  "BIDP3/PRC", "BIDP2/SAL", "BIDP3/MKT", "BIDP1/ADM", "BIDP3/ENG",
];

const DeptMapping = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { entries: depts, addEntry, updateEntry, removeEntry } = useDeptMappings();
  const [search, setSearch] = useState("");
  const [deptName, setDeptName] = useState("");
  const [mappedName, setMappedName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMapped, setEditingMapped] = useState("");

  const filtered = depts.filter(d =>
    d.dept.toLowerCase().includes(search.toLowerCase()) ||
    d.mapped.toLowerCase().includes(search.toLowerCase())
  );

  const deptOptions = knownDepartments.map(d => ({ value: d, label: d }));
  const mappedOptions = depts.map(d => ({ value: d.mapped, label: d.mapped, sublabel: `Mapped from ${d.dept}` }));

  const handleAdd = async () => {
    if (!deptName.trim()) { toast.error("Department name is required"); return; }
    if (!mappedName.trim()) { toast.error("Mapped name is required"); return; }
    if (depts.some(d => d.dept.toLowerCase() === deptName.trim().toLowerCase())) {
      toast.error("Department already exists"); return;
    }
    let newEntry = { id: String(Date.now()), dept: deptName.trim(), mapped: mappedName.trim() };
    try {
      const created = await apiService.addDeptMapping(deptName.trim(), mappedName.trim());
      newEntry = { id: String(created.id), dept: created.dept_name, mapped: created.mapped_name };
    } catch {
      // fallback: local add with generated id
    }
    addEntry(newEntry);
    setDeptName(""); setMappedName("");
    toast.success(`Department "${deptName.trim()}" mapped to "${mappedName.trim()}"`);
    addNotification(`Dept mapping added: ${deptName.trim()} → ${mappedName.trim()}`, "info");
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleEditStart = (entry: DeptEntry) => {
    setEditingId(entry.id);
    setEditingMapped(entry.mapped);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingMapped("");
  };

  const handleEditSave = async (id: string) => {
    if (!editingMapped.trim()) { toast.error("Mapped name is required"); return; }
    try {
      await apiService.updateDeptMapping(parseInt(id), editingMapped.trim());
    } catch { /* fallback: local update */ }
    updateEntry(id, editingMapped.trim());
    const entry = depts.find(d => d.id === id);
    toast.success(`Updated mapping: ${entry?.dept} → ${editingMapped.trim()}`);
    addNotification(`Dept mapping updated: ${entry?.dept} → ${editingMapped.trim()}`, "info");
    setEditingId(null);
    setEditingMapped("");
  };

  const confirmDelete = async () => {
    const entry = depts.find(d => d.id === pendingDeleteId);
    if (!entry) return;
    try {
      await apiService.removeDeptMapping(parseInt(entry.id));
    } catch { /* keep local delete even if backend fails */ }
    removeEntry(entry.id);
    toast.success(`Mapping "${entry.dept} → ${entry.mapped}" deleted`);
    addNotification(`Dept mapping deleted: ${entry.dept} → ${entry.mapped}`, "info");
    setPendingDeleteId(null);
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">Add Department Mapping <span className="text-sm font-normal text-muted-foreground">/ {t("Add Department Mapping")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Department Name <span className="text-[9px] opacity-70">/ {t("Department")}</span></Label>
              <SuggestionCombobox
                options={deptOptions}
                value={deptName}
                onChange={setDeptName}
                placeholder="Type department name..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mapped Department Name <span className="text-[9px] opacity-70">/ {t("Department")}</span></Label>
              <SuggestionCombobox
                options={mappedOptions}
                value={mappedName}
                onChange={setMappedName}
                placeholder="Type mapped name..."
              />
            </div>
          </div>
          <Button className="gap-1.5" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Add / {t("Add Authority")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">Total: {filtered.length}</span>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Mapped To <span className="text-[9px] opacity-70">/ {t("Department")}</span></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">No mappings found</td></tr>
              ) : (
                filtered.map((d, i) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 font-medium">{d.dept}</td>
                    <td className="py-2 px-2">
                      {editingId === d.id ? (
                        <SuggestionCombobox
                          options={mappedOptions}
                          value={editingMapped}
                          onChange={setEditingMapped}
                          placeholder="Type mapped name..."
                        />
                      ) : (
                        d.mapped
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {editingId === d.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditSave(d.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-green-600 hover:bg-green-600/10 transition-colors"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleEditCancel}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditStart(d)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 transition-colors"
                            title="Edit mapping"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <AlertDialog open={!!pendingDeleteId} onOpenChange={open => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department Mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const entry = depts.find(d => d.id === pendingDeleteId);
                return entry
                  ? <>Are you sure you want to delete the mapping <span className="font-semibold text-foreground">{entry.dept} → {entry.mapped}</span>? This action cannot be undone.</>
                  : "Are you sure you want to delete this mapping? This action cannot be undone.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeptMapping;
