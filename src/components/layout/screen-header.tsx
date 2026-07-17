import type { ReactNode } from "react";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function ScreenHeader({ title, subtitle, children }: ScreenHeaderProps) {
  return (
    <header className="rise-in mb-6 flex flex-col gap-1">
      <h1 className="type-title text-ink">{title}</h1>
      {subtitle ? <p className="text-ink-soft">{subtitle}</p> : null}
      {children}
    </header>
  );
}
