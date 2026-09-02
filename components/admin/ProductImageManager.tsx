"use client";

import { useRef, useState, useTransition } from "react";
import type { AdminProductImage } from "@/lib/admin/types";
import {
  addExampleImages,
  deleteProductImage,
  replaceProductImage,
  reorderProductImages,
  setPrimaryImage,
  uploadProductImage,
} from "@/lib/admin/actions/images";

const MAX_IMAGES = 5;

export function ProductImageManager({
  productId,
  categorySlug,
  initialImages,
}: {
  productId: string;
  categorySlug: string;
  initialImages: AdminProductImage[];
}) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.location.reload();
    });
  }

  function handleReplace(imageId: string, file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await replaceProductImage(imageId, productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleDelete(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductImage(imageId, productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    });
  }

  function handleSetPrimary(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPrimaryImage(imageId, productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })));
    });
  }

  function handleAddExamples() {
    setError(null);
    startTransition(async () => {
      const result = await addExampleImages(productId, categorySlug);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    startTransition(async () => {
      const result = await reorderProductImages(productId, next.map((img) => img.id));
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <h2 className="text-base font-semibold">Gambar Produk</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Maksimal {MAX_IMAGES} gambar. Format JPEG, PNG, atau WEBP, maksimal 5MB.
      </p>

      {error && <p className="mt-2 text-sm text-sold-out">{error}</p>}

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {images.map((image, index) => (
          <li key={image.id} className="flex flex-col gap-1">
            <div className="relative overflow-hidden rounded-md border border-border">
              {/* Plain <img>, not next/image: Storage host varies per environment. */}
              <img src={image.url} alt={image.altText ?? ""} className="aspect-[4/5] w-full object-cover" />
              {image.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Utama
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              <button
                type="button"
                disabled={isPending || index === 0}
                onClick={() => move(index, -1)}
                className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={isPending || index === images.length - 1}
                onClick={() => move(index, 1)}
                className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40"
              >
                ↓
              </button>
              {!image.isPrimary && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSetPrimary(image.id)}
                  className="rounded border border-border px-1.5 py-0.5"
                >
                  Jadikan utama
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setReplacingId(image.id);
                  replaceInputRef.current?.click();
                }}
                className="rounded border border-border px-1.5 py-0.5"
              >
                Ganti
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(image.id)}
                className="rounded border border-sold-out px-1.5 py-0.5 text-sold-out"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replacingId) handleReplace(replacingId, file);
          e.target.value = "";
        }}
      />

      {images.length < MAX_IMAGES && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={handleUpload} className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {isPending ? "Mengunggah..." : "Unggah Gambar"}
            </button>
          </form>
          <button
            type="button"
            disabled={isPending}
            onClick={handleAddExamples}
            className="rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-text-secondary disabled:opacity-60"
            title="Isi dengan foto contoh sementara — bukan foto produk asli klien"
          >
            {isPending ? "Memuat..." : "+ Gambar Contoh (dev)"}
          </button>
        </div>
      )}
    </div>
  );
}
