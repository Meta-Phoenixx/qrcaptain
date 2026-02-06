"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { useState } from "react";

type AnnouncementType = "info" | "feature" | "maintenance" | "tip" | "urgent";
type TargetRole = "owner" | "mechanic" | "admin" | "all";

const TYPE_OPTIONS: { value: AnnouncementType; label: string; color: string; darkColor: string }[] = [
  { value: "info", label: "Information", color: "bg-blue-100 text-blue-700", darkColor: "bg-blue-500/20 text-blue-300" },
  { value: "feature", label: "New Feature", color: "bg-purple-100 text-purple-700", darkColor: "bg-purple-500/20 text-purple-300" },
  { value: "maintenance", label: "Maintenance", color: "bg-amber-100 text-amber-700", darkColor: "bg-amber-500/20 text-amber-300" },
  { value: "tip", label: "Tip", color: "bg-green-100 text-green-700", darkColor: "bg-green-500/20 text-green-300" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700", darkColor: "bg-red-500/20 text-red-300" },
];

const ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "owner", label: "Owners Only" },
  { value: "mechanic", label: "Mechanics Only" },
  { value: "admin", label: "Admins Only" },
];

interface AnnouncementFormData {
  title: string;
  content: string;
  type: AnnouncementType;
  targetRoles: TargetRole[];
  isPinned: boolean;
  expiresAt: string; // Date string for input
}

const defaultFormData: AnnouncementFormData = {
  title: "",
  content: "",
  type: "info",
  targetRoles: ["all"],
  isPinned: false,
  expiresAt: "",
};

export function AnnouncementManager() {
  const { mode } = useTheme();
  const announcements = useQuery(api.announcements.listAllAnnouncements, { includeInactive: true });
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const updateAnnouncement = useMutation(api.announcements.updateAnnouncement);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"announcements"> | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const expiresAt = formData.expiresAt 
        ? new Date(formData.expiresAt).getTime() 
        : undefined;

      if (editingId) {
        await updateAnnouncement({
          announcementId: editingId,
          title: formData.title,
          content: formData.content,
          type: formData.type,
          targetRoles: formData.targetRoles,
          isPinned: formData.isPinned,
          expiresAt,
        });
      } else {
        await createAnnouncement({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          targetRoles: formData.targetRoles,
          isPinned: formData.isPinned,
          expiresAt,
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Failed to save announcement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (announcement: NonNullable<typeof announcements>[0]) => {
    setEditingId(announcement._id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      targetRoles: announcement.targetRoles as TargetRole[],
      isPinned: announcement.isPinned,
      expiresAt: announcement.expiresAt 
        ? new Date(announcement.expiresAt).toISOString().split("T")[0] 
        : "",
    });
    setShowForm(true);
  };

  const handleDelete = async (announcementId: Id<"announcements">) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    await deleteAnnouncement({ announcementId });
  };

  const handleToggleActive = async (announcement: NonNullable<typeof announcements>[0]) => {
    await updateAnnouncement({
      announcementId: announcement._id,
      isActive: !announcement.isActive,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!announcements) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={`h-10 rounded w-1/4 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-24 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Announcements</h3>
          <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            Manage system announcements visible to users
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData(defaultFormData);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 transition-colors font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Announcement
        </button>
      </div>

      {/* Announcement List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <p className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>No announcements yet</p>
            <button
              onClick={() => setShowForm(true)}
              className={`mt-4 font-medium text-sm ${mode === 'dark' ? "text-captain-400 hover:text-captain-300" : "text-captain-600 hover:text-captain-700"}`}
            >
              Create your first announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => {
            const typeConfig = TYPE_OPTIONS.find((t) => t.value === announcement.type);
            return (
              <div
                key={announcement._id}
                className={`p-4 rounded-xl border ${
                  announcement.isActive 
                    ? mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                    : mode === 'dark' ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-semibold truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                        {announcement.title}
                      </h4>
                      {announcement.isPinned && (
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                      )}
                      {!announcement.isActive && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${mode === 'dark' ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-600"}`}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-2 mb-3 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                      {announcement.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${mode === 'dark' ? typeConfig?.darkColor : typeConfig?.color}`}>
                        {typeConfig?.label}
                      </span>
                      <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>
                        {announcement.targetRoles.includes("all" as TargetRole) 
                          ? "Everyone" 
                          : announcement.targetRoles.join(", ")}
                      </span>
                      <span className={mode === 'dark' ? "text-gray-600" : "text-gray-400"}>•</span>
                      <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>
                        Created {formatDate(announcement.createdAt)}
                      </span>
                      {announcement.expiresAt && (
                        <>
                          <span className={mode === 'dark' ? "text-gray-600" : "text-gray-400"}>•</span>
                          <span className={`${
                            announcement.expiresAt < Date.now() 
                              ? "text-red-500" 
                              : mode === 'dark' ? "text-gray-400" : "text-gray-500"
                          }`}>
                            {announcement.expiresAt < Date.now() ? "Expired" : `Expires ${formatDate(announcement.expiresAt)}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(announcement)}
                      className={`p-2 rounded-lg transition-colors ${
                        announcement.isActive
                          ? mode === 'dark' ? "text-green-400 hover:bg-green-500/10" : "text-green-600 hover:bg-green-50"
                          : mode === 'dark' ? "text-gray-500 hover:bg-white/10" : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={announcement.isActive ? "Deactivate" : "Activate"}
                    >
                      {announcement.isActive ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "text-gray-500 hover:text-captain-400 hover:bg-captain-500/10" : "text-gray-400 hover:text-captain-600 hover:bg-captain-50"}`}
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <GlassModal onClose={() => setShowForm(false)} className="max-w-lg max-h-[90vh] flex flex-col">
            <div className={`flex items-center justify-between p-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
              <h3 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {editingId ? "Edit Announcement" : "New Announcement"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(defaultFormData);
                }}
                className={`p-2 rounded-full transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-gray-200 hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                  placeholder="Announcement title"
                />
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                  placeholder="Announcement content..."
                />
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900"}`}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Roles */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Target Audience
                </label>
                <select
                  value={formData.targetRoles[0]}
                  onChange={(e) => setFormData({ ...formData, targetRoles: [e.target.value as TargetRole] })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900"}`}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expires At */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900"}`}
                />
              </div>

              {/* Pinned */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className={`w-4 h-4 text-captain-600 rounded focus:ring-captain-500 ${mode === 'dark' ? "border-white/20 bg-white/5" : "border-gray-300"}`}
                />
                <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Pin to top (cannot be dismissed by users)
                </span>
              </label>
            </form>

            <div className={`p-4 border-t flex justify-end gap-3 ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(defaultFormData);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${mode === 'dark' ? "text-gray-300 hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title || !formData.content}
                className="px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
        </GlassModal>
      )}
    </div>
  );
}
