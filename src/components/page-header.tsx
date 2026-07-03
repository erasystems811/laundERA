import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  back,
  action,
}: {
  eyebrow?: string;
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="px-5 pb-2 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-2xl items-end justify-between gap-3">
        <div className="min-w-0">
          {back ? (
            <Link href={back} className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </Link>
          ) : (
            eyebrow && <p className="mb-0.5 text-sm text-muted">{eyebrow}</p>
          )}
          <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight text-teal-900">
            {title}
          </h1>
        </div>
        {action && <div className="flex-shrink-0 pb-1.5">{action}</div>}
      </div>
    </header>
  );
}
