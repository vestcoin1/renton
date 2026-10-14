"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CloudUpload, FileVideo, Loader2, Play, Video, X } from "lucide-react";
import { toast } from "sonner";
import type { MaintenanceMedia } from "renton-shared/types";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { cn } from "renton-core/utils";

const MAX_FILES = 8;
const MAX_VIDEO_MB = 50;

/**
 * Downscales photos to a compact JPEG data URL so they survive reloads in the
 * localStorage-backed demo. In production these upload to Supabase Storage.
 */
export function compressImage(file: File, maxSide = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function VideoThumb({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className={cn("flex size-full flex-col items-center justify-center gap-1 bg-slate-900 text-white/70", className)}>
        <FileVideo className="size-5" />
        <span className="px-1 text-center text-[10px]">Video</span>
      </div>
    );
  return <video src={url} muted playsInline preload="metadata" onError={() => setFailed(true)} className={cn("size-full bg-black object-cover", className)} />;
}

export function MediaUploader({ value, onChange }: { value: MaintenanceMedia[]; onChange: (m: MaintenanceMedia[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!list.length) return toast.error("Upload photos or videos only");
    if (value.length + list.length > MAX_FILES) return toast.error(`You can attach up to ${MAX_FILES} files`);
    setBusy(true);
    const out: MaintenanceMedia[] = [];
    for (const f of list) {
      if (f.type.startsWith("video/")) {
        if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
          toast.error(`${f.name} is over ${MAX_VIDEO_MB}MB`);
          continue;
        }
        out.push({ id: crypto.randomUUID(), kind: "video", url: URL.createObjectURL(f), name: f.name });
      } else {
        try {
          out.push({ id: crypto.randomUUID(), kind: "image", url: await compressImage(f), name: f.name });
        } catch {
          toast.error(`Couldn't read ${f.name}`);
        }
      }
    }
    onChange([...value, ...out]);
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all",
          drag ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <CloudUpload className="size-5" />}
        </span>
        <p className="mt-2 text-sm font-medium">{busy ? "Processingâ€¦" : "Add photos or videos of the problem"}</p>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Camera className="size-3.5" /> JPG, PNG
          </span>
          <span className="flex items-center gap-1">
            <Video className="size-3.5" /> MP4, MOV up to {MAX_VIDEO_MB}MB
          </span>
        </p>
        {/* On phones, image/video accept types offer the camera as a source. */}
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      {value.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          <AnimatePresence>
            {value.map((m) => (
              <motion.li key={m.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {m.kind === "video" ? (
                  <>
                    <VideoThumb url={m.url} />
                    <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                      <Play className="size-2.5 fill-white" /> Video
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- local data-URL preview
                  <img src={m.url} alt={m.name} className="size-full object-cover" />
                )}
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => onChange(value.filter((x) => x.id !== m.id))}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function MediaGallery({ media, size = "md" }: { media: MaintenanceMedia[]; size?: "sm" | "md" }) {
  const [open, setOpen] = useState<MaintenanceMedia | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  if (!media.length) return <p className="text-sm text-muted-foreground">No photos or videos attached.</p>;
  return (
    <>
      <ul className={cn("grid gap-2", size === "sm" ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4")}>
        {media.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                setVideoFailed(false);
                setOpen(m);
              }}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted"
              aria-label={`Open ${m.kind} ${m.name}`}
            >
              {m.kind === "video" ? (
                <>
                  <VideoThumb url={m.url} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
                      <Play className="size-4 fill-white" />
                    </span>
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- remote or data-URL user media
                <img src={m.url} alt={m.name} className="size-full object-cover transition-transform group-hover:scale-105" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl border-0 bg-black p-2 text-white [&>button]:text-white [&>button]:hover:bg-white/10">
          <DialogTitle className="sr-only">{open?.name}</DialogTitle>
          {open?.kind === "video" ? (
            videoFailed ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 text-sm text-white/70">
                <FileVideo className="size-8" />
                This demo video is no longer available after a page reload.
              </div>
            ) : (
              <video src={open.url} controls autoPlay playsInline onError={() => setVideoFailed(true)} className="max-h-[75dvh] w-full rounded-lg" />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- remote or data-URL user media
            open && <img src={open.url} alt={open.name} className="max-h-[75dvh] w-full rounded-lg object-contain" />
          )}
          <p className="px-1 pb-1 text-xs text-white/60">{open?.name}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}


