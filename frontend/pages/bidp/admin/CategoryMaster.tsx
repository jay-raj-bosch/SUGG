// CategoryMaster — fetches categories from backend API
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoryContext";
import { categories as defaultCategories } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { usePlant } from "@/contexts/PlantContext";

interface CategoryEntry {
  id: string;
  plant: string;
  name: string;
  desc: string;
}

const CATLIST_KEY = "bidp_catlist";

const CategoryMaster = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { refreshCategories, addCategory: ctxAddCategory, removeCategories: ctxRemoveCategories } = useCategories();
  const { plant } = usePlant();

  // Restore catList from sessionStorage on mount
  const [catList, setCatList] = useState<CategoryEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem(CATLIST_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* */ }
    return [];
  });
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Persist catList to sessionStorage whenever it changes
  useEffect(() => {
    try { sessionStorage.setItem(CATLIST_KEY, JSON.stringify(catList)); } catch { /* */ }
  }, [catList]);

  // Load categories from backend on mount — re-run if plant changes
  useEffect(() => {
    apiService.fetchCategories(plant as "bidp" | "jap").then(cats => {
      const backendEntries = cats.map(c => ({ id: String(c.id), plant: c.plant_code, name: c.name, desc: c.description || "" }));
      setCatList(prev => {
        // Merge: backend entries + any session-only entries not in backend
        const backendNames = new Set(backendEntries.map(e => e.name.toLowerCase()));
        const sessionOnly = prev.filter(p => !backendNames.has(p.name.toLowerCase()));
        return [...backendEntries, ...sessionOnly];
      });
    }).catch(() => {
      setCatList(prev => prev.length > 0 ? prev : defaultCategories.map((name, i) => ({ id: String(i + 1), plant: "PLT-01", name, desc: "" })));
    });
  }, [plant]);

  const filtered = catList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  );

  // Autocomplete suggestions from existing categories in the database
  const categoryOptions = catList.map(c => ({ value: c.name, label: c.name }));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Category name is required"); return; }
    if (catList.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Category already exists"); return;
    }
    try {
      const created = await apiService.addCategory(plant as "bidp" | "jap", name.trim(), desc.trim());
      const entry = { id: String(created.id), plant: created.plant_code, name: created.name, desc: created.description || "" };
      setCatList(prev => [...prev, entry]);
      ctxAddCategory(created.name);
      toast.success(`Category "${name.trim()}" added`);
      addNotification(`New category "${name.trim()}" added to master`, "info");
    } catch {
      // Fallback: add locally
      const entry = { id: String(Date.now()), plant, name: name.trim(), desc: desc.trim() };
      setCatList(prev => [...prev, entry]);
      ctxAddCategory(name.trim());
      toast.success(`Category "${name.trim()}" added (locally)`);
    }
    setName(""); setDesc("");
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const toDelete = catList.filter(c => selectedIds.has(c.id));
    const names = toDelete.map(c => c.name);

    // Delete all selected — fire in parallel
    await Promise.allSettled(
      toDelete.map(c => apiService.removeCategory(plant as "bidp" | "jap", Number(c.id)).catch(() => {}))
    );

    setCatList(prev => prev.filter(c => !selectedIds.has(c.id)));
    ctxRemoveCategories(names);
    setSelectedIds(new Set());
    setConfirmDeleteOpen(false);
    setIsDeleting(false);

    toast.success(`Removed ${names.length} category${names.length > 1 ? "ies" : ""}: ${names.join(", ")}`);
    addNotification(`${names.length} category${names.length > 1 ? "ies" : ""} removed from master`, "info");
  };

  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">Category Master <span className="text-sm font-normal text-muted-foreground">/ {t("Category Master")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Plant Code <span className="text-[9px] opacity-70">/ {t("Plant Code")}</span></Label>
              <Input value={plant ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category Name <span className="text-[9px] opacity-70">/ {t("Category")}</span></Label>
              <SuggestionCombobox
                options={categoryOptions}
                value={name}
                onChange={setName}
                placeholder="Type category name..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category Description <span className="text-[9px] opacity-70">/ {t("Details")}</span></Label>
            <Textarea placeholder="Describe the category" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <Button className="gap-1.5" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Submit / {t("Submit")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected ({selectedCount})
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Total: {filtered.length}</span>
        </div>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 px-2 w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Plant" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Category" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Description <span className="text-[9px] opacity-70">/ {t("Details")}</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">No categories found</td></tr>
              ) : (
                filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selectedIds.has(c.id) ? "bg-destructive/5" : ""}`}
                  >
                    <td className="py-2 px-2">
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 text-xs">{c.plant}</td>
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{c.desc}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Category{selectedCount > 1 ? "ies" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>This will permanently remove the following from the master list:</span>
              <span className="block mt-2 font-medium text-foreground">
                {catList.filter(c => selectedIds.has(c.id)).map(c => c.name).join(", ")}
              </span>
              <span className="block mt-2 text-xs">Existing suggestions using these categories will not be affected.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryMaster;
