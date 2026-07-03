import { ORDER_STAGES, STAGE_LABEL, type OrderStatus } from "@/lib/format";

export function StageTrack({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STAGES.indexOf(status);

  return (
    <div className="mb-6 mt-1 flex items-center">
      {ORDER_STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div key={stage} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <div
                className={`absolute top-[11px] right-1/2 left-[-50%] h-0.5 ${
                  done || current ? "bg-teal-500" : "bg-ink/10"
                }`}
                style={{ left: "calc(-50% + 11px)", right: "calc(50% + 11px)" }}
              />
            )}
            <div
              className={`z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                done
                  ? "border-teal-600 bg-gradient-to-br from-teal-500 to-teal-700"
                  : current
                    ? "border-teal-500 bg-white shadow-[0_0_0_4px_rgba(20,184,166,0.18)]"
                    : "border-ink/15 bg-white/50"
              }`}
            >
              {done && (
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span
              className={`mt-1.5 text-center text-[9.5px] font-semibold ${
                current ? "text-teal-700" : "text-muted"
              }`}
            >
              {STAGE_LABEL[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
