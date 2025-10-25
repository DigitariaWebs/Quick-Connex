"use client";

import React, { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ExpandableSearchBarProps = {
  expandDirection?: "left" | "right";
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  defaultOpen?: boolean;
  width?: number;
};

const COLLAPSED_SIZE = 40;

export default function ExpandableSearchBar(props: ExpandableSearchBarProps) {
  const {
    expandDirection = "right",
    placeholder = "Search...",
    onSearch,
    className = "",
    defaultOpen = false,
    width = 280,
  } = props;

  const [open, setOpen] = useState(defaultOpen);
  const [value, setValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const inputPadding = "pl-4";
  const placeholderLeft = "left-4";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        !containerRef.current?.contains(e.target as Node) &&
        open &&
        value === ""
      ) {
        setOpen(false);
        setValue("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, value]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    } else {
      setValue("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        !containerRef.current?.contains(e.target as Node) &&
        open &&
        value === ""
      ) {
        setOpen(false);
        setValue("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, value]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    } else {
      setValue("");
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        setValue("");
      }

      if (e.key === "Enter" && open && value.trim()) {
        onSearch?.(value);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, value, onSearch]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      style={{ width: COLLAPSED_SIZE, height: COLLAPSED_SIZE }}
    >
      {/* Icon button (always visible, overlays left of bar) */}
      <button
        type="button"
        aria-label={open ? "Close search" : "Open search"}
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "absolute inset-0 z-20 grid place-items-center rounded-full border",
          "bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-colors",
          "border-gray-200"
        )}
      >
        {open ? <X className="size-4" /> : <Search className="size-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className={cn(
              "absolute top-0 h-10 rounded-full border bg-white text-gray-900 shadow-sm overflow-hidden flex items-center",
              "border-gray-200 focus:outline-none focus:ring-0",
              expandDirection === "left" ? "right-0" : "left-0"
            )}
            style={{ outline: "none", WebkitAppearance: "none" }}
            initial={{ width: COLLAPSED_SIZE, opacity: 0.98 }}
            animate={{ width: width, opacity: 1 }}
            exit={{
              width: COLLAPSED_SIZE,
              opacity: 0,
              transition: { type: "spring", stiffness: 260, damping: 26 },
            }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="relative flex-1 min-w-0 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={cn(
                  "w-full bg-transparent text-sm outline-none placeholder-transparent whitespace-nowrap overflow-x-auto",
                  "focus:outline-none focus:ring-0 focus:border-transparent",
                  "focus-visible:outline-none focus-visible:ring-0",
                  inputPadding
                )}
                style={
                  {
                    outline: "none",
                    WebkitAppearance: "none",
                    WebkitTapHighlightColor: "transparent",
                    WebkitFocusRingColor: "transparent",
                    boxShadow: "none",
                  } as React.CSSProperties
                }
              />

              <AnimatePresence>
                {open && !value && (
                  <motion.span
                    key="ph"
                    className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 w-full truncate text-gray-500 text-sm select-none text-left",
                      placeholderLeft
                    )}
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 0.9, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {placeholder}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
