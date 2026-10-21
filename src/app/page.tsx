"use client";

import React, { useEffect, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { TodayView } from "@/components/views/TodayView";
import { PlanView } from "@/components/views/PlanView";
import { SubjectsView } from "@/components/views/SubjectsView";
import { PyqView } from "@/components/views/PyqView";
import { MocksView } from "@/components/views/MocksView";
import { ReviewView } from "@/components/views/ReviewView";
import { AttendanceView } from "@/components/views/AttendanceView";
import { SettingsView } from "@/components/views/SettingsView";
import { AppStateData, fetchAppState } from "@/lib/api";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState("today");
  const [appState, setAppState] = useState<AppStateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const data = await fetchAppState();
      setAppState(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to StudyOS engine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-mono text-xs">
        <div className="space-y-2 text-center">
          <div className="font-bold tracking-widest uppercase">STUDYOS</div>
          <div className="text-muted-light dark:text-muted-dark animate-pulse">
            Initializing deterministic scheduler...
          </div>
        </div>
      </div>
    );
  }

  if (error || !appState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 text-xs font-mono">
        <div className="max-w-md w-full p-6 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-4 text-center">
          <div className="font-bold text-sm text-red-600 dark:text-red-400">Connection Failure</div>
          <p className="text-muted-light dark:text-muted-dark leading-relaxed">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium text-xs hover:opacity-90"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <Shell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      appState={appState}
      onRefresh={loadData}
    >
      {currentTab === "today" && (
        <TodayView
          appState={appState}
          onRefresh={loadData}
          onNavigate={(tab) => setCurrentTab(tab)}
        />
      )}
      {currentTab === "plan" && <PlanView appState={appState} onRefresh={loadData} />}
      {currentTab === "subjects" && <SubjectsView appState={appState} onRefresh={loadData} />}
      {currentTab === "pyqs" && <PyqView appState={appState} onRefresh={loadData} />}
      {currentTab === "mocks" && <MocksView appState={appState} onRefresh={loadData} />}
      {currentTab === "review" && <ReviewView appState={appState} onRefresh={loadData} />}
      {currentTab === "attendance" && <AttendanceView appState={appState} onRefresh={loadData} />}
      {currentTab === "settings" && <SettingsView appState={appState} onRefresh={loadData} />}
    </Shell>
  );
}
