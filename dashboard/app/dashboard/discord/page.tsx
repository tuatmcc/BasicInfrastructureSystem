"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminOnly } from "@/components/admin-only";
import { useAuth } from "@/components/auth-provider";

type Role = { id: string; name: string; position: number };
type Channel = { id: string; name: string; category_id: string | null; position: number };
type Category = { id: string; name: string; position: number };
type Member = { id: string; name: string };

export default function DiscordPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [newRoleName, setNewRoleName] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteRoleId, setDeleteRoleId] = useState("");
  const [deleteChannelId, setDeleteChannelId] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState("");

  async function apiGet<T>(path: string): Promise<T> {
    if (!session?.access_token) {
      throw new Error("ログインセッションがありません");
    }

    const response = await fetch(path, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function apiPost(path: string, body: object): Promise<void> {
    if (!session?.access_token) {
      throw new Error("ログインセッションがありません");
    }

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async function reloadAll(showLoading: boolean) {
    if (showLoading) {
      setLoading(true);
    }
    setError("");
    setMessage("");

    try {
      const [nextRoles, nextChannels, nextCategories, nextMembers] = await Promise.all([
        apiGet<Role[]>("/api/discord/api/v0/role/list"),
        apiGet<Channel[]>("/api/discord/api/v0/channel/list"),
        apiGet<Category[]>("/api/discord/api/v0/category/list"),
        apiGet<Member[]>("/api/discord/api/v0/member/list"),
      ]);

      setRoles(nextRoles);
      setChannels(nextChannels);
      setCategories(nextCategories);
      setMembers(nextMembers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Discord APIの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  async function onCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/role/create", { name: newRoleName });
      setMessage("ロールを作成しました。");
      setNewRoleName("");
      await reloadAll(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "ロール作成に失敗しました。");
    }
  }

  async function onDeleteRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/role/delete", { id: deleteRoleId });
      setMessage("ロールを削除しました。");
      await reloadAll(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ロール削除に失敗しました。");
    }
  }

  async function onCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/channel/create", { name: newChannelName });
      setMessage("チャンネルを作成しました。");
      setNewChannelName("");
      await reloadAll(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "チャンネル作成に失敗しました。");
    }
  }

  async function onDeleteChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/channel/delete", { id: deleteChannelId });
      setMessage("チャンネルを削除しました。");
      await reloadAll(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "チャンネル削除に失敗しました。");
    }
  }

  async function onCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/category/create", { name: newCategoryName });
      setMessage("カテゴリを作成しました。");
      setNewCategoryName("");
      await reloadAll(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "カテゴリ作成に失敗しました。");
    }
  }

  async function onDeleteCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/discord/api/v0/category/delete", { id: deleteCategoryId });
      setMessage("カテゴリを削除しました。");
      await reloadAll(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "カテゴリ削除に失敗しました。");
    }
  }

  return (
    <AdminOnly>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Discord管理</h1>
          <p className="mt-2 text-sm text-slate-600">
            DiscordConnector PublicAPIを使ったロール・チャンネル・カテゴリ管理と一覧表示です。
          </p>
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reloadAll(true)}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
          >
            再読み込み
          </button>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {loading ? <p className="text-sm text-slate-700">読み込み中...</p> : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">ロール</h2>
            <form className="mt-3 flex gap-2" onSubmit={onCreateRole}>
              <input
                required
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="新規ロール名"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">
                作成
              </button>
            </form>
            <form className="mt-2 flex gap-2" onSubmit={onDeleteRole}>
              <select
                required
                value={deleteRoleId}
                onChange={(event) => setDeleteRoleId(event.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">削除するロールを選択</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{`${role.name} (${role.id})`}</option>
                ))}
              </select>
              <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700">
                削除
              </button>
            </form>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {roles.map((role) => (
                <li key={role.id}>{`${role.name} / position: ${role.position}`}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">チャンネル</h2>
            <form className="mt-3 flex gap-2" onSubmit={onCreateChannel}>
              <input
                required
                value={newChannelName}
                onChange={(event) => setNewChannelName(event.target.value)}
                placeholder="新規チャンネル名"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">
                作成
              </button>
            </form>
            <form className="mt-2 flex gap-2" onSubmit={onDeleteChannel}>
              <select
                required
                value={deleteChannelId}
                onChange={(event) => setDeleteChannelId(event.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">削除するチャンネルを選択</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{`${channel.name} (${channel.id})`}</option>
                ))}
              </select>
              <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700">
                削除
              </button>
            </form>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {channels.map((channel) => (
                <li key={channel.id}>{`${channel.name} / category: ${channel.category_id ?? "none"}`}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">カテゴリ</h2>
            <form className="mt-3 flex gap-2" onSubmit={onCreateCategory}>
              <input
                required
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="新規カテゴリ名"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">
                作成
              </button>
            </form>
            <form className="mt-2 flex gap-2" onSubmit={onDeleteCategory}>
              <select
                required
                value={deleteCategoryId}
                onChange={(event) => setDeleteCategoryId(event.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">削除するカテゴリを選択</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{`${category.name} (${category.id})`}</option>
                ))}
              </select>
              <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700">
                削除
              </button>
            </form>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {categories.map((category) => (
                <li key={category.id}>{`${category.name} / position: ${category.position}`}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">メンバー一覧</h2>
            <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-sm text-slate-700">
              {members.map((member) => (
                <li key={member.id}>{`${member.name} (${member.id})`}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AdminOnly>
  );
}
