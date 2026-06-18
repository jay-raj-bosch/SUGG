import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Plus } from "lucide-react";
import { teamMemberOptions } from "@/lib/bidp/suggestionConstants";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  selectedMembers: string[];
  sharePercents: Record<string, string>;
  onMembersChange: (members: string[]) => void;
  onShareChange: (shares: Record<string, string>) => void;
  errors: Record<string, string>;
}

const TeamMembersShareField = ({ selectedMembers, sharePercents, onMembersChange, onShareChange, errors }: Props) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return teamMemberOptions;
    const q = search.toLowerCase();
    return teamMemberOptions.filter(m => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q));
  }, [search]);

  const toggle = (empId: string) => {
    if (selectedMembers.includes(empId)) {
      onMembersChange(selectedMembers.filter(id => id !== empId));
      const next = { ...sharePercents };
      delete next[empId];
      onShareChange(next);
    } else {
      onMembersChange([...selectedMembers, empId]);
    }
  };

  const remove = (empId: string) => {
    onMembersChange(selectedMembers.filter(id => id !== empId));
    const next = { ...sharePercents };
    delete next[empId];
    onShareChange(next);
  };

  const handleShareInput = (empId: string, value: string) => {
    onShareChange({ ...sharePercents, [empId]: value });
  };

  const totalShare = selectedMembers.reduce((sum, id) => sum + (Number(sharePercents[id]) || 0), 0);

  return (
    <div className="space-y-3">
      {/* Team Member Multi-Select */}
      <div className="space-y-1.5">
        <Label className="text-xs">Team Members <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Team Members")}</span></Label>

        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedMembers.map(id => {
              const member = teamMemberOptions.find(m => m.value === id);
              return (
                <Badge key={id} variant="secondary" className="text-[11px] gap-1 pr-1">
                  <span className="font-medium">{member?.name || id}</span>
                  <span className="text-muted-foreground font-mono">({id})</span>
                  {member?.dept && <span className="text-muted-foreground opacity-70">· {member.dept}</span>}
                  <button type="button" onClick={() => remove(id)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div className={`border rounded-md ${errors.teamMembers ? "border-destructive" : ""}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search team members by name or ID..."
              className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[160px] overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length > 0 ? filtered.map(m => {
              const isSelected = selectedMembers.includes(m.value);
              return (
                <div
                  key={m.value}
                  onClick={() => toggle(m.value)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                    {isSelected && <span className="text-primary-foreground text-[9px]">\u2713</span>}
                  </div>
                  <div className="flex flex-col leading-tight flex-1 min-w-0">
                    <span className="font-medium">{m.name} <span className="font-mono font-normal text-muted-foreground">({m.value})</span></span>
                    {m.dept && <span className="text-[10px] text-muted-foreground">{m.dept}</span>}
                  </div>
                  <Plus className={`h-3 w-3 shrink-0 ${isSelected ? "hidden" : "text-muted-foreground"}`} />
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground text-center py-2">No team members found</p>
            )}
          </div>
        </div>
        {errors.teamMembers && <p className="text-xs text-destructive">{errors.teamMembers}</p>}
      </div>

      {/* Share % per member */}
      {selectedMembers.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Share % per Member <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Share %")}</span></Label>
          <div className="border rounded-md divide-y">
            {selectedMembers.map(id => {
              const member = teamMemberOptions.find(m => m.value === id);
              return (
                <div key={id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex flex-col leading-tight flex-1 min-w-0">
                    <span className="text-xs font-medium truncate">{member?.name || id} <span className="font-mono font-normal text-muted-foreground">({id})</span></span>
                    {member?.dept && <span className="text-[10px] text-muted-foreground">{member.dept}</span>}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={sharePercents[id] || ""}
                    onChange={e => handleShareInput(id, e.target.value)}
                    placeholder="0"
                    className={`h-7 w-20 text-xs text-right ${errors.teamSharePercents ? "border-destructive" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
              <span className="text-xs font-medium">Total</span>
              <span className={`text-xs font-bold ${totalShare === 100 ? "text-primary" : "text-destructive"}`}>
                {totalShare}%
              </span>
            </div>
          </div>
          {errors.teamSharePercents && <p className="text-xs text-destructive">{errors.teamSharePercents}</p>}
          {totalShare !== 100 && selectedMembers.length > 0 && (
            <p className="text-[10px] text-muted-foreground">Total share must equal 100%</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamMembersShareField;
