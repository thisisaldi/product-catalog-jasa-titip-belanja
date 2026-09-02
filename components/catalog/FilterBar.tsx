"use client";

import { useRef, useState } from "react";
import type { Brand, Category } from "@/lib/catalog/types";
import { SlidersIcon, CloseIcon } from "@/components/shared/icons";
import { FilterDropdown } from "./FilterDropdown";

export type Availability = "all" | "available" | "sold-out";

type FilterBarProps = {
  categories: Category[];
  brands: Brand[];
  selectedCategories: string[];
  selectedBrands: string[];
  availability: Availability;
  onToggleCategory: (slug: string) => void;
  onToggleBrand: (slug: string) => void;
  onAvailabilityChange: (value: Availability) => void;
  onClearAll: () => void;
};

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "available", label: "Tersedia" },
  { value: "sold-out", label: "Stok Habis" },
];

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 py-1.5 text-base text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
      />
      {label}
    </label>
  );
}

function AvailabilityPills({
  value,
  onChange,
}: {
  value: Availability;
  onChange: (value: Availability) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Ketersediaan" className="flex flex-wrap gap-2">
      {availabilityOptions.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors ${
              checked
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-text-secondary hover:border-accent/50"
            }`}
          >
            <input
              type="radio"
              name="availability"
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function FilterGroups(props: FilterBarProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-sm font-medium uppercase tracking-wide text-text-secondary">
          Kategori
        </p>
        {props.categories.map((category) => (
          <CheckboxRow
            key={category.id}
            label={category.name}
            checked={props.selectedCategories.includes(category.slug)}
            onChange={() => props.onToggleCategory(category.slug)}
          />
        ))}
      </div>
      <div>
        <p className="mb-1 text-sm font-medium uppercase tracking-wide text-text-secondary">
          Merek
        </p>
        {props.brands.map((brand) => (
          <CheckboxRow
            key={brand.id}
            label={brand.name}
            checked={props.selectedBrands.includes(brand.slug)}
            onChange={() => props.onToggleBrand(brand.slug)}
          />
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-secondary">
          Ketersediaan
        </p>
        <AvailabilityPills value={props.availability} onChange={props.onAvailabilityChange} />
      </div>
    </div>
  );
}

export function FilterBar(props: FilterBarProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Shared open-id: only one desktop dropdown can be open at a time
  // (Milestone 5 — replaces independent, non-coordinating <details> elements).
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const activeCount =
    props.selectedCategories.length +
    props.selectedBrands.length +
    (props.availability !== "all" ? 1 : 0);

  return (
    <div className="border-b border-border pb-5">
      {/* Mobile: single trigger opening a bottom sheet (native <dialog> gives us
          focus trap + Esc-to-close + backdrop for free — 03 Section 2.4). */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium ${
            activeCount > 0
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-text-primary"
          }`}
        >
          <SlidersIcon className="h-4 w-4" />
          Filter{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        <dialog
          ref={dialogRef}
          onClick={(e) => {
            if (e.target === dialogRef.current) dialogRef.current?.close();
          }}
          className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl border-0 p-0 backdrop:bg-black/40"
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, top: "auto" }}
          aria-label="Filter produk"
        >
          <div className="relative flex items-center justify-between border-b border-border px-6 pt-4 pb-2">
            <span className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Tutup filter"
              className="absolute right-4 top-4 text-text-secondary"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[calc(85dvh-8rem)] overflow-y-auto px-6 pt-4 pb-6">
            <h2 className="text-lg font-semibold">Filter</h2>
            <div className="mt-4">
              <FilterGroups {...props} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={props.onClearAll}
              className="text-sm text-text-secondary underline-offset-2 hover:underline"
            >
              Hapus semua
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white"
            >
              Terapkan
            </button>
          </div>
        </dialog>
      </div>

      {/* Desktop (>=1024px): inline row, mutually-exclusive dropdowns. */}
      <div className="hidden items-center gap-3 lg:flex">
        <FilterDropdown
          id="kategori"
          label="Kategori"
          activeCount={props.selectedCategories.length}
          openId={openDropdown}
          onOpenChange={setOpenDropdown}
        >
          {props.categories.map((category) => (
            <CheckboxRow
              key={category.id}
              label={category.name}
              checked={props.selectedCategories.includes(category.slug)}
              onChange={() => props.onToggleCategory(category.slug)}
            />
          ))}
        </FilterDropdown>

        <FilterDropdown
          id="merek"
          label="Merek"
          activeCount={props.selectedBrands.length}
          openId={openDropdown}
          onOpenChange={setOpenDropdown}
        >
          {props.brands.map((brand) => (
            <CheckboxRow
              key={brand.id}
              label={brand.name}
              checked={props.selectedBrands.includes(brand.slug)}
              onChange={() => props.onToggleBrand(brand.slug)}
            />
          ))}
        </FilterDropdown>

        <AvailabilityPills value={props.availability} onChange={props.onAvailabilityChange} />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={props.onClearAll}
            className="text-sm text-text-secondary underline-offset-2 hover:underline"
          >
            Hapus semua
          </button>
        )}
      </div>
    </div>
  );
}
