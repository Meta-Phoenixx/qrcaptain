"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
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
  Layers,
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

export function AdminControlPanel({ initialTab }: { initialTab?: "overview" | "settings" | "announcements" | "donations" | "waitlist" | "raffle" | "audit" | "fleets" | "users" }) {
  const router = useRouter();
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "announcements" | "donations" | "waitlist" | "raffle" | "audit" | "fleets" | "users">(initialTab ?? "overview");
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
  const a = api as any;
  const fleetList = useQuery(a.admin.listAllFleets);
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
    { id: "fleets" as const, label: "Fleets", icon: Layers },
    { id: "users" as const, label: "Users", icon: Users },
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
                  <button
                    onClick={() => setActiveTab("waitlist")}
                    className={`w-full text-left text-lg font-semibold mb-4 flex items-center gap-2 transition-opacity hover:opacity-70 ${mode === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    <Users className="w-5 h-5 text-captain-600" />
                    Users
                    <ChevronRight className="w-4 h-4 text-captain-400 ml-auto" />
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats.users.total} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} onClick={() => setActiveTab("waitlist")} />
                    <StatCard label="Owners" value={stats.users.owners} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} icon={<Ship className="w-4 h-4 text-blue-600" />} mode={mode} onClick={() => setActiveTab("waitlist")} />
                    <StatCard label="Mechanics" value={stats.users.mechanics} color={mode === "dark" ? "bg-orange-500/10" : "bg-orange-100"} icon={<Wrench className="w-4 h-4 text-orange-600" />} mode={mode} onClick={() => setActiveTab("waitlist")} />
                    <StatCard label="New This Week" value={stats.users.recentSignups} color={mode === "dark" ? "bg-green-500/10" : "bg-green-100"} icon={<Clock className="w-4 h-4 text-green-600" />} mode={mode} onClick={() => setActiveTab("waitlist")} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <StatCard label="Fleet Managers" value={stats.users.fleetManagers} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} icon={<Layers className="w-4 h-4 text-captain-600" />} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="Captains" value={stats.users.captains} color={mode === "dark" ? "bg-purple-500/10" : "bg-purple-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                  </div>
                </div>

                {/* Vessel Stats */}
                <div>
                  <div className={`text-lg font-semibold mb-4 flex items-center gap-2 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                    <Ship className="w-5 h-5 text-captain-600" />
                    Vessels
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Vessels" value={stats.vessels.total} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="In Service" value={stats.vessels.inService} color={mode === "dark" ? "bg-green-500/10" : "bg-green-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="In Maintenance" value={stats.vessels.inMaintenance} color={mode === "dark" ? "bg-yellow-500/10" : "bg-yellow-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="Out of Service" value={stats.vessels.outOfService} color={mode === "dark" ? "bg-red-500/10" : "bg-red-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <StatCard label="In Storage" value={stats.vessels.inStorage} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                  </div>
                </div>

                {/* Fleet Stats */}
                <div>
                  <button
                    onClick={() => setActiveTab("fleets")}
                    className={`w-full text-left text-lg font-semibold mb-4 flex items-center gap-2 transition-opacity hover:opacity-70 ${mode === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    <Layers className="w-5 h-5 text-captain-600" />
                    Fleets
                    <ChevronRight className="w-4 h-4 text-captain-400 ml-auto" />
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Fleets" value={stats.fleets.total} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} icon={<Layers className="w-4 h-4 text-captain-600" />} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="Fleet Vessels" value={stats.fleets.vesselCount} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="Standalone Vessels" value={stats.fleets.standaloneVessels} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                    <StatCard label="Active Mechanic Auths" value={stats.fleets.activeMechanicAuthorizations} color={mode === "dark" ? "bg-orange-500/10" : "bg-orange-100"} mode={mode} onClick={() => setActiveTab("fleets")} />
                  </div>
                </div>

                {/* Work Order Stats */}
                <div>
                  <div className={`text-lg font-semibold mb-4 flex items-center gap-2 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                    <FileText className="w-5 h-5 text-captain-600" />
                    Work Orders
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total" value={stats.workOrders.total} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} onClick={() => setActiveTab("audit")} />
                    <StatCard label="In Progress" value={stats.workOrders.byStatus.in_progress} color={mode === "dark" ? "bg-yellow-500/10" : "bg-yellow-100"} mode={mode} onClick={() => setActiveTab("audit")} />
                    <StatCard label="Completed" value={stats.workOrders.byStatus.completed} color={mode === "dark" ? "bg-green-500/10" : "bg-green-100"} mode={mode} onClick={() => setActiveTab("audit")} />
                    <StatCard label="New This Week" value={stats.workOrders.recentCreated} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} mode={mode} onClick={() => setActiveTab("audit")} />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
                    <MiniStatCard label="Quote Requested" value={stats.workOrders.byStatus.quote_requested} mode={mode} onClick={() => setActiveTab("audit")} />
                    <MiniStatCard label="Quoted" value={stats.workOrders.byStatus.quoted} mode={mode} onClick={() => setActiveTab("audit")} />
                    <MiniStatCard label="In Progress" value={stats.workOrders.byStatus.in_progress} mode={mode} onClick={() => setActiveTab("audit")} />
                    <MiniStatCard label="Completed" value={stats.workOrders.byStatus.completed} mode={mode} onClick={() => setActiveTab("audit")} />
                    <MiniStatCard label="Declined" value={stats.workOrders.byStatus.declined} mode={mode} onClick={() => setActiveTab("audit")} />
                    <MiniStatCard label="Cancelled" value={stats.workOrders.byStatus.cancelled} mode={mode} onClick={() => setActiveTab("audit")} />
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

        {/* Fleets Tab */}
        {activeTab === "fleets" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Summary Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Fleets" value={stats.fleets.total} color={mode === "dark" ? "bg-captain-500/10" : "bg-captain-100"} icon={<Layers className="w-4 h-4 text-captain-600" />} mode={mode} />
                <StatCard label="Fleet Vessels" value={stats.fleets.vesselCount} color={mode === "dark" ? "bg-blue-500/10" : "bg-blue-100"} icon={<Ship className="w-4 h-4 text-blue-600" />} mode={mode} />
                <StatCard label="Standalone Vessels" value={stats.fleets.standaloneVessels} color={mode === "dark" ? "bg-white/5" : "bg-gray-100"} mode={mode} />
                <StatCard label="Active Mechanic Auths" value={stats.fleets.activeMechanicAuthorizations} color={mode === "dark" ? "bg-orange-500/10" : "bg-orange-100"} icon={<Wrench className="w-4 h-4 text-orange-600" />} mode={mode} />
              </div>
            )}

            {/* Fleet Type Breakdown */}
            {stats && (
              <GlassCard className="p-6">
                <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                  <Layers className="w-5 h-5 text-captain-600" />
                  Fleet Types
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(["charter", "fishing", "racing", "leisure", "commercial"] as const).map((type) => (
                    <div key={type} className={`${mode === "dark" ? "bg-white/5" : "bg-gray-50"} rounded-lg p-3 text-center`}>
                      <span className={`block text-xl font-bold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                        {stats.fleets.byType[type]}
                      </span>
                      <span className={`text-xs capitalize ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>{type}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* All Fleets Table */}
            <GlassCard className="p-6">
              <h3 className={`text-lg font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"} mb-4 flex items-center gap-2`}>
                <Layers className="w-5 h-5 text-captain-600" />
                All Fleets
              </h3>
              {!fleetList ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : fleetList.length === 0 ? (
                <div className={`text-center py-12 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No fleets registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${mode === "dark" ? "border-white/10" : "border-gray-200"}`}>
                        {["Fleet", "Owner", "Type", "Vessels", "Mechanics", "Created"].map((col) => (
                          <th key={col} className={`pb-3 text-left font-semibold ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fleetList.map((fleet: any) => {
                        const fleetTypeBadgeColor: Record<string, "blue" | "green" | "red" | "yellow"> = {
                          charter: "blue",
                          fishing: "green",
                          racing: "red",
                          leisure: "blue",
                          commercial: "yellow",
                        };
                        return (
                          <tr key={fleet._id} className={`${mode === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                            <td className="py-3 pr-4">
                              <button
                                onClick={() => router.push("/fleet")}
                                className="font-medium text-captain-600 hover:text-captain-500 transition-colors text-left"
                              >
                                {fleet.name}
                              </button>
                            </td>
                            <td className={`py-3 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                              <div>{fleet.ownerName}</div>
                              <div className={`text-xs ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>{fleet.ownerEmail}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <GlassBadge color={fleetTypeBadgeColor[fleet.fleetType] ?? "blue"}>
                                {fleet.fleetType}
                              </GlassBadge>
                            </td>
                            <td className={`py-3 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{fleet.vesselCount}</td>
                            <td className={`py-3 pr-4 ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}>{fleet.mechanicCount}</td>
                            <td className={`py-3 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                              {new Date(fleet._creationTime).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AuditLogViewer />
          </div>
        )}

        {activeTab === "users" && <UsersTab mode={mode} />}
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
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
  mode: "light" | "dark";
  onClick?: () => void;
}) {
  return (
    <div
      className={`${color} rounded-lg p-4 ${onClick ? "cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 select-none" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>{label}</span>
        <div className="flex items-center gap-1">
          {icon}
          {onClick && <ChevronRight className={`w-3.5 h-3.5 ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`} />}
        </div>
      </div>
      <span className={`text-2xl font-bold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

// Mini Stat Card Component
function MiniStatCard({ label, value, mode, onClick }: { label: string; value: number; mode: "light" | "dark"; onClick?: () => void }) {
  return (
    <div
      className={`${mode === "dark" ? "bg-white/5" : "bg-gray-50"} rounded-lg p-3 text-center ${onClick ? "cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 select-none" : ""}`}
      onClick={onClick}
    >
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

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab({ mode }: { mode: string }) {
  const a = api as any;
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [resetStates, setResetStates] = useState<Record<string, "idle" | "loading" | "sent" | "error">>({});
  const [roleChangeStates, setRoleChangeStates] = useState<Record<string, boolean>>({});
  const [deleteStates, setDeleteStates] = useState<Record<string, "idle" | "loading">>({});

  const users = useQuery(a.admin.listAllUsers, { role: roleFilter || undefined, search: search || undefined }) ?? [];
  const expandedDetails = useQuery(
    expandedUserId ? a.admin.getUserDetails : "skip",
    expandedUserId ? { userId: expandedUserId } : "skip"
  );
  const startImpersonation = useMutation(a.admin.startImpersonation);
  const requestPasswordReset = useAction(a.adminActions.adminRequestPasswordReset);
  const changeUserRole = useMutation(a.users.adminChangeUserRole);
  const deleteUser = useMutation(a.users.adminDeleteUser);

  const dark = mode === "dark";

  async function handleImpersonate(userId: string) {
    setImpersonating(userId);
    try {
      await startImpersonation({ targetUserId: userId });
      router.replace("/my-dashboard");
    } catch (e) {
      console.error(e);
      setImpersonating(null);
    }
  }

  async function handlePasswordReset(userId: string) {
    setResetStates((prev) => ({ ...prev, [userId]: "loading" }));
    try {
      await requestPasswordReset({ targetUserId: userId });
      setResetStates((prev) => ({ ...prev, [userId]: "sent" }));
      setTimeout(() => setResetStates((prev) => ({ ...prev, [userId]: "idle" })), 4000);
    } catch (e) {
      console.error(e);
      setResetStates((prev) => ({ ...prev, [userId]: "error" }));
      setTimeout(() => setResetStates((prev) => ({ ...prev, [userId]: "idle" })), 4000);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Permanently delete account for "${userName}"? This cannot be undone.`)) return;
    setDeleteStates((prev) => ({ ...prev, [userId]: "loading" }));
    try {
      await deleteUser({ targetUserId: userId as any });
      setExpandedUserId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete user. Please try again.");
    } finally {
      setDeleteStates((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!confirm(`Change this user's role to "${newRole}"? This takes effect immediately.`)) return;
    setRoleChangeStates((prev) => ({ ...prev, [userId]: true }));
    try {
      await changeUserRole({ targetUserId: userId, newRole: newRole as any });
    } catch (e) {
      console.error(e);
    } finally {
      setRoleChangeStates((prev) => ({ ...prev, [userId]: false }));
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400 border border-red-500/25",
    owner: "bg-captain-500/15 text-captain-300 border border-captain-500/25",
    mechanic: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    fleet_manager: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    captain: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
            dark
              ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-captain-500/50"
              : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-captain-500"
          }`}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={`px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
            dark
              ? "bg-white/[0.04] border-white/[0.08] text-white focus:border-captain-500/50"
              : "bg-white border-gray-200 text-gray-900 focus:border-captain-500"
          }`}
        >
          <option value="">All roles</option>
          <option value="owner">Owner</option>
          <option value="mechanic">Mechanic</option>
          <option value="fleet_manager">Fleet Manager</option>
          <option value="captain">Captain</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <p className={`text-xs ${dark ? "text-white/30" : "text-gray-400"}`}>{users.length} user{users.length !== 1 ? "s" : ""}</p>

      {/* User list */}
      <div className={`rounded-2xl border overflow-hidden ${dark ? "border-white/[0.07]" : "border-gray-200"}`}>
        {users.length === 0 ? (
          <div className="py-16 text-center">
            <p className={dark ? "text-white/30" : "text-gray-400"}>No users found</p>
          </div>
        ) : (
          users.map((u: any, i: number) => {
            const isExpanded = expandedUserId === u._id;
            const isLast = i === users.length - 1;
            const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Unknown";
            return (
              <div key={u._id} className={!isLast ? (dark ? "border-b border-white/[0.05]" : "border-b border-gray-100") : ""}>
                {/* Row */}
                <div
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer ${
                    dark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"
                  } ${isExpanded ? (dark ? "bg-white/[0.04]" : "bg-captain-50") : ""}`}
                  onClick={() => setExpandedUserId(isExpanded ? null : u._id)}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${dark ? "bg-captain-500/20 text-captain-300" : "bg-captain-100 text-captain-700"}`}>
                    {(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "") || "?"}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-900"}`}>{name}</p>
                    <p className={`text-xs truncate ${dark ? "text-white/35" : "text-gray-500"}`}>{u.email}</p>
                  </div>

                  {/* Role badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 ${ROLE_COLORS[u.role ?? ""] ?? "bg-gray-500/10 text-gray-400"}`}>
                    {u.role ?? "—"}
                  </span>

                  {/* Created */}
                  <span className={`text-xs flex-shrink-0 hidden sm:block ${dark ? "text-white/25" : "text-gray-400"}`}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </span>

                  {/* Impersonate button */}
                  {u.role !== "admin" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleImpersonate(u._id); }}
                      disabled={impersonating === u._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-captain-500/15 text-captain-300 hover:bg-captain-500/25 transition-colors text-xs font-medium flex-shrink-0 disabled:opacity-50"
                    >
                      {impersonating === u._id ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      View As
                    </button>
                  )}

                  {/* Expand chevron */}
                  <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${dark ? "text-white/20" : "text-gray-300"} ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className={`px-5 pb-5 pt-2 border-t ${dark ? "border-white/[0.05] bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"}`}>
                    {!expandedDetails ? (
                      <div className="py-6 flex justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-captain-500/30 border-t-captain-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4 mt-2">
                        {/* Admin Actions */}
                        <div className={`rounded-xl border p-4 space-y-3 ${dark ? "border-white/[0.07] bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-white/30" : "text-gray-400"}`}>Admin Actions</p>

                          <div className="flex flex-wrap gap-2 items-center">
                            {/* Password Reset */}
                            {(() => {
                              const state = resetStates[expandedUserId!] ?? "idle";
                              return (
                                <button
                                  onClick={() => handlePasswordReset(expandedUserId!)}
                                  disabled={state === "loading" || state === "sent"}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
                                    state === "sent"
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                      : state === "error"
                                      ? "bg-red-500/15 text-red-400 border border-red-500/25"
                                      : dark
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                                      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                  }`}
                                >
                                  {state === "loading" ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                  ) : state === "sent" ? (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                                  )}
                                  {state === "sent" ? "Email Sent" : state === "error" ? "Failed — Retry" : "Send Password Reset"}
                                </button>
                              );
                            })()}

                            {/* Role Change */}
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs ${dark ? "text-white/30" : "text-gray-400"}`}>Change role:</span>
                              <select
                                defaultValue=""
                                disabled={roleChangeStates[expandedUserId!]}
                                onChange={(e) => {
                                  if (e.target.value) handleRoleChange(expandedUserId!, e.target.value);
                                  e.target.value = "";
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs border outline-none transition-colors disabled:opacity-50 ${
                                  dark
                                    ? "bg-white/[0.06] border-white/[0.10] text-white"
                                    : "bg-white border-gray-200 text-gray-800"
                                }`}
                              >
                                <option value="" disabled>Select role…</option>
                                <option value="owner">Owner</option>
                                <option value="mechanic">Mechanic</option>
                                <option value="fleet_manager">Fleet Manager</option>
                                <option value="admin">Admin</option>
                              </select>
                              {roleChangeStates[expandedUserId!] && (
                                <svg className="w-3.5 h-3.5 animate-spin text-captain-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                              )}
                            </div>

                            {/* Delete Account */}
                            {u.role !== "admin" && (
                              <button
                                onClick={() => handleDeleteUser(expandedUserId!, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email)}
                                disabled={deleteStates[expandedUserId!] === "loading"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-medium ml-auto disabled:opacity-50"
                              >
                                {deleteStates[expandedUserId!] === "loading" ? (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                )}
                                Delete Account
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Profile fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: "Company", value: expandedDetails.user.companyName },
                            { label: "Onboarding", value: expandedDetails.user.onboardingCompleted ? "Complete" : "Pending" },
                            { label: "Active", value: expandedDetails.user.isActive !== false ? "Yes" : "No" },
                          ].map((f) => f.value && (
                            <div key={f.label} className={`px-3 py-2 rounded-lg ${dark ? "bg-white/[0.04]" : "bg-white border border-gray-200"}`}>
                              <p className={`text-[10px] font-medium uppercase tracking-wider mb-0.5 ${dark ? "text-white/30" : "text-gray-400"}`}>{f.label}</p>
                              <p className={`text-sm ${dark ? "text-white/70" : "text-gray-700"}`}>{f.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Vessels */}
                        {expandedDetails.vessels.length > 0 && (
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-white/40" : "text-gray-400"}`}>Vessels ({expandedDetails.vessels.length})</p>
                            <div className="space-y-1.5">
                              {expandedDetails.vessels.map((v: any) => (
                                <div key={v._id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${dark ? "bg-white/[0.03] text-white/60" : "bg-white border border-gray-200 text-gray-600"}`}>
                                  <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
                                  </svg>
                                  <span className="font-medium">{v.name}</span>
                                  <span className="opacity-50">{v.make} {v.model} {v.year}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent work orders */}
                        {expandedDetails.workOrders.length > 0 && (
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-white/40" : "text-gray-400"}`}>Recent Work Orders</p>
                            <div className="space-y-1.5">
                              {expandedDetails.workOrders.map((wo: any) => (
                                <div key={wo._id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs ${dark ? "bg-white/[0.03] text-white/50" : "bg-white border border-gray-200 text-gray-500"}`}>
                                  <span className="truncate">{wo.description || "—"}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${wo.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : wo.status === "in_progress" ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-white/30"}`}>
                                    {wo.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
