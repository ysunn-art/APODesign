"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export default function SubmitForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("ui_ux");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

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
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFileChange}
          required
          className="block w-full text-sm"
        />
        {preview && (
          <img src={preview} alt="preview" className="mt-3 max-h-72 rounded border border-neutral-200 dark:border-neutral-800" />
        )}
        <p className="text-xs text-neutral-500 mt-1">JPEG, PNG, WebP, or GIF. Max 10MB.</p>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand text-white px-4 py-2 hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Roasting…" : "Submit for roasting"}
      </button>
    </form>
  );
}
