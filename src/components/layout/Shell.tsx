"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  BookOpen,
  HelpCircle,
  FileText,
  Settings,
  Sparkles,
  Menu,
  X,
  Play,
  Pause,
  Square,
  AlertTriangle,
} from "lucide-react";
import { AppStateData, controlSession } from "@/lib/api";
import { diffDaysIST, formatDisplayDateIST } from "@/domain/dates";

interface ShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  appState: AppStateData | null;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function Shell({
  currentTab,
  onTabChange,
  appState,
  onRefresh,
  children,
}: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<number>(0);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Sync active session timer
  useEffect(() => {
    if (!appState?.activeSession) {
      setIsSessionRunning(false);
      setSessionTimer(0);
      return;
    }

    const start = new Date(appState.activeSession.startAt).getTime();
    const paused = appState.activeSession.pausedSeconds || 0;
    const isPaused = Boolean(appState.activeSession.pausedAt);

    setIsSessionRunning(!isPaused);

    const updateTimer = () => {
      const now = isPaused && appState.activeSession.pausedAt
        ? new Date(appState.activeSession.pausedAt).getTime()
        : Date.now();
      const elapsed = Math.max(0, Math.floor((now - start) / 1000) - paused);
      setSessionTimer(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [appState?.activeSession]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartSession = async () => {
    try {
      setSessionLoading(true);
      await controlSession("start");
      onRefresh();
    } finally {
      setSessionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      setSessionLoading(true);
      if (isSessionRunning) {
        await controlSession("pause");
      } else {
        await controlSession("resume");
      }
      onRefresh();
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEndSession = async () => {
    try {
      setSessionLoading(true);
      await controlSession("end", { actualSeconds: sessionTimer });
      onRefresh();
    } finally {
      setSessionLoading(false);
    }
  };

  const todayStr = appState?.today || "2026-10-21";
  const examDateStr = appState?.profile?.targetExamDate || "2027-02-06";
  const daysRemaining = Math.max(0, diffDaysIST(todayStr, examDateStr));

  const navItems = [
    { id: "today", label: "Today", icon: CheckCircle2 },
    { id: "plan", label: "Plan", icon: Calendar },
    { id: "subjects", label: "Subjects", icon: Layers },
    { id: "pyqs", label: "PYQs", icon: HelpCircle },
    { id: "mocks", label: "Mocks", icon: BookOpen },
    { id: "review", label: "Review", icon: FileText },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-neutral-800 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-hairline bg-surface-light dark:bg-surface-dark p-4 shrink-0 select-none">
        <div className="flex items-center justify-between pb-4 border-b border-hairline mb-4">
          <div>
            <span className="font-bold tracking-wider text-sm">STUDYOS</span>
            <span className="ml-2 text-[10px] font-mono px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Exam Countdown Badge */}
        <div className="mb-6 p-2.5 bg-background border border-hairline rounded text-xs space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Target: GATE DA 2027
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold tabular-nums">{daysRemaining} days</span>
            <span className="text-[10px] text-muted-light dark:text-muted-dark">Provisional: 6 Feb</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  active
                    ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background"
                    : "text-muted-light dark:text-muted-dark hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="pt-4 border-t border-hairline text-[11px] text-muted-light dark:text-muted-dark space-y-1">
          <div>Timezone: Asia/Kolkata</div>
          <div>Baseline: 21 / 100 (Historical)</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-hairline px-4 md:px-6 flex items-center justify-between bg-background sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-xs font-medium">
              <span className="text-muted-light dark:text-muted-dark">Date: </span>
              <span className="tabular-nums font-semibold">{formatDisplayDateIST(todayStr)}</span>
            </div>
          </div>

          {/* Session Timer Controls */}
          <div className="flex items-center gap-2">
            {appState?.activeSession ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-light dark:bg-surface-dark border border-hairline rounded text-xs font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse" />
                <span className="tabular-nums font-semibold">{formatTimer(sessionTimer)}</span>
                <button
                  onClick={handlePauseResume}
                  disabled={sessionLoading}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
                  title={isSessionRunning ? "Pause timer" : "Resume timer"}
                >
                  {isSessionRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={sessionLoading}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-red-600 dark:text-red-400"
                  title="End and record session"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={sessionLoading}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-xs font-medium hover:opacity-90"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Session</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-hairline bg-surface-light dark:bg-surface-dark p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium ${
                    active
                      ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background"
                      : "text-muted-light dark:text-muted-dark hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Primary View Container */}
        <main className="flex-1 max-w-[1180px] w-full mx-auto p-4 md:p-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}
