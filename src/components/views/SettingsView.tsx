"use client";

import React, { useState } from "react";
import {
  Settings,
  Download,
  Upload,
  Sparkles,
  Shield,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { AppStateData, askGeminiAssistant } from "@/lib/api";

interface SettingsViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function SettingsView({ appState, onRefresh }: SettingsViewProps) {
  const { profile } = appState;

  // Gemini assistant state
  const [aiQuery, setAiQuery] = useState("");
  const [aiModel, setAiModel] = useState("gemini-3.8-flash");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  // Import state
  const [importJsonText, setImportJsonText] = useState("");
  const [importDryRunResult, setImportDryRunResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleAskGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    try {
      setAiLoading(true);
      const res = await askGeminiAssistant(aiQuery.trim(), aiModel);
      setAiResponse(res);
    } catch (err: any) {
      alert(`AI Assistant Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDryRunImport = async () => {
    if (!importJsonText.trim()) {
      alert("Please paste the JSON backup payload first.");
      return;
    }

    try {
      setImportLoading(true);
      const parsed = JSON.parse(importJsonText);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, dryRun: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setImportDryRunResult(json);
    } catch (err: any) {
      alert(`Invalid JSON or schema error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!confirm("Are you sure you want to commit this import? Existing matching tasks will be reconciled.")) return;

    try {
      setImportLoading(true);
      const parsed = JSON.parse(importJsonText);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, dryRun: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert("Import completed successfully!");
      setImportDryRunResult(null);
      setImportJsonText("");
      onRefresh();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Settings & Integrations</h1>
        <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
          Provisional exam dates &bull; Gemini AI study assistant &bull; Schema-versioned backup & export
        </p>
      </div>

      {/* Profile & Target Parameters Card */}
      <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-3 text-xs">
        <div className="font-semibold text-xs uppercase tracking-wider pb-1 border-b border-hairline">
          Academic Profile Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-muted-light dark:text-muted-dark block text-[11px]">Provisional Exam Date</span>
            <span className="font-mono font-semibold">{profile.targetExamDate} (GATE DA 2027)</span>
          </div>
          <div>
            <span className="text-muted-light dark:text-muted-dark block text-[11px]">Historical Self-Reported Baseline</span>
            <span className="font-mono font-semibold">{profile.historicalBaselineScore} / 100 (GATE DA 2026)</span>
          </div>
          <div>
            <span className="text-muted-light dark:text-muted-dark block text-[11px]">Aspirational Target</span>
            <span className="font-mono font-semibold">{profile.targetScore}+ Marks (AIR &lt;100 target)</span>
          </div>
        </div>
      </div>

      {/* AI STUDY ASSISTANT (Section 4.11) */}
      <div className="border border-hairline rounded p-4 bg-background space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black dark:text-white" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Gemini AI Study Assistant</h2>
            </div>
            <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
              Server-only proxy &bull; Grounded in verified database metrics &bull; Proposal-only workflow
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">
            Google Gemini API
          </span>
        </div>

        <form onSubmit={handleAskGemini} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="e.g. How can I optimize my December schedule to clear Probability & Stats backlog?"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="w-full p-2.5 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full p-2.5 border border-hairline rounded bg-transparent text-xs font-mono"
              >
                <option value="gemini-3.8-flash" className="bg-background">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-2.5-flash" className="bg-background">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash" className="bg-background">gemini-2.0-flash</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-light dark:text-muted-dark italic">
              AI suggestions may be wrong. Never predicts admissions or scores.
            </span>
            <button
              type="submit"
              disabled={aiLoading}
              className="px-4 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {aiLoading ? "Consulting Assistant..." : "Ask Assistant"}
            </button>
          </div>
        </form>

        {/* AI Response Display */}
        {aiResponse && (
          <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-3">
            <div className="flex items-center justify-between font-semibold text-xs">
              <span>Assistant Recommendation</span>
              <span className="text-[10px] font-mono text-muted-light dark:text-muted-dark">
                Model: {aiResponse.model || aiModel}
              </span>
            </div>

            <div className="space-y-1">
              <div className="font-medium text-[11px]">Analysis:</div>
              <p className="text-muted-light dark:text-muted-dark leading-relaxed">
                {aiResponse.data?.analysis}
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-medium text-[11px]">Feasibility Assessment:</div>
              <p className="text-muted-light dark:text-muted-dark leading-relaxed">
                {aiResponse.data?.feasibilityAssessment}
              </p>
            </div>

            {aiResponse.data?.recommendations?.length > 0 && (
              <div className="space-y-1">
                <div className="font-medium text-[11px]">Actionable Steps:</div>
                <ul className="list-disc pl-4 space-y-1 text-muted-light dark:text-muted-dark">
                  {aiResponse.data.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiResponse.data?.suggestedPriorities?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-hairline">
                <div className="font-medium text-[11px]">Proposed Priority Adjustments (Proposal Only):</div>
                <div className="space-y-1">
                  {aiResponse.data.suggestedPriorities.map((item: any, idx: number) => (
                    <div key={idx} className="p-2 border border-hairline rounded bg-background flex items-center justify-between">
                      <div>
                        <strong className="text-foreground">{item.taskTitle}</strong> &rarr; Priority {item.suggestedPriority}
                        <div className="text-[10px] text-muted-light dark:text-muted-dark">{item.rationale}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EXPORT & BACKUP SECTION (Section 4.10) */}
      <div className="border border-hairline rounded p-4 bg-background space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Data Export & Backup</h2>
            <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
              Download your complete canonical study records &bull; Excludes API secrets
            </p>
          </div>
          <Download className="w-4 h-4 text-muted-light dark:text-muted-dark" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/api/export?format=json"
            download="studyos-backup.json"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Backup</span>
          </a>

          <a
            href="/api/export?format=csv&type=tasks"
            download="studyos-tasks.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Tasks CSV</span>
          </a>

          <a
            href="/api/export?format=csv&type=mocks"
            download="studyos-mocks.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Mocks CSV</span>
          </a>

          <a
            href="/api/export?format=csv&type=sessions"
            download="studyos-sessions.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Sessions CSV</span>
          </a>
        </div>
      </div>

      {/* SAFE IMPORT SECTION (Section 4.10) */}
      <div className="border border-hairline rounded p-4 bg-background space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Safe Backup Import</h2>
            <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
              Dry-run validation &bull; Deduplication &bull; Explicit user confirmation
            </p>
          </div>
          <Upload className="w-4 h-4 text-muted-light dark:text-muted-dark" />
        </div>

        <textarea
          rows={4}
          placeholder="Paste JSON backup payload here..."
          value={importJsonText}
          onChange={(e) => setImportJsonText(e.target.value)}
          className="w-full p-2.5 border border-hairline rounded bg-transparent text-xs font-mono"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={handleDryRunImport}
            disabled={importLoading || !importJsonText.trim()}
            className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 font-medium disabled:opacity-50"
          >
            {importLoading ? "Validating..." : "Validate Dry Run"}
          </button>
        </div>

        {importDryRunResult && (
          <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-2">
            <div className="font-semibold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-black dark:text-white" />
              <span>Dry Run Analysis Successful</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div>Tasks: {importDryRunResult.analysis?.taskCount}</div>
              <div>Mocks: {importDryRunResult.analysis?.mockCount}</div>
              <div>Errors: {importDryRunResult.analysis?.errorCount}</div>
              <div>Sessions: {importDryRunResult.analysis?.sessionCount}</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <button
                onClick={() => setImportDryRunResult(null)}
                className="px-3 py-1 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitImport}
                className="px-4 py-1 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium"
              >
                Confirm & Overwrite Store
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
