"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type DraftSubmission,
} from "@/lib/types";

type Step = "upload" | "processing" | "review";

interface EditState {
  draft: DraftSubmission;
  selected: boolean;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "processing", label: "Processing" },
  { id: "review", label: "Review & Publish" },
];

const StepBar = ({ active }: { active: Step }) => (
  <div className="flex items-center gap-1 mb-8 font-mono text-[11px] uppercase tracking-[0.14em]">
    {STEPS.map(({ id, label }, i) => (
      <div key={id} className="flex items-center gap-1">
        <span
          className={`px-3 py-1 rounded-full ${
            id === active
              ? "bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900"
              : "text-ink-400 dark:text-ink-500"
          }`}
        >
          {i + 1}. {label}
        </span>
        {i < STEPS.length - 1 && (
          <span className="h-px w-4 bg-ink-200 dark:bg-ink-800" />
        )}
      </div>
    ))}
  </div>
);

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [edits, setEdits] = useState<EditState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    published: number;
    errors: string[];
  } | null>(null);
  const [publishing, setPublishing] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 20 * 1024 * 1024) {
      setError("File exceeds the 20 MB limit.");
      setFile(null);
      return;
    }
    setFile(f);
    setError(null);
  }

  async function handleProcess() {
    if (!file) return;
    setError(null);
    setStep("processing");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/moderation/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Processing failed");
        setStep("upload");
        return;
      }
      const drafts: DraftSubmission[] = data.drafts;
      setEdits(drafts.map((d) => ({ draft: d, selected: d.confidence >= 0.4 })));
      setStep("review");
    } catch {
      setError("Network error — please try again.");
      setStep("upload");
    }
  }

  function updateDraft(index: number, patch: Partial<DraftSubmission>) {
    setEdits((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, draft: { ...e.draft, ...patch } } : e
      )
    );
  }

  function toggleSelect(index: number) {
    setEdits((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  }

  function selectAll() {
    setEdits((prev) => prev.map((e) => ({ ...e, selected: true })));
  }

  async function handlePublish() {
    const approved = edits.filter((e) => e.selected).map((e) => e.draft);
    if (approved.length === 0) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/moderation/import/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: approved }),
      });
      const data = await res.json();
      setPublishResult(data);
    } catch {
      setError("Network error — publish failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const selectedCount = edits.filter((e) => e.selected).length;

  // ── Success screen ────────────────────────────────────────────────────
  if (publishResult) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="eyebrow mb-3">Done</p>
        <h1 className="text-4xl font-medium tracking-tight text-ink-900 dark:text-ink-50 mb-4">
          {publishResult.published} submission{publishResult.published !== 1 ? "s" : ""} published
        </h1>
        {publishResult.errors.length > 0 && (
          <div className="text-left text-sm text-red-600 dark:text-red-400 mb-6 border border-red-200 dark:border-red-900 rounded-xl p-4">
            <p className="font-medium mb-1">
              {publishResult.errors.length} failed:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {publishResult.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          View Gallery →
        </button>
      </div>
    );
  }

  // ── Upload step ───────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="max-w-xl mx-auto py-10">
        <StepBar active="upload" />
        <h1 className="text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50 mb-2">
          Import from PDF
        </h1>
        <p className="text-ink-500 dark:text-ink-400 mb-8">
          Upload a PDF to extract each page as a design submission. Max 20 pages · 20 MB.
        </p>

        <div
          className="border-2 border-dashed border-ink-300 dark:border-ink-700 rounded-bento p-12 text-center cursor-pointer hover:border-ink-600 dark:hover:border-ink-400 transition"
          onClick={() => fileRef.current?.click()}
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={(ev) => {
            ev.preventDefault();
            const f = ev.dataTransfer.files?.[0] ?? null;
            if (f) { setFile(f); setError(null); }
          }}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-ink-900 dark:text-ink-50 mb-1">
            {file ? file.name : "Drop your PDF here"}
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : "or click to browse · PDF only"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleProcess}
            disabled={!file}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition"
          >
            Process PDF →
          </button>
        </div>
      </div>
    );
  }

  // ── Processing step ───────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="max-w-xl mx-auto py-10">
        <StepBar active="processing" />
        <div className="text-center py-16">
          <p className="eyebrow mb-6">Analyzing designs</p>
          <div className="h-1.5 w-full rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden mb-4">
            <div className="h-full rounded-full bg-ink-900 dark:bg-ink-50 animate-pulse w-1/2" />
          </div>
          <p className="text-sm font-mono text-ink-500 dark:text-ink-400">
            Running AI roast pipeline…
          </p>
        </div>
      </div>
    );
  }

  // ── Review step ───────────────────────────────────────────────────────
  return (
    <div className="py-10">
      <StepBar active="review" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50">
            Review Drafts
          </h1>
          <p className="text-ink-500 dark:text-ink-400 mt-1 font-mono text-[12px] uppercase tracking-[0.12em]">
            {edits.length} pages · {selectedCount} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="text-[13px] px-4 py-2 rounded-full border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-900 transition"
          >
            Select All
          </button>
          <button
            onClick={handlePublish}
            disabled={selectedCount === 0 || publishing}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition"
          >
            {publishing ? "Publishing…" : `Publish Selected (${selectedCount})`}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="space-y-4">
        {edits.map((e, i) => {
          const isLowConfidence = e.draft.confidence < 0.4;
          return (
            <div
              key={e.draft.pageNumber}
              className={`border rounded-bento p-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 transition-colors ${
                e.selected
                  ? "border-ink-900 dark:border-ink-100"
                  : "border-ink-200 dark:border-ink-800 opacity-50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.draft.imageBase64}
                alt={`Page ${e.draft.pageNumber}`}
                className="w-full aspect-[4/3] object-cover rounded-xl bg-ink-100 dark:bg-ink-900"
              />
              <div className="flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={e.selected}
                      onChange={() => toggleSelect(i)}
                      className="w-4 h-4"
                    />
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${
                        isLowConfidence
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {isLowConfidence
                        ? `⚠ Confidence ${e.draft.confidence.toFixed(2)} — likely not a design`
                        : `✓ Confidence ${e.draft.confidence.toFixed(2)}`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-ink-500 dark:text-ink-400">
                    Score {e.draft.poop_score}/10
                  </span>
                </div>

                {/* Title */}
                <input
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-500"
                  placeholder="Title"
                  value={e.draft.title}
                  onChange={(ev) => updateDraft(i, { title: ev.target.value })}
                />

                {/* Category + Score row */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-500"
                    value={e.draft.category}
                    onChange={(ev) =>
                      updateDraft(i, { category: ev.target.value as Category })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-16 rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ink-500"
                    value={e.draft.poop_score}
                    onChange={(ev) =>
                      updateDraft(i, { poop_score: Number(ev.target.value) })
                    }
                  />
                </div>

                {/* Roast text */}
                <textarea
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ink-500"
                  rows={3}
                  placeholder="Roast text"
                  value={e.draft.roast_text}
                  onChange={(ev) =>
                    updateDraft(i, { roast_text: ev.target.value })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
