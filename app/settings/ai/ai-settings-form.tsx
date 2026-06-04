"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

// Amendment 6 Stage 3 — /settings/ai BYO form.
//
// Per Decision E: BYO-only surface, no theme/profile/etc.
// Per Decision F: BYO key failures (when actually used by
//   /api/workspace/run) surface as a clear 502 on that route. This
//   page does not validate the key with Anthropic on save — that
//   would add a side-effecting test call. Save just stores it; the
//   first workspace run is the real validation.

type Provider = "none" | "anthropic";

interface Props {
  initialProvider: string;
  hasKey: boolean;
}

export function AiSettingsForm({ initialProvider, hasKey }: Props) {
  const [provider, setProvider] = useState<Provider>(
    initialProvider === "anthropic" ? "anthropic" : "none",
  );
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | "saved" | "error">(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setErrorText(null);

    const body: { provider: Provider; apiKey?: string } = { provider };
    if (provider === "anthropic") {
      if (!apiKey.trim()) {
        setSaving(false);
        setStatus("error");
        setErrorText("Paste your Anthropic API key.");
        return;
      }
      body.apiKey = apiKey.trim();
    }

    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!data.success) {
        setStatus("error");
        setErrorText(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }
      setStatus("saved");
      setApiKey("");
      setSaving(false);
    } catch {
      setStatus("error");
      setErrorText("Network issue — try again.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>

        <header className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight">AI settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            CareerPilot covers the cost of every AI call by default — you
            don&apos;t need to do anything here. If you&apos;d prefer to use
            your own Anthropic API credentials instead, you can configure
            that below.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
          <div>
            <label
              htmlFor="provider"
              className="block text-sm font-medium text-gray-900"
            >
              AI backend
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="none">CareerPilot covers cost (default)</option>
              <option value="anthropic">Anthropic — use my own API key</option>
            </select>
          </div>

          {provider === "anthropic" && (
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-gray-900"
              >
                Anthropic API key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasKey
                    ? "Key on file — paste a new one to replace, or leave blank to keep current"
                    : "sk-ant-api03-…"
                }
                autoComplete="off"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-2 text-xs text-gray-500">
                Your key is encrypted at rest with AES-256-GCM. It&apos;s
                only decrypted at the moment a workspace call is made on
                your behalf. We never log it.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                If your key is rejected by Anthropic on a workspace run,
                that run will fail with a clear error and you can come
                back here to fix it. We don&apos;t silently fall back to
                CareerPilot&apos;s key.
              </p>
            </div>
          )}

          {provider === "none" && hasKey && (
            <p className="text-xs text-gray-500">
              Saving this will clear the BYO key on file and revert to
              CareerPilot&apos;s default backend.
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>Save</>
              )}
            </button>
            {status === "saved" && (
              <span
                className="inline-flex items-center gap-1 text-xs text-gray-600"
                aria-live="polite"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Saved
              </span>
            )}
            {status === "error" && errorText && (
              <span className="text-xs text-red-600" role="alert">
                {errorText}
              </span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
