import Image from "next/image";

import { cn } from "./ui";

function buildQrAssetUrl({
  value,
  label,
  format,
  size,
  download = false,
}: {
  value: string;
  label?: string;
  format: "svg" | "png";
  size: number;
  download?: boolean;
}) {
  const params = new URLSearchParams({
    value,
    format,
    size: String(size),
  });

  if (label) {
    params.set("label", label);
  }
  if (download) {
    params.set("download", "1");
  }

  return `/api/qr?${params.toString()}`;
}

export function PaylinkQrCard({
  value,
  title,
  subtitle = "Scan to open this PayLink.",
  showDownloads = true,
  compact = false,
  className,
}: {
  value: string;
  title: string;
  subtitle?: string;
  showDownloads?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const previewUrl = buildQrAssetUrl({
    value,
    label: title,
    format: "svg",
    size: compact ? 320 : 640,
  });
  const svgDownloadUrl = buildQrAssetUrl({
    value,
    label: title,
    format: "svg",
    size: 960,
    download: true,
  });
  const pngDownloadUrl = buildQrAssetUrl({
    value,
    label: title,
    format: "png",
    size: 1200,
    download: true,
  });

  return (
    <div
      className={cn(
        "rounded-[1.3rem] border border-zinc-200/70 bg-zinc-50/90 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/35 sm:p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Scan to pay
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {title}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
        </div>
        {!compact ? (
          <div className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            Live QR
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-3 overflow-hidden rounded-[1.15rem] border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950",
          compact ? "max-w-[190px]" : "max-w-[250px]"
        )}
      >
        <Image
          src={previewUrl}
          alt={`QR code for ${title}`}
          width={compact ? 320 : 640}
          height={compact ? 320 : 640}
          unoptimized
          className="block aspect-square w-full rounded-[0.9rem]"
        />
      </div>

      {showDownloads ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={pngDownloadUrl}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Download PNG
          </a>
          <a
            href={svgDownloadUrl}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200/80 px-3.5 text-xs font-semibold dark:border-zinc-800/80"
          >
            Download SVG
          </a>
        </div>
      ) : null}
    </div>
  );
}
