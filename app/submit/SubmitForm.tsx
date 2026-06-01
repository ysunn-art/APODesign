"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export default function SubmitForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("ui_ux");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setImageFile(f: File) {
    // Keep the original File for upload (preserves exact bytes).
    // Only create a typed Blob for the preview URL — clipboard items sometimes
    // have no MIME type, which prevents <img> from displaying them.
    const previewBlob = f.type.startsWith("image/")
      ? f
      : new Blob([f], { type: "image/png" });
    setFile(f);
    setPreview(URL.createObjectURL(previewBlob));
    setError(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f) setImageFile(f);
    else { setFile(null); setPreview(null); }
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const f = imageItem.getAsFile();
      if (f) setImageFile(f);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose an image");
      return;
    }
    setError(null);
    setLoading(true);

    const form = new FormData();
    form.append("image", file);
    form.append("title", title);
    form.append("description", description);
    form.append("category", category);
    if (author.trim()) form.append("author", author.trim());

    try {
      const res = await fetch("/api/submissions", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Submission failed");
        setLoading(false);
        return;
      }
      router.push(`/submission/${json.submission.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Image *</label>
        {preview ? (
          <div className="relative mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="block w-full max-h-72 rounded border border-neutral-200 dark:border-neutral-800 object-contain bg-neutral-50 dark:bg-neutral-900" />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); }}
              className="mt-2 text-xs text-neutral-500 hover:text-red-500 transition"
            >
              Remove image
            </button>
          </div>
        ) : (
          <div className="mt-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Paste an image <kbd className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-xs font-mono">⌘V</kbd>
            </p>
            <p className="text-xs text-neutral-400">or</p>
            <label className="cursor-pointer rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
              Browse file
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-neutral-400">JPEG, PNG, WebP, or GIF · max 10 MB</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          required
          placeholder="e.g. The parking meter from hell"
          className="block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What makes this bad? Where did you find it?"
          className="block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Category *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {category === "gix" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Author <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={100}
            placeholder="e.g. Team Roboarm · GIX 2026"
            className="block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-400 mt-1">Who made this design? Team name, project, or person.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
      >
        {loading ? "Roasting…" : "Submit for roasting"}
      </button>
    </form>
  );
}
