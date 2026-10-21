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
    <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base text-text-primary transition-colors hover:bg-surface-muted lg:min-h-9 lg:text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-accent"
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
            className={`flex h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
              checked
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary"
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
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
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
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
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
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
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
          className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] ${
            activeCount > 0
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border bg-surface text-text-primary"
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
          className="sheet m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl border-0 bg-surface p-0 text-text-primary backdrop:bg-text-primary/40"
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, top: "auto" }}
          aria-label="Filter produk"
        >
          <div className="px-6 pt-2">
            <span className="mx-auto block h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-semibold">Filter</h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Tutup filter"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(85dvh-9rem)] overflow-y-auto px-6 pt-5 pb-6">
            <div>
              <FilterGroups {...props} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
              className="h-11 rounded-full bg-accent px-8 text-sm font-medium text-white transition-colors hover:bg-accent-strong active:scale-[0.98]"
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
