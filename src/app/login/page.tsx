import { Heart } from "lucide-react";
import LoginForm from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const redirectTo = typeof next === "string" && next.startsWith("/") ? next : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
            <Heart className="size-6 text-brand" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Wish Links</h1>
          <p className="mt-1 text-sm text-muted">
            Todos los links de lo que te querés comprar, en un solo lugar.
          </p>
        </div>

        <LoginForm next={redirectTo} />
      </div>
    </main>
  );
}
