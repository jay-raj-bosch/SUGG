// JaP — BPS Settings (Input Method Control)
// BPS admins can activate/deactivate input methods for suggestion submission.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings2, Mic, Keyboard, Paperclip, Save } from "lucide-react";
import { getInputMethodSettings, saveInputMethodSettings, type InputMethodSettings } from "@/lib/jap/inputMethodStore";
import { useAuth } from "@/contexts/AuthContext";

const BpsSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<InputMethodSettings>(getInputMethodSettings);

  const isBps = user?.japRole === "bps";

  const toggle = (key: keyof InputMethodSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allDisabled = !settings.typingEnabled && !settings.voiceEnabled && !settings.fileUploadEnabled;

  const handleSave = () => {
    if (allDisabled) {
      toast.error("At least one input method must remain enabled / कम से कम एक इनपुट विधि सक्रिय रहनी चाहिए");
      return;
    }
    saveInputMethodSettings(settings);
    toast.success("Input method settings saved / इनपुट विधि सेटिंग्स सहेजी गईं");
  };

  if (!isBps) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Only BPS admins can access input method settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            BPS Settings <span className="text-sm font-normal text-muted-foreground">/ बीपीएस सेटिंग्स</span>
          </h2>
          <p className="text-xs text-muted-foreground">Control input methods available for suggestion submission</p>
        </div>
      </div>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Input Method Control / इनपुट विधि नियंत्रण</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Keyboard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium">Typing / टाइपिंग</Label>
                <p className="text-[10px] text-muted-foreground">Standard keyboard text input</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.typingEnabled ? "default" : "secondary"} className="text-[10px]">
                {settings.typingEnabled ? "Active" : "Disabled"}
              </Badge>
              <Switch checked={settings.typingEnabled} onCheckedChange={() => toggle("typingEnabled")} />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium">Voice Input / वॉइस इनपुट</Label>
                <p className="text-[10px] text-muted-foreground">Speech-to-text with auto-translation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.voiceEnabled ? "default" : "secondary"} className="text-[10px]">
                {settings.voiceEnabled ? "Active" : "Disabled"}
              </Badge>
              <Switch checked={settings.voiceEnabled} onCheckedChange={() => toggle("voiceEnabled")} />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Paperclip className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium">File Upload / फ़ाइल अपलोड</Label>
                <p className="text-[10px] text-muted-foreground">Photos and document attachments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.fileUploadEnabled ? "default" : "secondary"} className="text-[10px]">
                {settings.fileUploadEnabled ? "Active" : "Disabled"}
              </Badge>
              <Switch checked={settings.fileUploadEnabled} onCheckedChange={() => toggle("fileUploadEnabled")} />
            </div>
          </div>

          {allDisabled && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 mt-2">
              ⚠ At least one input method must remain enabled — employees won't be able to submit suggestions.
            </p>
          )}

          <Button onClick={handleSave} disabled={allDisabled} className="gap-1.5 w-full mt-2">
            <Save className="h-3.5 w-3.5" /> Save Settings / सेटिंग्स सहेजें
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BpsSettings;
