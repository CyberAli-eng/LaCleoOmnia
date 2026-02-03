"use client";

export interface GuideStep {
  step: number;
  title: string;
  description: string;
}

interface GuideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  steps?: GuideStep[];
  /** Fallback when no steps: show this text (e.g. from setupGuide) */
  fallbackText?: string;
}

export function GuideDrawer({ open, onClose, title, steps, fallbackText }: GuideDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-xl overflow-y-auto animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label={`Guide: ${title}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between shrink-0 p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close guide"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {steps && steps.length > 0 ? (
              <nav className="space-y-1" aria-label="Setup steps">
                {steps.map((s) => (
                  <div
                    key={s.step}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold"
                        aria-hidden
                      >
                        {s.step}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </nav>
            ) : fallbackText ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{fallbackText}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No guide available for this integration.</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
