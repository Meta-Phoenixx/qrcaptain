"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import {
  Settings,
  Users,
  Ship,
  Wrench,
  Bell,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Check,
  AlertCircle,
  ChevronRight,
  Clock,
  FileText,
  X,
  Megaphone,
  Heart,
  Ticket,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { AnnouncementManager } from "./announcement-manager";
import { useRouter } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
import { AuditLogViewer } from "./audit-log-viewer";

type SettingCategory = "notifications" | "system" | "mechanics" | "owners" | "work_orders";

interface SettingConfig {
  key: string;
  value: any;
  description: string;
  category: string;
  updatedAt?: number;
  isDefault?: boolean;
  inputType: "number" | "boolean" | "text";
  min?: number;
  max?: number;
  unit?: string;
}

// Setting configurations with UI metadata
const SETTING_UI_CONFIG: Record<string, { inputType: "number" | "boolean" | "text"; min?: number; max?: number; unit?: string }> = {
  work_order_update_throttle_minutes: { inputType: "number", min: 1, max: 1440, unit: "minutes" },
  max_vessels_per_owner: { inputType: "number", min: 1, max: 500, unit: "vessels" },
  quote_expiry_default_days: { inputType: "number", min: 1, max: 90, unit: "days" },
  max_active_work_orders: { inputType: "number", min: 1, max: 100, unit: "work orders" },
};

const CATEGORY_INFO: Record<SettingCategory, { label: string; icon: React.ReactNode; description: string }> = {
  notifications: {
    label: "Notifications",
    icon: <Bell className="w-5 h-5" />,
    description: "Control how and when notifications are sent",
  },
  system: {
    label: "System",
    icon: <Settings className="w-5 h-5" />,
    description: "General system-wide settings",
  },
  mechanics: {
    label: "Mechanics",
    icon: <Wrench className="w-5 h-5" />,
    description: "Settings related to mechanic accounts",
  },
  owners: {
    label: "Owners",
    icon: <Ship className="w-5 h-5" />,
    description: "Settings related to boat owner accounts",
  },
  work_orders: {
    label: "Work Orders",
    icon: <FileText className="w-5 h-5" />,
    description: "Work order and quote settings",
  },
};

export function AdminControlPanel() {
  const router = useRouter();
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "announcements" | "donations" | "waitlist" | "raffle" | "audit">("overview");
  const [activeCategory, setActiveCategory] = useState<SettingCategory>("notifications");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Donation/Raffle edit state
  const [editingDonationId, setEditingDonationId] = useState<Id<"donationEntries"> | null>(null);
  const [editDonationAmount, setEditDonationAmount] = useState("");
  const [editingRaffleId, setEditingRaffleId] = useState<Id<"raffleEntries"> | null>(null);
  const [editRaffleTickets, setEditRaffleTickets] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Queries
  const stats = useQuery(api.settings.getSystemStats);
  const allSettings = useQuery(api.settings.getAllSettings);

  // Donation, Waitlist, Raffle queries
  const donationStats = useQuery(api.donations.getDonationStats);
  const donations = useQuery(api.donations.listAllDonations);
  const waitlistCount = useQuery(api.waitlist.getWaitlistCount);
  const waitlistSignups = useQuery(api.waitlist.listAllWaitlistSignups);
  const raffleStats = useQuery(api.raffle.getRaffleStats);
  const raffleEntries = useQuery(api.raffle.listAllRaffleEntries);

  // Mutations
  const updateSetting = useMutation(api.settings.updateSetting);
  const resetSetting = useMutation(api.settings.resetSetting);
  const updateDonation = useMutation(api.donations.updateDonation);
  const deleteDonation = useMutation(api.donations.deleteDonation);
  const updateRaffleTickets = useMutation(api.raffle.updateRaffleTickets);
  const deleteRaffleEntry = useMutation(api.raffle.deleteRaffleEntry);

  const handleEditClick = (key: string, currentValue: any) => {
    setEditingKey(key);
    setEditValue(String(currentValue));
  };

  const handleSave = async (key: string) => {
    const config = SETTING_UI_CONFIG[key];
    let parsedValue: any = editValue;

    if (config?.inputType === "number") {
      parsedValue = parseFloat(editValue);
      if (isNaN(parsedValue)) {
        setSaveStatus("error");
        return;
      }
      if (config.min !== undefined && parsedValue < config.min) {
        parsedValue = config.min;
      }
      if (config.max !== undefined && parsedValue > config.max) {
        parsedValue = config.max;
      }
    } else if (config?.inputType === "boolean") {
      parsedValue = editValue === "true";
    }

    setSaveStatus("saving");
    try {
      await updateSetting({ key, value: parsedValue });
      setSaveStatus("saved");
      setEditingKey(null);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save setting:", error);
      setSaveStatus("error");
    }
  };

  const handleReset = async (key: string) => {
    setSaveStatus("saving");
    try {
      await resetSetting({ key });
      setSaveStatus("saved");
      setEditingKey(null);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to reset setting:", error);
      setSaveStatus("error");
    }
  };

  const getSettingsByCategory = (category: SettingCategory) => {
    if (!allSettings) return [];
    return allSettings
      .filter((s) => s.category === category)
      .map((s) => ({
        ...s,
        value: JSON.parse(s.value),
        ...SETTING_UI_CONFIG[s.key],
      }));
  };

  // Donation edit handlers
  const handleDonationEditClick = (id: Id<"donationEntries">, currentAmount: number) => {
    setEditingDonationId(id);
    setEditDonationAmount(String(currentAmount));
  };

  const handleDonationSave = async () => {
    if (!editingDonationId) return;
    const amount = parseFloat(editDonationAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await updateDonation({ entryId: editingDonationId, amount });
      setEditingDonationId(null);
    } catch (error) {
      console.error("Failed to update donation:", error);
    }
  };

  const handleDonationDelete = async (id: Id<"donationEntries">) => {
    try {
      await deleteDonation({ entryId: id });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete donation:", error);
    }
  };

  // Raffle edit handlers
  const handleRaffleEditClick = (id: Id<"raffleEntries">, currentTickets: number) => {
    setEditingRaffleId(id);
    setEditRaffleTickets(String(currentTickets));
  };

  const handleRaffleSave = async () => {
    if (!editingRaffleId) return;
    const tickets = parseInt(editRaffleTickets, 10);
    if (isNaN(tickets) || tickets < 1) return;
    try {
      await updateRaffleTickets({ entryId: editingRaffleId, ticketCount: tickets });
      setEditingRaffleId(null);
    } catch (error) {
      console.error("Failed to update raffle tickets:", error);
    }
  };

  const handleRaffleDelete = async (id: Id<"raffleEntries">) => {
    try {
      await deleteRaffleEntry({ entryId: id });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete raffle entry:", error);
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "settings" as const, label: "Settings", icon: Settings },
    { id: "announcements" as const, label: "Announcements", icon: Megaphone },
    { id: "donations" as const, label: "Donations", icon: Heart },
    { id: "waitlist" as const, label: "Waitlist", icon: Users },
    { id: "raffle" as const, label: "Raffle", icon: Ticket },
    { id: "audit" as const, label: "Audit Log", icon: ShieldCheck },
  ];

  return (
    <div className={`min-h-screen ${mode === "dark" ? "bg-gray-950" : "bg-gray-50"}`}>
      {/* Top Header Bar */}
      <div className={`sticky top-0 z-10 border-b ${mode === "dark" ? "bg-gray-950/80 backdrop-blur-xl border-white/10" : "bg-white/80 backdrop-blur-xl border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/home")}
                className={`p-2 rounded-lg transition-colors ${mode === "dark" ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`w-10 h-10 ${mode === "dark" ? "bg-captain-500/20" : "bg-captain-100"} rounded-lg flex items-center justify-center`}>
                <Settings className="w-5 h-5 text-captain-600" />
              </div>
              <div>
                <h1 className={`text-xl font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>Admin Control Panel</h1>
                <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>Manage system settings and view statistics</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 pt-1 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-captain-600 text-captain-600"
                      : `border-transparent ${mode === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {!stats && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {stats && (
              <>
                {/* User Stats */}
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <Users className="w-5 h-5 text-captain-600" />
                    Users
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats.users.total} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} />
                    <StatCard label="Owners" value={stats.users.owners} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} icon={<Ship className="w-4 h-4 text-blue-600" />} mode={mode} />
                    <StatCard label="Mechanics" value={stats.users.mechanics} color={mode === "dark" ? "bg-orange-500/10" : "bg-orange-100"} icon={<Wrench className="w-4 h-4 text-orange-600" />} mode={mode} />
                    <StatCard label="New This Week" value={stats.users.recentSignups} color={mode === "dark" ? "bg-green-500/10" : "bg-green-100"} icon={<Clock className="w-4 h-4 text-green-600" />} mode={mode} />
                  </div>
                </div>

                {/* Vessel Stats */}
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <Ship className="w-5 h-5 text-captain-600" />
                    Vessels
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Vessels" value={stats.vessels.total} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} mode={mode} />
                  </div>
                </div>

                {/* Work Order Stats */}
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <FileText className="w-5 h-5 text-captain-600" />
                    Work Orders
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total" value={stats.workOrders.total} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} />
                    <StatCard label="In Progress" value={stats.workOrders.byStatus.in_progress} color={mode === "dark" ? "bg-yellow-500/10" : "bg-yellow-100"} mode={mode} />
                    <StatCard label="Completed" value={stats.workOrders.byStatus.completed} color={mode === "dark" ? "bg-green-500/10" : "bg-green-100"} mode={mode} />
                    <StatCard label="New This Week" value={stats.workOrders.recentCreated} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} mode={mode} />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
                    <MiniStatCard label="Quote Requested" value={stats.workOrders.byStatus.quote_requested} mode={mode} />
                    <MiniStatCard label="Quoted" value={stats.workOrders.byStatus.quoted} mode={mode} />
                    <MiniStatCard label="In Progress" value={stats.workOrders.byStatus.in_progress} mode={mode} />
                    <MiniStatCard label="Completed" value={stats.workOrders.byStatus.completed} mode={mode} />
                    <MiniStatCard label="Declined" value={stats.workOrders.byStatus.declined} mode={mode} />
                    <MiniStatCard label="Cancelled" value={stats.workOrders.byStatus.cancelled} mode={mode} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="flex gap-6">
            {/* Category Sidebar */}
            <div className="w-56 flex-shrink-0">
              <nav className="space-y-1">
                {(Object.entries(CATEGORY_INFO) as [SettingCategory, typeof CATEGORY_INFO[SettingCategory]][]).map(
                  ([category, info]) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        activeCategory === category
                          ? "bg-captain-50 text-captain-700"
                          : mode === "dark" ? "text-gray-400 hover:bg-white/5" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className={activeCategory === category ? "text-captain-600" : "text-gray-400"}>
                        {info.icon}
                      </span>
                      <span className="font-medium text-sm">{info.label}</span>
                      {activeCategory === category && (
                        <ChevronRight className="w-4 h-4 ml-auto text-captain-400" />
                      )}
                    </button>
                  )
                )}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1">
              <div className="mb-4">
                <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                  {CATEGORY_INFO[activeCategory].label} Settings
                </h3>
                <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>{CATEGORY_INFO[activeCategory].description}</p>
              </div>

              {!allSettings && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {allSettings && (
                <div className="space-y-4">
                  {getSettingsByCategory(activeCategory).length === 0 ? (
                    <div className={`text-center py-8 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      No settings in this category
                    </div>
                  ) : (
                    getSettingsByCategory(activeCategory).map((setting) => (
                      <SettingRow
                        key={setting.key}
                        setting={setting}
                        isEditing={editingKey === setting.key}
                        editValue={editValue}
                        saveStatus={saveStatus}
                        onEdit={() => handleEditClick(setting.key, setting.value)}
                        onCancel={() => setEditingKey(null)}
                        onSave={() => handleSave(setting.key)}
                        onReset={() => handleReset(setting.key)}
                        onValueChange={setEditValue}
                        mode={mode}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <AnnouncementManager />
        )}

        {/* Donations Tab */}
        {activeTab === "donations" && (
          <div className="space-y-6">
            {!donationStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <Heart className="w-5 h-5 text-captain-600" />
                    Donation Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatCard label="Total Raised" value={donationStats.totalRaised} color={mode === "dark" ? "bg-emerald-500/10" : "bg-emerald-100"} icon={<span className={`text-sm font-bold ${mode === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>$</span>} mode={mode} />
                    <StatCard label="Donors" value={donationStats.donorCount} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} icon={<Heart className="w-4 h-4 text-captain-600" />} mode={mode} />
                    <StatCard label="Avg Donation" value={donationStats.donorCount > 0 ? Math.round(donationStats.totalRaised / donationStats.donorCount) : 0} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} />
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4`}>All Donations</h3>
                  {!donations || donations.length === 0 ? (
                    <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>No donations yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={mode === "dark" ? "text-gray-400 border-b border-white/10" : "text-gray-500 border-b border-gray-200"}>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Name</th>
                            <th className="text-left py-2 pr-4">Email</th>
                            <th className="text-right py-2 pr-4">Amount</th>
                            <th className="text-center py-2 pr-4">Email Sent</th>
                            <th className="text-center py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((d) => (
                            <tr key={d._id} className={mode === "dark" ? "border-b border-white/5" : "border-b border-gray-100"}>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{new Date(d.createdAt).toLocaleDateString()}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{d.name}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>{d.email}</td>
                              <td className={`py-2 pr-4 text-right font-medium ${mode === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                                {editingDonationId === d._id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={mode === "dark" ? "text-gray-400" : "text-gray-500"}>$</span>
                                    <input
                                      type="number"
                                      value={editDonationAmount}
                                      onChange={(e) => setEditDonationAmount(e.target.value)}
                                      className={`w-24 px-2 py-1 border rounded text-right text-sm ${mode === "dark" ? "bg-white/5 border-white/10 text-white" : "border-gray-300"} focus:ring-2 focus:ring-captain-500 focus:border-captain-500`}
                                      min="1"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleDonationSave}
                                      className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingDonationId(null)}
                                      className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  `$${d.amount}`
                                )}
                              </td>
                              <td className="py-2 pr-4 text-center">{d.confirmationEmailSent ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-yellow-500 mx-auto" />}</td>
                              <td className="py-2 text-center">
                                {confirmDeleteId === d._id ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`text-xs ${mode === "dark" ? "text-red-400" : "text-red-600"}`}>Delete?</span>
                                    <button
                                      onClick={() => handleDonationDelete(d._id)}
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleDonationEditClick(d._id, d.amount)}
                                      className={`p-1.5 rounded transition-colors ${mode === "dark" ? "text-gray-400 hover:text-captain-400 hover:bg-white/5" : "text-gray-400 hover:text-captain-600 hover:bg-gray-100"}`}
                                      title="Edit amount"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(d._id)}
                                      className={`p-1.5 rounded transition-colors ${mode === "dark" ? "text-gray-400 hover:text-red-400 hover:bg-white/5" : "text-gray-400 hover:text-red-600 hover:bg-gray-100"}`}
                                      title="Delete donation"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Waitlist Tab */}
        {activeTab === "waitlist" && (
          <div className="space-y-6">
            {waitlistCount === undefined ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <Users className="w-5 h-5 text-captain-600" />
                    Waitlist Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Signups" value={waitlistCount} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} icon={<Users className="w-4 h-4 text-captain-600" />} mode={mode} />
                    <StatCard label="Owners" value={waitlistSignups?.filter((s) => s.roleInterest === "owner").length ?? 0} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} icon={<Ship className="w-4 h-4 text-blue-600" />} mode={mode} />
                    <StatCard label="Mechanics" value={waitlistSignups?.filter((s) => s.roleInterest === "mechanic").length ?? 0} color={mode === "dark" ? "bg-orange-500/10" : "bg-orange-100"} icon={<Wrench className="w-4 h-4 text-orange-600" />} mode={mode} />
                    <StatCard label="Both" value={waitlistSignups?.filter((s) => s.roleInterest === "both").length ?? 0} color={mode === "dark" ? "bg-purple-500/10" : "bg-purple-100"} mode={mode} />
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4`}>All Signups</h3>
                  {!waitlistSignups || waitlistSignups.length === 0 ? (
                    <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>No signups yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={mode === "dark" ? "text-gray-400 border-b border-white/10" : "text-gray-500 border-b border-gray-200"}>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Name</th>
                            <th className="text-left py-2 pr-4">Email</th>
                            <th className="text-left py-2 pr-4">Role</th>
                            <th className="text-left py-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitlistSignups.map((s) => (
                            <tr key={s._id} className={mode === "dark" ? "border-b border-white/5" : "border-b border-gray-100"}>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{new Date(s.createdAt).toLocaleDateString()}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{s.name}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>{s.email}</td>
                              <td className="py-2 pr-4">
                                <GlassBadge color={s.roleInterest === "owner" ? "blue" : s.roleInterest === "mechanic" ? "yellow" : "green"}>
                                  {s.roleInterest === "both" ? "Both" : s.roleInterest === "owner" ? "Owner" : "Mechanic"}
                                </GlassBadge>
                              </td>
                              <td className={`py-2 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>{s.source ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Raffle Tab */}
        {activeTab === "raffle" && (
          <div className="space-y-6">
            {!raffleStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                    <Ticket className="w-5 h-5 text-captain-600" />
                    Raffle Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Pot Total" value={raffleStats.potTotal} color={mode === "dark" ? "bg-emerald-500/10" : "bg-emerald-100"} icon={<span className={`text-sm font-bold ${mode === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>$</span>} mode={mode} />
                    <StatCard label="Entries" value={raffleStats.totalEntries} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} mode={mode} />
                    <StatCard label="Tickets Sold" value={raffleStats.totalTickets} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} icon={<Ticket className="w-4 h-4 text-blue-600" />} mode={mode} />
                    <StatCard label="Winner Pot" value={raffleStats.winnerPot} color={mode === "dark" ? "bg-yellow-500/10" : "bg-yellow-100"} icon={<span className={`text-sm font-bold ${mode === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>$</span>} mode={mode} />
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4`}>All Entries</h3>
                  {!raffleEntries || raffleEntries.length === 0 ? (
                    <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>No raffle entries.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={mode === "dark" ? "text-gray-400 border-b border-white/10" : "text-gray-500 border-b border-gray-200"}>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Name</th>
                            <th className="text-left py-2 pr-4">Email</th>
                            <th className="text-left py-2 pr-4">Tier</th>
                            <th className="text-right py-2 pr-4">Tickets</th>
                            <th className="text-right py-2 pr-4">Amount</th>
                            <th className="text-center py-2 pr-4">Email Sent</th>
                            <th className="text-center py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raffleEntries.map((e) => (
                            <tr key={e._id} className={mode === "dark" ? "border-b border-white/5" : "border-b border-gray-100"}>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{new Date(e.createdAt).toLocaleDateString()}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{e.name}</td>
                              <td className={`py-2 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>{e.email}</td>
                              <td className="py-2 pr-4"><GlassBadge color="blue">{e.ticketTier}</GlassBadge></td>
                              <td className={`py-2 pr-4 text-right ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                                {editingRaffleId === e._id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <input
                                      type="number"
                                      value={editRaffleTickets}
                                      onChange={(ev) => setEditRaffleTickets(ev.target.value)}
                                      className={`w-20 px-2 py-1 border rounded text-right text-sm ${mode === "dark" ? "bg-white/5 border-white/10 text-white" : "border-gray-300"} focus:ring-2 focus:ring-captain-500 focus:border-captain-500`}
                                      min="1"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleRaffleSave}
                                      className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingRaffleId(null)}
                                      className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  e.ticketCount
                                )}
                              </td>
                              <td className={`py-2 pr-4 text-right font-medium ${mode === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>${e.amount}</td>
                              <td className="py-2 pr-4 text-center">{e.confirmationEmailSent ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-yellow-500 mx-auto" />}</td>
                              <td className="py-2 text-center">
                                {confirmDeleteId === e._id ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`text-xs ${mode === "dark" ? "text-red-400" : "text-red-600"}`}>Delete?</span>
                                    <button
                                      onClick={() => handleRaffleDelete(e._id)}
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleRaffleEditClick(e._id, e.ticketCount)}
                                      className={`p-1.5 rounded transition-colors ${mode === "dark" ? "text-gray-400 hover:text-captain-400 hover:bg-white/5" : "text-gray-400 hover:text-captain-600 hover:bg-gray-100"}`}
                                      title="Edit ticket count"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(e._id)}
                                      className={`p-1.5 rounded transition-colors ${mode === "dark" ? "text-gray-400 hover:text-red-400 hover:bg-white/5" : "text-gray-400 hover:text-red-600 hover:bg-gray-100"}`}
                                      title="Delete entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AuditLogViewer />
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  icon,
  mode,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
  mode: "light" | "dark";
}) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>{label}</span>
        {icon}
      </div>
      <span className={`text-2xl font-bold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

// Mini Stat Card Component
function MiniStatCard({ label, value, mode }: { label: string; value: number; mode: "light" | "dark" }) {
  return (
    <div className={`${mode === "dark" ? "bg-white/5" : "bg-gray-50"} rounded-lg p-3 text-center`}>
      <span className={`block text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{value}</span>
      <span className={`text-xs ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}

// Setting Row Component
function SettingRow({
  setting,
  isEditing,
  editValue,
  saveStatus,
  onEdit,
  onCancel,
  onSave,
  onReset,
  onValueChange,
  mode,
}: {
  setting: SettingConfig;
  isEditing: boolean;
  editValue: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
  onValueChange: (value: string) => void;
  mode: "light" | "dark";
}) {
  const formatSettingKey = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={`${mode === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className={`font-medium ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{formatSettingKey(setting.key)}</h4>
          <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"} mt-0.5`}>{setting.description}</p>
        </div>

        <div className="ml-4 flex items-center gap-2">
          {isEditing ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  type={setting.inputType === "number" ? "number" : "text"}
                  value={editValue}
                  onChange={(e) => onValueChange(e.target.value)}
                  min={setting.min}
                  max={setting.max}
                  className={`w-24 px-3 py-1.5 border ${mode === "dark" ? "bg-white/5 border-white/10 text-white" : "border-gray-300"} rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500`}
                  autoFocus
                />
                {setting.unit && <span className="text-sm text-gray-500">{setting.unit}</span>}
              </div>
              <button
                onClick={onSave}
                disabled={saveStatus === "saving"}
                className={`p-1.5 text-green-600 ${mode === "dark" ? "hover:bg-green-500/10" : "hover:bg-green-50"} rounded-lg transition-colors disabled:opacity-50`}
              >
                {saveStatus === "saving" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onCancel}
                className={`p-1.5 text-gray-400 ${mode === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"} rounded-lg transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className={`flex items-center gap-2 ${mode === "dark" ? "bg-white/10" : "bg-gray-100"} px-3 py-1.5 rounded-lg`}>
                <span className={`font-mono text-sm font-medium ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{setting.value}</span>
                {setting.unit && <span className="text-sm text-gray-500">{setting.unit}</span>}
              </div>
              <button
                onClick={onEdit}
                className={`px-3 py-1.5 text-sm text-captain-600 ${mode === "dark" ? "hover:bg-captain-500/10" : "hover:bg-captain-50"} rounded-lg transition-colors font-medium`}
              >
                Edit
              </button>
              {!setting.isDefault && (
                <button
                  onClick={onReset}
                  className={`px-3 py-1.5 text-sm text-gray-500 ${mode === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"} rounded-lg transition-colors`}
                  title="Reset to default"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {setting.updatedAt && (
        <div className="mt-2 text-xs text-gray-400">
          Last updated: {new Date(setting.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
