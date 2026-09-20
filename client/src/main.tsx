import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { mexicoCityReferenceDate } from "./lib/dashboardPeriod";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // An expired/invalid session must land on Meximoney's own login form
  // (LocalAuthCard, rendered by DashboardLayout when there is no user), not
  // on any external OAuth portal. A full navigation to "/" also clears the
  // stale session token cached in sessionStorage's next read.
  try {
    sessionStorage.removeItem("meximoney-local-session");
  } catch {
    // sessionStorage unavailable
  }
  if (window.location.pathname === "/") {
    window.location.reload();
  } else {
    window.location.assign("/");
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const localReferenceDate = mexicoCityReferenceDate();
        // Forward the local session explicitly for browsers/contexts that
        // block third-party or iframe cookies (Safari ITP, private
        // browsing, in-app WebViews). The session cookie set on login still
        // works everywhere else and takes priority server-side.
        try {
          const localToken = sessionStorage.getItem("meximoney-local-session");
          if (localToken) return { "X-Meximoney-Session": localToken, "X-Meximoney-Reference-Date": localReferenceDate };
        } catch {
          // sessionStorage unavailable
        }
        return { "X-Meximoney-Reference-Date": localReferenceDate };
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js?build=20260919-v95", { updateViaCache: "none" }).then(registration => registration.update()).catch(error => console.warn("[PWA] No fue posible registrar el modo offline.", error)));
}
