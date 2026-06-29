// CategoryMaster — fetches categories from backend API
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoryContext";
import * as apiService from "@/lib/apiService";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { usePlant } from "@/contexts/PlantContext";

interface CategoryEntry {
  id: string;
  plant: string;
  name: string;
  desc: string;
}

const CategoryMaster = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { refreshCategories } = useCategories();
  const { plant } = usePlant();
  const [catList, setCatList] = useState<CategoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Load categories from backend on mount
  useEffect(() => {
    apiService.fetchCategories(plant as "bidp" | "jap").then(cats => {
      setCatList(cats.map(c => ({ id: String(c.id), plant: c.plant_code, name: c.name, desc: c.description || "" })));
    }).catch(() => {});
  }, []);

  const filtered = catList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  );

  // Autocomplete suggestions from existing categories in the database
  const categoryOptions = catList.map(c => ({ value: c.name, label: c.name }));

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Category name is required"); return; }
    if (catList.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Category already exists"); return;
    }
    try {
      const created = await apiService.addCategory(plant as "bidp" | "jap", name.trim(), desc.trim());
      setCatList(prev => [...prev, { id: String(created.id), plant: created.plant_code, name: created.name, desc: created.description || "" }]);
      toast.success(`Category "${name.trim()}" added`);
      addNotification(`New category "${name.trim()}" added to master`, "info");
      refreshCategories();
    } catch {
      // Fallback: add locally
      setCatList(prev => [...prev, { id: String(Date.now()), plant, name: name.trim(), desc: desc.trim() }]);
      toast.success(`Category "${name.trim()}" added (locally)`);
    }
    setName(""); setDesc("");
  };




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
              <Input value={plant} onChange={e => setPlant(e.target.value)} />
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
        <span className="text-xs text-muted-foreground">Total: {filtered.length}</span>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Plant" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Category" /></th>
                <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Description <span className="text-[9px] opacity-70">/ {t("Details")}</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">No categories found</td></tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
    </div>
  );
};

export default CategoryMaster;
