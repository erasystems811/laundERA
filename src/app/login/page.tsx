import { BrandCredit } from "@/components/brand";
import { logIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="glass-card w-full max-w-sm rounded-[32px] p-8">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900">Laund<span className="text-teal-500">ERA</span></h1>
          <p className="mt-1 text-muted">Log in to your account</p>
        </div>

        <form action={logIn} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-ink">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              placeholder="0803 000 0000"
              className="h-14 w-full rounded-2xl border border-white/60 bg-white/40 px-4 text-lg text-ink outline-none backdrop-blur-sm placeholder:text-muted-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-2 block text-sm font-medium text-ink">
              PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              required
              placeholder="••••••"
              className="h-14 w-full rounded-2xl border border-white/60 bg-white/40 px-4 text-lg tracking-widest text-ink outline-none backdrop-blur-sm placeholder:text-muted-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50/80 px-4 py-3 text-sm text-red-700">
              Phone number or PIN is incorrect. Try again.
            </p>
          )}

          <button
            type="submit"
            className="btn-primary mt-2 h-14 w-full rounded-2xl text-lg font-medium text-white transition-transform active:scale-[0.99]"
          >
            Log in
          </button>
        </form>
        <BrandCredit className="mt-8 text-center" />
      </div>
    </div>
  );
}
