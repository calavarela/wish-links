import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    );
  }
} else if (!host) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });

  let identifiedUserId: string | null = null;
  const supabase = createClient();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      identifiedUserId = null;
      posthog.reset();
      return;
    }

    const user = session?.user;
    if (!user) return;

    if (identifiedUserId && identifiedUserId !== user.id) {
      posthog.reset();
    }

    posthog.identify(user.id, user.email ? { email: user.email } : undefined);
    identifiedUserId = user.id;
  });
}
