"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  KeyRound,
  Shield,
  UserCog,
  Eye,
  Loader2,
  X,
} from "lucide-react";

interface UserItem {
  _id: string;
  username: string;
  role: string;
  created_by?: string;
  created_at?: string;
}

const ROLE_META: Record<string, { icon: React.ElementType; tone: string; bg: string }> = {
  admin: { icon: Shield, tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15" },
  hr: { icon: UserCog, tone: "text-primary", bg: "bg-primary/15" },
  interviewer: { icon: Eye, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
};

export default function UsersPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("interviewer");
  const [creating, setCreating] = useState(false);

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get<UserItem[]>("/auth/users/", token);
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Username and password are required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    try {
      await api.post(
        "/auth/users/create/",
        { username: newUsername.trim(), password: newPassword.trim(), role: newRole },
        token
      );
      toast.success(`User '${newUsername.trim()}' created`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("interviewer");
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${userId}/delete/`, token);
      toast.success(`User '${username}' deleted`);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPassword.trim() || resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      await api.post(
        `/auth/users/${userId}/reset-password/`,
        { password: resetPassword.trim() },
        token
      );
      toast.success("Password reset");
      setResetUserId(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            <Shield className="h-3 w-3" />
            Admin
          </div>
          <h1 className="text-3xl font-bold tracking-tight">User management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} · Admins {roleCounts.admin ?? 0} · HR {roleCounts.hr ?? 0} · Interviewers {roleCounts.interviewer ?? 0}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="gap-1.5 shadow-md shadow-primary/15"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cancel" : "Create user"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-border/70 card-elevated p-5">
          <h2 className="mb-1 text-base font-semibold">Create new user</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Password is shown in plain text so you can share it with the user.
          </p>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="new-username"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Username
                </Label>
                <Input
                  id="new-username"
                  placeholder="e.g. ada.lovelace"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="new-password"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
                <Input
                  id="new-password"
                  type="text"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="interviewer">Interviewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              disabled={creating}
              className="gap-1.5 shadow-md shadow-primary/15"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create user
            </Button>
          </form>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 shimmer" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No users yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 card-elevated">
          <div className="divide-y divide-border/60">
            {users.map((u) => {
              const meta = ROLE_META[u.role] ?? ROLE_META.interviewer;
              const RoleIcon = meta.icon;
              const isSelf = u._id === user?.id;
              return (
                <div
                  key={u._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} ${meta.tone}`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{u.username}</p>
                        {isSelf && (
                          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={`rounded-md px-1.5 py-0.5 font-medium uppercase ${meta.bg} ${meta.tone}`}>
                          {u.role}
                        </span>
                        {u.created_by && <span>by {u.created_by}</span>}
                        {u.created_at && (
                          <span>{new Date(u.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {resetUserId === u._id ? (
                      <>
                        <Input
                          type="text"
                          placeholder="New password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="h-8 w-44 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleResetPassword(u._id)}
                          disabled={resetting}
                          className="h-8"
                        >
                          {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setResetUserId(null);
                            setResetPassword("");
                          }}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResetUserId(u._id);
                          setResetPassword("");
                        }}
                        className="h-8 gap-1 text-xs"
                      >
                        <KeyRound className="h-3 w-3" />
                        Reset
                      </Button>
                    )}

                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteUser(u._id, u.username)}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${u.username}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
