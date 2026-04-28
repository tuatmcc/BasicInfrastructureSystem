"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

type DiscordLinkResult = {
  discordId: string;
  discordName: string | null;
};

type PopupMessage = {
  source?: string;
  success?: boolean;
  discordId?: string;
  discordName?: string | null;
  error?: string;
};

type StartResponse = {
  code: number;
  body?: {
    authorize_url?: string;
  };
  message?: string;
};

type DiscordLinkPanelProps = {
  accessToken: string;
  currentDiscordId: string | null;
  currentDiscordName: string | null;
  description: string;
  returnTo: "/dashboard" | "/enrollment";
  title: string;
  onLinked: (result: DiscordLinkResult) => void;
};

async function readError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export function DiscordLinkPanel({
  accessToken,
  currentDiscordId,
  currentDiscordName,
  description,
  returnTo,
  title,
  onLinked,
}: DiscordLinkPanelProps) {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  function clearPopupMonitor() {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    popupRef.current = null;
  }

  const finalizeLink = useEffectEvent(async (discordId: string, discordName: string | null) => {
    const response = await fetch("/api/discord/link/verify", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        discord_id: discordId,
        ...(discordName ? { discord_name: discordName } : {}),
      }),
    });

    if (!response.ok) {
      setError(await readError(response));
      setLinking(false);
      return;
    }

    setError("");
    setMessage("Discord連携を更新しました。");
    setLinking(false);
    onLinked({ discordId, discordName });
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent<PopupMessage>) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== "object" || data.source !== "discord-link-callback") {
        return;
      }

      clearPopupMonitor();

      if (data.success !== true || typeof data.discordId !== "string") {
        setLinking(false);
        setError(data.error ?? "Discord連携に失敗しました。");
        return;
      }

      setMessage("");
      void finalizeLink(data.discordId, data.discordName ?? null);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearPopupMonitor();
    };
  }, []);

  async function beginLink() {
    setLinking(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/discord/link/start", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ return_to: returnTo }),
    });

    if (!response.ok) {
      setLinking(false);
      setError(await readError(response));
      return;
    }

    const json = (await response.json()) as StartResponse;
    const authorizeUrl = json.body?.authorize_url;
    if (!authorizeUrl) {
      setLinking(false);
      setError("Discord OAuth URLの生成に失敗しました。");
      return;
    }

    const popup = window.open(
      authorizeUrl,
      "discord-link",
      "popup=yes,width=540,height=720,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
      setLinking(false);
      setError("ポップアップを開けませんでした。ブラウザ設定を確認してください。");
      return;
    }

    popupRef.current = popup;
    popup.focus();
    pollTimerRef.current = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        clearPopupMonitor();
        setLinking(false);
      }
    }, 500);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">現在の連携状態</p>
        <p className="mt-2 text-sm font-medium text-slate-900">
          {currentDiscordId
            ? `${currentDiscordName ?? "Discordアカウント"} (${currentDiscordId})`
            : "未連携"}
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={linking}
        onClick={() => void beginLink()}
        className="mt-4 rounded-lg bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white enabled:hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {linking
          ? "Discord認証を処理中..."
          : currentDiscordId
            ? "Discord連携を更新"
            : "Discordでサインイン"}
      </button>
    </section>
  );
}
