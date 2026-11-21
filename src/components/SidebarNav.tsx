import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardEdit,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AuthUser } from '../shared/types';

export type NavSection =
  | 'DASHBOARD'
  | 'VISIT'
  | 'WHAT_TO_ASK'
  | 'WHAT_TO_FILL'
  | 'HISTORY'
  | 'FOLLOWUPS'
  | 'ALERTS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'HELP'
  | 'SUPERVISOR';

interface SidebarNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: AuthUser;
  unreadAlertsCount: number;
  pendingFollowupsCount: number;
  onSignOut: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  user,
  unreadAlertsCount,
  pendingFollowupsCount,
  onSignOut,
}) => {
  const isSupervisorOrAdmin = user.role === 'SUPERVISOR' || user.role === 'ADMIN';

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'danger' | 'accent';
  }> = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'VISIT', label: 'Voice Visit', icon: Mic },
    { id: 'WHAT_TO_ASK', label: 'What to Ask', icon: CheckSquare },
    { id: 'WHAT_TO_FILL', label: 'What to Fill', icon: ClipboardEdit },
    { id: 'HISTORY', label: 'Visit Records', icon: ClipboardList },
    {
      id: 'FOLLOWUPS',
      label: 'Follow-ups',
      icon: CalendarCheck2,
      badge: pendingFollowupsCount > 0 ? pendingFollowupsCount : undefined,
      badgeTone: 'accent',
    },
    {
      id: 'ALERTS',
      label: 'Alerts',
      icon: AlertTriangle,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
      badgeTone: 'danger',
    },
    { id: 'REPORTS', label: 'Reports', icon: BarChart3 },
    ...(isSupervisorOrAdmin
      ? [{ id: 'SUPERVISOR' as NavSection, label: 'Supervisor Console', icon: ShieldCheck }]
      : []),
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
    { id: 'HELP', label: 'Help & Support', icon: HelpCircle },
  ];

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const renderNavContent = (isMobile = false) => {
    const isNarrow = !isMobile && collapsed;
    return (
      <div className="flex h-full flex-col bg-[#102B35] text-white">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => handleNavClick('DASHBOARD')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <img
              src="/icon.svg"
              alt="ASHA Voice Register"
              className="h-9 w-9 shrink-0 rounded-xl bg-white/10 p-1"
            />
            {!isNarrow && (
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold tracking-tight text-white">
                  ASHA Voice
                </div>
                <div className="truncate text-[11px] font-medium text-[#A5D8CE]">
                  Field Register AI
                </div>
              </div>
            )}
          </button>

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:flex"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav aria-label="Sidebar Navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={isNarrow ? item.label : undefined}
                onClick={() => handleNavClick(item.id)}
                className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#087F75] text-white shadow-sm'
                    : 'text-[#C6DCE0] hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-[#E8F7F1]' : 'text-[#8BB8BD] group-hover:text-white'
                    }`}
                  />
                  {!isNarrow && <span className="truncate">{item.label}</span>}
                </span>

                {!isNarrow && item.badge !== undefined && (
                  <span
                    className={`ml-2 inline-flex min-w-[22px] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                      item.badgeTone === 'danger'
                        ? 'bg-[#D94B4B] text-white'
                        : active
                          ? 'bg-[#E8F7F1] text-[#087F75]'
                          : 'bg-white/12 text-[#E8F7F1]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Worker Identity & Sign Out */}
        <div className="border-t border-white/10 p-3">
          {!isNarrow && (
            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
              <img
                src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
                alt={user.fullName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">{user.fullName}</div>
                <div className="truncate font-mono text-[10px] text-[#A5D8CE]">
                  {user.workerCode ?? user.role}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSignOut}
            title={isNarrow ? 'Sign Out' : undefined}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/12"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!isNarrow && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden shrink-0 transition-all duration-200 lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div
          className={`fixed inset-y-0 left-0 z-30 transition-all duration-200 ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {renderNavContent(false)}
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] shadow-2xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
