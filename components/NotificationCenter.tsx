"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationCenter({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);

  async function markRead(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
    }
  }

  async function markAllRead() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);

    if (!error) {
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    }
    setBusy(false);
  }

  if (!items.length) {
    return (
      <div className="emptyState">
        <strong>No tienes notificaciones todavía.</strong>
        <span>Cuando algo importante ocurra en Nowoork aparecerá aquí.</span>
      </div>
    );
  }

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <div className="notificationCenter">
      <div className="notificationToolbar">
        <span>{unread ? `${unread} sin leer` : "Todo al día"}</span>
        {unread ? (
          <button className="secondaryButton small" type="button" onClick={markAllRead} disabled={busy}>
            {busy ? "Actualizando…" : "Marcar todo como leído"}
          </button>
        ) : null}
      </div>

      <div className="notificationList">
        {items.map((item) => {
          const content = (
            <>
              <div className="notificationTitleRow">
                <strong>{item.title}</strong>
                {!item.read_at ? <span className="notificationUnreadDot" aria-label="Sin leer" /> : null}
              </div>
              <p>{item.body}</p>
              <small>{new Date(item.created_at).toLocaleString("es-CO")}</small>
            </>
          );

          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className={`notificationItem ${item.read_at ? "" : "unread"}`}
              onClick={() => {
                if (!item.read_at) void markRead(item.id);
              }}
            >
              {content}
            </Link>
          ) : (
            <button
              type="button"
              key={item.id}
              className={`notificationItem notificationButton ${item.read_at ? "" : "unread"}`}
              onClick={() => {
                if (!item.read_at) void markRead(item.id);
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
