import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      <div className="px-6 pt-10 pb-24 sm:pb-32 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">
            Commerce Orchestration
          </h2>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-7xl">
            Unify Orders, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              Sync Inventory, Ship Faster
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            Manage marketplace orders and inventory from one secure dashboard. Receive webhooks, normalize
            data, and broadcast stock updates across channels.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl hover:bg-blue-500 hover:scale-105 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Create Account
            </Link>
            <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600 transition-colors">
              Sign in <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#9089fc] to-[#1d4ed8] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </div>

      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">MVP Focus</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Orders + inventory, delivered fast
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {[
                { name: "Unified Orders", description: "Normalize webhook events into a single order format." },
                { name: "Inventory Locks", description: "Protect stock with Redis-backed locking." },
                { name: "Background Sync", description: "Queue marketplace updates without blocking the UI." },
              ].map((feature) => (
                <div key={feature.name} className="flex flex-col border-l border-blue-600 pl-6">
                  <dt className="text-base font-semibold leading-7 text-slate-900">{feature.name}</dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
