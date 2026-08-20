"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

export default function ProfilePage() {
  const a = api as any;
  const me = useQuery(a.users.currentUser);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const updateProfile = useMutation(a.users.updateProfile);

  function startEdit() {
    setFirstName(me?.firstName ?? "");
    setLastName(me?.lastName ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
    setEditing(false);
  }

  if (me === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-captain-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = `${me?.firstName?.[0] ?? ""}${me?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const fullName = `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim() || me?.name || "User";

  return (
    <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white font-heading mb-8">My Profile</h1>

      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        {/* Avatar */}
        <div className="px-8 py-8 border-b border-white/[0.06] flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-captain-500/20 border-2 border-captain-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-captain-300">{initials}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white font-heading">{fullName}</p>
            <p className="text-sm text-white/50 capitalize mt-0.5">{me?.role ?? "user"}</p>
            {me?.email && <p className="text-sm text-white/40 mt-1">{me.email}</p>}
          </div>
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-captain-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-captain-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEdit}
                  className="px-5 py-2 rounded-xl bg-captain-500 hover:bg-captain-600 text-white text-sm font-semibold transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">First Name</p>
                  <p className="text-sm text-white">{me?.firstName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Last Name</p>
                  <p className="text-sm text-white">{me?.lastName || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm text-white">{me?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Role</p>
                <p className="text-sm text-white capitalize">{me?.role || "—"}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={startEdit}
                  className="px-5 py-2 rounded-xl bg-captain-500/15 hover:bg-captain-500/25 border border-captain-500/20 text-captain-300 text-sm font-semibold transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
