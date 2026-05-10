"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  ArtistMembershipRole,
  ArtistMembershipStatus,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ArtistOption {
  id: string;
  name: string;
  slug: string;
}

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
}

interface Membership {
  id: string;
  user_id: string | null;
  artist_id: string;
  role: ArtistMembershipRole;
  status: ArtistMembershipStatus;
  invited_email: string | null;
  invited_by_email: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  artist_name: string;
  artist_slug: string;
  user_email: string | null;
  user_name: string | null;
  user_username: string | null;
}

interface Props {
  artists: ArtistOption[];
  users: UserOption[];
  initialMemberships: Membership[];
}

const ROLES: ArtistMembershipRole[] = [
  "owner",
  "representative",
  "contributor",
];

const STATUSES: ArtistMembershipStatus[] = [
  "active",
  "invited",
  "revoked",
];

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export function ClaimsManager({
  artists,
  users,
  initialMemberships,
}: Props) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [artistSearch, setArtistSearch] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<ArtistMembershipRole>("owner");
  const [saving, setSaving] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const selectedArtist = artists.find((artist) => artist.id === selectedArtistId);
  const filteredArtists = useMemo(
    () =>
      artists
        .filter((artist) =>
          matchesSearch(`${artist.name} ${artist.slug}`, artistSearch)
        )
        .slice(0, 12),
    [artists, artistSearch]
  );

  const filteredUsers = useMemo(
    () =>
      users
        .filter((user) =>
          matchesSearch(
            `${user.email} ${user.name ?? ""} ${user.username ?? ""}`,
            userEmail
          )
        )
        .slice(0, 8),
    [users, userEmail]
  );

  const filteredMemberships = useMemo(() => {
    if (!tableSearch.trim()) return memberships;
    return memberships.filter((membership) =>
      matchesSearch(
        `${membership.artist_name} ${membership.artist_slug} ${
          membership.user_email ?? ""
        } ${membership.user_name ?? ""} ${membership.user_username ?? ""}`,
        tableSearch
      )
    );
  }, [memberships, tableSearch]);

  async function refreshMemberships() {
    setMemberships(await requestJson<Membership[]>("/api/admin/artist-memberships"));
  }

  async function addMembership() {
    if (!selectedArtistId || !userEmail.trim()) return;
    setSaving(true);
    try {
      const membership = await requestJson<Membership>(
        "/api/admin/artist-memberships",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artist_id: selectedArtistId,
            user_email: userEmail.trim(),
            role,
          }),
        }
      );
      setMemberships((prev) => {
        const exists = prev.some((item) => item.id === membership.id);
        if (exists) {
          return prev.map((item) =>
            item.id === membership.id ? membership : item
          );
        }
        return [membership, ...prev];
      });
      setUserEmail("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to assign claim");
    } finally {
      setSaving(false);
    }
  }

  async function updateMembership(
    id: string,
    updates: Partial<Pick<Membership, "role" | "status">>
  ) {
    const previous = memberships;
    setMemberships((prev) =>
      prev.map((membership) =>
        membership.id === id ? { ...membership, ...updates } : membership
      )
    );
    try {
      const updated = await requestJson<Membership>(
        "/api/admin/artist-memberships",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        }
      );
      setMemberships((prev) =>
        prev.map((membership) =>
          membership.id === id ? updated : membership
        )
      );
    } catch (error) {
      setMemberships(previous);
      alert(error instanceof Error ? error.message : "Failed to update claim");
    }
  }

  async function deleteMembership(id: string) {
    if (!confirm("Delete this artist claim?")) return;
    const previous = memberships;
    setMemberships((prev) => prev.filter((membership) => membership.id !== id));
    try {
      await requestJson<{ success: boolean }>(
        `/api/admin/artist-memberships?id=${id}`,
        { method: "DELETE" }
      );
    } catch (error) {
      setMemberships(previous);
      alert(error instanceof Error ? error.message : "Failed to delete claim");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded border border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Assign Artist Profile</h2>
          <p className="text-sm text-muted-foreground">
            The user must have signed in at least once so their email exists in
            the users table.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Artist</label>
            <Input
              value={selectedArtist ? selectedArtist.name : artistSearch}
              onChange={(event) => {
                setSelectedArtistId("");
                setArtistSearch(event.target.value);
              }}
              placeholder="Search artists..."
            />
            {!selectedArtist && artistSearch && (
              <div className="max-h-56 overflow-y-auto rounded border border-border bg-background">
                {filteredArtists.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No artists found
                  </div>
                ) : (
                  filteredArtists.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => {
                        setSelectedArtistId(artist.id);
                        setArtistSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{artist.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        /{artist.slug}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User Email</label>
            <Input
              type="email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              placeholder="artist@example.com"
            />
            {userEmail && (
              <div className="max-h-56 overflow-y-auto rounded border border-border bg-background">
                {filteredUsers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No signed-up users found
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setUserEmail(user.email)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{user.email}</span>
                      {(user.name || user.username) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {user.name || `@${user.username}`}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as ArtistMembershipRole)
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={addMembership}
              disabled={!selectedArtistId || !userEmail.trim() || saving}
              className="w-full"
            >
              <Plus aria-hidden="true" />
              {saving ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Claims</h2>
            <p className="text-sm text-muted-foreground">
              {filteredMemberships.length} claim
              {filteredMemberships.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="Search claims..."
              className="sm:w-72"
            />
            <Button variant="outline" onClick={refreshMemberships}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemberships.map((membership) => (
                <TableRow
                  key={membership.id}
                  className={
                    membership.status === "revoked" ? "opacity-60" : ""
                  }
                >
                  <TableCell>
                    <div className="font-medium">{membership.artist_name}</div>
                    <div className="text-xs text-muted-foreground">
                      /{membership.artist_slug}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{membership.user_email || membership.invited_email}</div>
                    {(membership.user_name || membership.user_username) && (
                      <div className="text-xs text-muted-foreground">
                        {membership.user_name}
                        {membership.user_username
                          ? ` @${membership.user_username}`
                          : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <select
                      value={membership.role}
                      onChange={(event) =>
                        updateMembership(membership.id, {
                          role: event.target.value as ArtistMembershipRole,
                        })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      value={membership.status}
                      onChange={(event) =>
                        updateMembership(membership.id, {
                          status: event.target.value as ArtistMembershipStatus,
                        })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {membership.accepted_at
                      ? new Date(membership.accepted_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteMembership(membership.id)}
                      aria-label="Delete claim"
                      title="Delete claim"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMemberships.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No claims found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
