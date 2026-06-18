// JaP — Award Management
// Process awards for suggestions at Award Stage.
// Quantifiable → Cash amount. Non-Quantifiable → Certificate / recognition note.
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Download, IndianRupee, FileText, Eye } from "lucide-react";
import * as apiService from "@/lib/apiService";
import type { Suggestion } from "@/lib/mockData";
import { downloadCSV } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const JaPAwardManagement = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();

  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggNo, setSelectedSuggNo] = useState("");
  const [awardType, setAwardType] = useState<"cash" | "certificate">("cash");
  const [amount, setAmount] = useState("");
  const [awardNote, setAwardNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const [processed, setProcessed] = useState(false);
  const [searchLog, setSearchLog] = useState("");

  interface AwardRecord {
    id: string;
    suggNo: string;
    empName: string;
    empNo: string;
    dept: string;
    type: string;
    amount?: number;
    note?: string;
    date: string;
    auditId: string;
  }
  const [awardLog, setAwardLog] = useState<AwardRecord[]>([]);
  const [recordSheetOpen, setRecordSheetOpen] = useState(false);

  // Load JaP suggestions from context (instant), then try backend upgrade
  const { suggestions: contextSuggestions, updateSuggestion } = useSuggestions();

  useEffect(() => {
    const ctx = contextSuggestions.filter(s => s.plantCode === "PLT-02");
    setAllSuggestions(ctx);
    apiService.fetchSuggestions({ plantCode: "jap", limit: 2000 })
      .then(r => {
        if (r.data?.length) {
          const japOnly = r.data.filter(s => s.plantCode === "PLT-02");
          if (japOnly.length) setAllSuggestions(japOnly);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardCandidates = allSuggestions.filter(s =>
    ["In Award", "In Evaluation", "Closed / Awarded"].includes(s.status)
  );

  const suggestionOptions = awardCandidates.map(s => ({
    value: s.suggestionNo,
    label: `${s.suggestionNo} — ${s.subject.slice(0, 40)}`,
    sublabel: `${s.employeeName} • ${s.status}`,
  }));

  const suggestion = allSuggestions.find(s => s.suggestionNo === selectedSuggNo);

  const handleProcess = async () => {
    if (!selectedSuggNo) { toast.error("Select a suggestion"); return; }
    if (awardType === "cash" && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
      toast.error("Enter a valid award amount");
      return;
    }
    const auditId = `JAP-AWD-${Date.now().toString().slice(-6)}`;
    if (suggestion) {
      try {
        await apiService.patchSuggestionStatus(suggestion.id, "Closed / Awarded");
      } catch { /* local fallback */ }
      updateSuggestion(suggestion.id, { status: "Closed / Awarded", awardAmount: awardType === "cash" ? Number(amount) : undefined, awardCategory: "Silver", awardDate: new Date().toISOString().slice(0, 10) });
    }
    const record: AwardRecord = {
      id: String(Date.now()),
      suggNo: selectedSuggNo,
      empName: suggestion?.employeeName || "",
      empNo: suggestion?.employeeNo || "",
      dept: suggestion?.department || "",
      type: awardType === "cash" ? "Cash / नकद" : "Certificate / प्रमाण-पत्र",
      amount: awardType === "cash" ? Number(amount) : undefined,
      note: awardNote.trim() || undefined,
      date: new Date().toISOString().slice(0, 10),
      auditId,
    };
    setAwardLog(prev => [record, ...prev]);
    setProcessed(true);
    toast.success(`Award processed for ${selectedSuggNo} — Audit ID: ${auditId}`);
    addNotification(`JaP award processed: ${selectedSuggNo} (${record.type})`, "success");
  };

  const handleReset = () => {
    setSelectedSuggNo(""); setAmount(""); setAwardNote(""); setRemarks(""); setProcessed(false);
  };

  const handleExport = () => {
    downloadCSV(
      ["Sugg No", "Employee", "Emp No", "Department", "Award Type", "Amount", "Note", "Date", "Audit ID"],
      awardLog.map(r => [r.suggNo, r.empName, r.empNo, r.dept, r.type, r.amount ? `₹${r.amount}` : "—", r.note || "—", r.date, r.auditId]),
      `JaP_Awards_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Award log exported!");
  };

  const filteredLog = awardLog.filter(r =>
    r.suggNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.empName.toLowerCase().includes(searchLog.toLowerCase())
  );

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <h2 className="text-xl font-bold text-foreground">Award Management <span className="text-sm font-normal text-muted-foreground">/ पुरस्कार प्रबंधन</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Suggestion No <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion No")}</span></Label>
            <SuggestionCombobox
              options={suggestionOptions}
              value={selectedSuggNo}
              onChange={v => { setSelectedSuggNo(v); setProcessed(false); }}
              placeholder="Type suggestion no or keyword..."
            />
          </div>

          {suggestion && (
            <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{suggestion.subject}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.category}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{suggestion.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-muted-foreground">Employee:</span> {suggestion.employeeName} ({suggestion.employeeNo})</p>
                <p><span className="text-muted-foreground">Date:</span> {suggestion.date}</p>
                <p><span className="text-muted-foreground">Dept:</span> {suggestion.department || "N/A"}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Award Type <span className="text-[10px] text-muted-foreground font-normal">/ पुरस्कार प्रकार</span></Label>
              <Select value={awardType} onValueChange={v => setAwardType(v as "cash" | "certificate")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash Award / नकद पुरस्कार (Quantifiable / मापनीय)</SelectItem>
                  <SelectItem value="certificate">Certificate / प्रमाण-पत्र (Non-Quantifiable / गैर-मापनीय)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {awardType === "cash" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Award Amount (₹) <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ पुरस्कार राशि</span></Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8" type="number" min="0" placeholder="e.g. 2500" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Award Note <span className="text-[10px] text-muted-foreground font-normal">/ पुरस्कार टिप्पणी</span></Label>
                <Input placeholder="e.g. Certificate of Excellence" value={awardNote} onChange={e => setAwardNote(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Remarks <span className="text-[10px] text-muted-foreground font-normal">/ {t("Other Info")}</span></Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any additional remarks..." rows={2} />
          </div>

          {processed && (
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-start gap-2 text-xs">
              <span className="text-primary font-medium">✓ Award processed successfully for {selectedSuggNo}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="gap-1.5" onClick={handleProcess} disabled={processed || !selectedSuggNo}>
              Process Award / पुरस्कार दें
            </Button>
            {suggestion && (
              <Button variant="outline" className="gap-1.5" onClick={() => setRecordSheetOpen(true)}>
                <FileText className="h-3.5 w-3.5" /> Record Sheet
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Award History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Award History / पुरस्कार इतिहास</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={searchLog} onChange={e => setSearchLog(e.target.value)} />
            </div>
            {awardLog.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={handleExport}><Download className="h-3 w-3" /> Export</Button>
            )}
          </div>
        </div>
        <Card className="card-shadow">
          <CardContent className="pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Suggestion" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Employee" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Award / पुरस्कार</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Date" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Audit ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">No records</td></tr>
                ) : filteredLog.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <p className="font-mono text-xs">{r.suggNo}</p>
                    </td>
                    <td className="py-2 px-2 text-xs">{r.empName}</td>
                    <td className="py-2 px-2 text-xs">{r.dept}</td>
                    <td className="py-2 px-2 text-xs">
                      <p className="font-medium">{r.type}</p>
                      {r.amount && <p className="text-green-600 font-semibold">₹{r.amount.toLocaleString("en-IN")}</p>}
                      {r.note && <p className="text-muted-foreground">{r.note}</p>}
                    </td>
                    <td className="py-2 px-2 text-xs">{r.date}</td>
                    <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{r.auditId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Record Sheet Dialog */}
      <Dialog open={recordSheetOpen} onOpenChange={setRecordSheetOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Record Sheet / अभिलेख पत्रक
            </DialogTitle>
          </DialogHeader>
          {suggestion && (
            <div className="space-y-3 text-sm">
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-xs text-primary uppercase">Suggestion Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Suggestion No:</span> <span className="font-mono font-semibold">{suggestion.suggestionNo}</span></div>
                  <div><span className="text-muted-foreground">Date:</span> {suggestion.date}</div>
                  <div><span className="text-muted-foreground">Category:</span> {suggestion.category}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px]">{suggestion.status}</Badge></div>
                  <div><span className="text-muted-foreground">Department:</span> {suggestion.department}</div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-xs text-primary uppercase">Employee Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Name:</span> {suggestion.employeeName}</div>
                  <div><span className="text-muted-foreground">Emp No:</span> {suggestion.employeeNo}</div>
                </div>
                {(suggestion.formData?.coSuggestors as any[])?.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Co-Suggestors:</span>{" "}
                    {(suggestion.formData.coSuggestors as any[]).map((c: any) => c.name || c.empNo).join(", ")}
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-xs text-primary uppercase">Improvement Summary</h4>
                <div className="text-xs space-y-1.5">
                  <div><span className="text-muted-foreground">Present Method:</span> <p className="mt-0.5">{suggestion.presentMethod || "—"}</p></div>
                  <div><span className="text-muted-foreground">Proposed Method:</span> <p className="mt-0.5">{suggestion.proposedMethod || "—"}</p></div>
                  <div><span className="text-muted-foreground">Expected Benefits:</span> <p className="mt-0.5">{suggestion.benefits || "—"}</p></div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-xs text-primary uppercase">Workflow Trail</h4>
                <div className="text-xs space-y-1">
                  {suggestion.formData?.feasibilityApprovedBy && (
                    <p>✓ Feasibility: {suggestion.formData.feasibilityApprovedByName as string} ({suggestion.formData.feasibilityApprovedOn as string})</p>
                  )}
                  {suggestion.formData?.opinionApprovedBy && (
                    <p>✓ Opinion: {suggestion.formData.opinionApprovedByName as string} ({suggestion.formData.opinionApprovedOn as string})</p>
                  )}
                  {suggestion.formData?.implementedBy && (
                    <p>✓ Implementation: {suggestion.formData.implementedByName as string}</p>
                  )}
                  {suggestion.formData?.evaluatedBy && (
                    <p>✓ Evaluation: {suggestion.formData.evaluatedByName as string} ({suggestion.formData.evaluatedOn as string})</p>
                  )}
                  {suggestion.formData?.awardApprovedBy && (
                    <p>✓ Award: {suggestion.formData.awardApprovedByName as string} ({suggestion.formData.awardApprovedOn as string})</p>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-xs text-primary uppercase">Award Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Award Type:</span> {awardType === "cash" ? "Cash / नकद" : "Certificate / प्रमाण-पत्र"}</div>
                  {awardType === "cash" && <div><span className="text-muted-foreground">Amount:</span> ₹{amount || suggestion.awardAmount || "—"}</div>}
                  {awardType === "certificate" && awardNote && <div><span className="text-muted-foreground">Note:</span> {awardNote}</div>}
                  <div><span className="text-muted-foreground">Award Date:</span> {suggestion.awardDate || new Date().toISOString().slice(0, 10)}</div>
                  {suggestion.formData?.savingsAmount && (
                    <div><span className="text-muted-foreground">Annual Savings:</span> ₹{String(suggestion.formData.savingsAmount)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setRecordSheetOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JaPAwardManagement;
