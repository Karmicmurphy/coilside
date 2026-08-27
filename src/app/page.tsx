"use client";

import { type ReactNode } from "react";
import { useNav, type Screen } from "@/lib/nav";
import { HomeScreen } from "@/screens/home-screen";
import { WorkScreen, WorkHistoryScreen } from "@/screens/work-screen";
import { ServiceCallScreen } from "@/screens/service-call-screen";
import { CapacitorScreen } from "@/screens/capacitor-screen";
import { ContactorScreen } from "@/screens/contactor-screen";
import { ThermostatScreen } from "@/screens/thermostat-screen";
import { RefrigerantScreen } from "@/screens/refrigerant-screen";
import { IndoorCoilScreen } from "@/screens/indoor-coil-screen";
import { OtherScreen } from "@/screens/other-screen";
import { AnnualServiceScreen } from "@/screens/annual-service-screen";
import { FieldGuideScreen } from "@/screens/field-guide-screen";
import { FieldLogScreen } from "@/screens/field-log-screen";
import { NoteNewScreen, NotesListScreen } from "@/screens/notes-screen";
import { BeforeILeaveScreen } from "@/screens/before-i-leave-screen";
import { InstallsScreen, InstallDetailScreen } from "@/screens/installs-screen";
import { SettingsScreen } from "@/screens/settings-screen";
import { SeanFactorScreen } from "@/screens/sean-factor-screen";
import { SeanNoteNewScreen, SeanNotesList } from "@/screens/sean-notes-screen";
import { SeanQuoteNewScreen, SeanQuotesList } from "@/screens/sean-quotes-screen";
import { MyPhotosScreen, PhotoDetailScreen } from "@/screens/my-photos-screen";
import { ActiveTimerBanner } from "@/components/active-timer-banner";
import { VoiceHoursCapture } from "@/components/voice-hours-capture";
import { Settings, ClipboardList, Flame } from "lucide-react";

function renderScreen(current: Screen): ReactNode {
  switch (current) {
    case "home": return <HomeScreen />;
    case "work": return <><div className="p-4 pb-0"><VoiceHoursCapture /></div><WorkScreen /></>;
    case "work-history": return <WorkHistoryScreen />;
    case "service-call": return <ServiceCallScreen />;
    case "service-capacitor": return <CapacitorScreen />;
    case "service-contactor": return <ContactorScreen />;
    case "service-thermostat": return <ThermostatScreen />;
    case "service-refrigerant": return <RefrigerantScreen />;
    case "service-indoor-coil": return <IndoorCoilScreen />;
    case "service-other": return <OtherScreen />;
    case "annual-service": return <AnnualServiceScreen />;
    case "field-guide":
    case "field-guide-list":
      return <FieldGuideScreen />;
    case "field-log": return <FieldLogScreen />;
    case "notes": return <NotesListScreen />;
    case "note-new": return <NoteNewScreen />;
    case "before-i-leave": return <BeforeILeaveScreen />;
    case "installs": return <InstallsScreen />;
    case "install-detail": return <InstallDetailScreen />;
    case "settings": return <SettingsScreen />;
    case "sean-factor": return <SeanFactorScreen />;
    case "sean-notes": return <SeanNotesList />;
    case "sean-note-new": return <SeanNoteNewScreen />;
    case "sean-quotes": return <SeanQuotesList />;
    case "sean-quote-new": return <SeanQuoteNewScreen />;
    case "my-photos": return <MyPhotosScreen />;
    case "photo-detail": return <PhotoDetailScreen />;
    default: return <HomeScreen />;
  }
}

export default function Page() {
  const current = useNav((s) => s.current);
  const go = useNav((s) => s.go);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-md bg-background">
      {current === "home" && (
        <div className="fixed left-0 right-0 top-0 z-20 mx-auto flex max-w-md items-center justify-end gap-2 p-3 [padding-top:max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={() => go("sean-factor")} aria-label="The Sean Factor" className="tap-lg flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 backdrop-blur"><Flame size={18} /></button>
          <button onClick={() => go("notes")} aria-label="Notes" className="tap-lg flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/80 text-foreground backdrop-blur"><ClipboardList size={18} /></button>
          <button onClick={() => go("settings")} aria-label="Settings" className="tap-lg flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/80 text-foreground backdrop-blur"><Settings size={18} /></button>
        </div>
      )}
      <main className="min-h-dvh">{renderScreen(current)}</main>
      <ActiveTimerBanner />
    </div>
  );
}
