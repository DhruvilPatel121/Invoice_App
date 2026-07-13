import React from "react";
import { cn, getStatusColor } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/types";

interface Props {
  status: InvoiceStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status),
        className,
      )}
    >
      {status}
    </span>
  );
}
