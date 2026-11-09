import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function PageHeader({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10"
    >
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-3xl font-light leading-tight sm:text-5xl">
        {title}
        {/* Gold once per screen, on the second line of the headline. */}
        {accent && <span className="block text-accent-ink">{accent}</span>}
      </h1>
      {children}
    </motion.header>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };
export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  const base = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-5 text-sm tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const look = variant === "primary" ? "bg-primary text-on-primary hover:opacity-90" : "border border-line text-fg hover:bg-surface";
  return <button className={`${base} ${look} ${className}`} {...rest} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-line ${className}`} />;
}

/** Shared async states: every async view renders loading, empty, error (with retry) and offline. */
export function AsyncState({ status, emptyText, onRetry }: { status: "loading" | "empty" | "error" | "offline"; emptyText?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  if (status === "loading")
    return (
      <div role="status" aria-label={t("state.loading")} className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  const message = status === "empty" ? emptyText : status === "offline" ? t("state.offline") : t("consultation.error");
  return (
    <div role={status === "error" ? "alert" : "status"} className="rounded-md border border-line p-8 text-muted">
      <p>{message}</p>
      {onRetry && status !== "empty" && (
        <Button variant="ghost" className="mt-4" onClick={onRetry}>{t("state.retry")}</Button>
      )}
    </div>
  );
}

export function Icon({ name, className = "h-5 w-5" }: { name: "home" | "grid" | "layers" | "book" | "chat" | "info" | "phone" | "cog"; className?: string }) {
  const paths: Record<typeof name, string> = {
    home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
    book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7",
    chat: "M4 5h16v11H8l-4 4z",
    info: "M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    phone: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
    cog: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

/** Wordmark: lowercase "ashmont" with the gold bar over the "a", paired with Arabic. Replace with the master SVG. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span role="img" className={`inline-flex items-baseline gap-2 ${className}`} aria-label="ashmont اشمونت">
      <span aria-hidden="true" dir="ltr" className="relative text-xl font-light lowercase tracking-normal">
        <span className="absolute -top-1 left-0 h-0.5 w-[0.55em] bg-accent" />
        ashmont
      </span>
      <span aria-hidden="true" lang="ar" dir="rtl" className="text-base font-light">اشمونت</span>
    </span>
  );
}
