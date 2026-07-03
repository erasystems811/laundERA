import { logIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">LaundERA</h1>
          <p className="mt-1 text-zinc-500">Log in to your account</p>
        </div>

        <form action={logIn} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-zinc-700">
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
              className="h-14 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-lg text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-2 block text-sm font-medium text-zinc-700">
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
              className="h-14 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-lg tracking-widest text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Phone number or PIN is incorrect. Try again.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 h-14 w-full rounded-2xl bg-zinc-900 text-lg font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
