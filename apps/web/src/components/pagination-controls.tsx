"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = { offset: number; pageSize: number; total: number; onOffsetChange: (offset: number) => void; disabled?: boolean };

export function PaginationControls({ offset, pageSize, total, onOffsetChange, disabled = false }: PaginationControlsProps) {
  const page = Math.floor(offset / pageSize) + 1;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination"><span>{total} {total === 1 ? "result" : "results"} · Page {page} of {pages}</span><div><button className="icon-button" disabled={disabled || offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - pageSize))} aria-label="Previous page"><ChevronLeft/></button><button className="icon-button" disabled={disabled || offset + pageSize >= total} onClick={() => onOffsetChange(offset + pageSize)} aria-label="Next page"><ChevronRight/></button></div></div>;
}
