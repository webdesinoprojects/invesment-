"use client";

import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import type {
  RegistrationReceiptData,
  RegistrationSecrets,
} from "@/features/auth/types/registration";

type RegistrationReceiptProps = {
  details: RegistrationReceiptData;
  secrets: RegistrationSecrets;
};

function formatJoiningDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  initialSize: number,
) {
  let size = initialSize;
  while (size > 28) {
    context.font = `600 ${size}px Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

async function loadLogo() {
  const logo = new Image();
  logo.src = BRAND_LOGO_PATH;
  await logo.decode();
  return logo;
}

export function RegistrationReceipt({
  details,
  secrets,
}: RegistrationReceiptProps) {
  const [downloadError, setDownloadError] = useState("");
  const joinedOn = formatJoiningDate(details.joinedAt);

  async function downloadReceipt() {
    setDownloadError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1440;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");

      const background = context.createLinearGradient(0, 0, 1080, 1440);
      background.addColorStop(0, "#05121a");
      background.addColorStop(0.48, "#063d42");
      background.addColorStop(1, "#07130d");
      context.fillStyle = background;
      context.fillRect(0, 0, 1080, 1440);

      context.fillStyle = "rgba(23, 215, 143, 0.08)";
      context.beginPath();
      context.arc(980, 170, 250, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(38, 198, 255, 0.08)";
      context.beginPath();
      context.arc(90, 1270, 300, 0, Math.PI * 2);
      context.fill();

      const logo = await loadLogo();
      context.drawImage(logo, 390, 58, 300, 300);

      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "700 58px Arial, sans-serif";
      context.fillText("WELCOME", 540, 380);
      context.fillStyle = "#53f2ba";
      context.font = "700 50px Arial, sans-serif";
      context.fillText(details.fullName, 540, 452);

      context.strokeStyle = "rgba(255,255,255,.2)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(145, 510);
      context.lineTo(935, 510);
      context.stroke();

      const fields = [
        ["USER ID", details.memberId],
        ["PASSWORD", secrets.password],
        ["SECURITY PIN", secrets.securityPin],
        ["EMAIL", details.email],
        ["DATE OF JOINING", joinedOn],
      ] as const;

      fields.forEach(([label, value], index) => {
        const y = 590 + index * 145;
        context.textAlign = "left";
        context.fillStyle = "#86a7a2";
        context.font = "700 24px Arial, sans-serif";
        context.fillText(label, 155, y);
        const fontSize = fitText(context, value, 770, 42);
        context.fillStyle = "#ffffff";
        context.font = `600 ${fontSize}px Arial, sans-serif`;
        context.fillText(value, 155, y + 52);
      });

      context.fillStyle = "#f7bd26";
      context.fillRect(135, 1320, 810, 4);
      context.textAlign = "center";
      context.fillStyle = "#9fb8b2";
      context.font = "500 22px Arial, sans-serif";
      context.fillText(
        "Store this receipt securely. These credentials protect your account.",
        540,
        1370,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Receipt image could not be created."));
        }, "image/png");
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${BRAND_NAME.toLowerCase().replaceAll(" ", "-")}-${details.memberId}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("The receipt could not be downloaded. Please try again.");
    }
  }

  return (
    <section
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#020706]/95 px-4 py-8 backdrop-blur-sm sm:py-12"
      aria-labelledby="registration-success-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6 rounded-lg border border-primary/30 bg-card p-5 text-center shadow-2xl shadow-primary/10 sm:p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center">
        <BrandMark className="size-32 sm:size-36" priority />
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Registration complete
        </p>
        <h2 id="registration-success-title" className="mt-2 text-3xl font-bold">
          Welcome, {details.fullName}
        </h2>
        </div>

        <div className="divide-y divide-border border-y border-border text-left">
        {[
          ["User ID", details.memberId],
          ["Password", secrets.password],
          ["Security PIN", secrets.securityPin],
          ["Email", details.email],
          ["Date of joining", joinedOn],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:items-center"
          >
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {label}
            </span>
            <strong className="break-all font-mono text-sm text-foreground sm:text-base">
              {value}
            </strong>
          </div>
        ))}
        </div>

        <div className="flex gap-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-left text-sm text-amber-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
        <p>
          This is the only time your password and security PIN are displayed.
          Download this receipt and store it somewhere private.
        </p>
        </div>

        {downloadError && (
          <p className="text-sm text-destructive" role="alert">
            {downloadError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={downloadReceipt}>
            <Download aria-hidden="true" />
            Download receipt
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Continue to login</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
