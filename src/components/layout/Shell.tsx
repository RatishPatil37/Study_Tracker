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
    { id: "today", label: "Today", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400" },
    { id: "plan", label: "Plan", icon: Calendar, color: "text-blue-500 dark:text-blue-400" },
    { id: "subjects", label: "Subjects", icon: Layers, color: "text-violet-500 dark:text-violet-400" },
    { id: "pyqs", label: "PYQs", icon: HelpCircle, color: "text-amber-500 dark:text-amber-400" },
    { id: "mocks", label: "Mocks", icon: BookOpen, color: "text-rose-500 dark:text-rose-400" },
    { id: "review", label: "Review", icon: FileText, color: "text-indigo-500 dark:text-indigo-400" },
    { id: "attendance", label: "Attendance", icon: Clock, color: "text-teal-500 dark:text-teal-400" },
    { id: "settings", label: "Settings", icon: Settings, color: "text-zinc-500 dark:text-zinc-400" },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-neutral-800 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-hairline bg-surface-light dark:bg-surface-dark p-4 shrink-0 select-none">
        <div className="flex items-center justify-between pb-4 border-b border-hairline mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-bold tracking-wider text-sm">STUDYOS</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-muted-light dark:text-muted-dark">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Exam Countdown Badge */}
        <div className="mb-6 p-2.5 bg-background border border-hairline rounded text-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Target: GATE DA 2027</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
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
                    ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background shadow-xs"
                    : "text-muted-light dark:text-muted-dark hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-inherit" : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="pt-4 border-t border-hairline text-[11px] text-muted-light dark:text-muted-dark space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-teal-500" />
            <span>Asia/Kolkata</span>
          </div>
          <div>Baseline: 21 / 100 (Historical)</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-hairline px-3 sm:px-4 md:px-6 flex items-center justify-between bg-background sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -ml-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-[11px] sm:text-xs font-medium truncate">
              <span className="text-muted-light dark:text-muted-dark hidden xs:inline">Date: </span>
              <span className="tabular-nums font-semibold">{formatDisplayDateIST(todayStr)}</span>
            </div>
          </div>

          {/* Session Timer Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {appState?.activeSession ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-surface-light dark:bg-surface-dark border border-hairline rounded text-[11px] sm:text-xs font-mono shadow-2xs">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tabular-nums font-semibold">{formatTimer(sessionTimer)}</span>
                <button
                  onClick={handlePauseResume}
                  disabled={sessionLoading}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors text-amber-500"
                  title={isSessionRunning ? "Pause timer" : "Resume timer"}
                >
                  {isSessionRunning ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={sessionLoading}
                  className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded transition-colors text-rose-500"
                  title="End and record session"
                >
                  <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={sessionLoading}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-[11px] sm:text-xs font-medium hover:opacity-90 shadow-2xs transition-all"
              >
                <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                <span>Start Session</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Slide-Over Drawer with Backdrop */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[80vw] bg-surface-light dark:bg-surface-dark border-r border-hairline p-4 flex flex-col justify-between shadow-2xl z-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold tracking-wider text-sm">STUDYOS</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-muted-light dark:text-muted-dark">
                      v1.0.0
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Exam Countdown Badge */}
                <div className="p-2.5 bg-background border border-hairline rounded text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    <span>Target: GATE DA 2027</span>
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold tabular-nums">{daysRemaining} days</span>
                    <span className="text-[10px] text-muted-light dark:text-muted-dark">6 Feb 2027</span>
                  </div>
                </div>

                <nav className="space-y-1">
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                          active
                            ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background shadow-xs"
                            : "text-muted-light dark:text-muted-dark hover:bg-neutral-100 dark:hover:bg-neutral-900"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-inherit" : item.color}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-hairline text-[10px] text-muted-light dark:text-muted-dark space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-teal-500" />
                  <span>Timezone: Asia/Kolkata</span>
                </div>
                <div>Baseline: 21 / 100 (Historical)</div>
              </div>
            </div>
          </div>
        )}

        {/* Primary View Container */}
        <main className="flex-1 max-w-[1180px] w-full mx-auto p-3.5 sm:p-4 md:p-6 pb-24 md:pb-12">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Bar (5 Primary Touch Targets) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-hairline px-2 py-1 flex items-center justify-around select-none">
          {[
            { id: "today", label: "Today", icon: CheckCircle2, color: "text-emerald-500" },
            { id: "plan", label: "Plan", icon: Calendar, color: "text-blue-500" },
            { id: "mocks", label: "Mocks", icon: BookOpen, color: "text-rose-500" },
            { id: "review", label: "Review", icon: FileText, color: "text-indigo-500" },
            { id: "attendance", label: "Attend", icon: Clock, color: "text-teal-500" },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium transition-colors min-w-[54px] ${
                  active
                    ? "text-foreground font-bold"
                    : "text-muted-light dark:text-muted-dark hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${active ? `${item.color} stroke-[2.5]` : `${item.color} opacity-70 stroke-[1.5]`}`} />
                <span className="tracking-tight">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium text-muted-light dark:text-muted-dark hover:text-foreground min-w-[54px]"
          >
            <Menu className="w-4 h-4 mb-0.5 stroke-[1.5] text-zinc-500" />
            <span className="tracking-tight">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
