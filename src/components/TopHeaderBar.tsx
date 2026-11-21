import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AlertItem, AuthUser, LanguageCode } from '../shared/types';
import type { NavSection } from './SidebarNav';

interface TopHeaderBarProps {
  user: AuthUser;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  isOnline: boolean;
  pendingOfflineCount: number;
  alerts: AlertItem[];
  onMarkAlertRead: (id: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  onSignOut: () => void;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  user,
  language,
  onChangeLanguage,
  isOnline,
  pendingOfflineCount,
  alerts,
  onMarkAlertRead,
  onNavigate,
  onOpenMobileMenu,
  onSignOut,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [showBellPopover, setShowBellPopover] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const greeting = getGreeting(now.getHours());
  const roleLabel =
    user.role === 'ASHA_WORKER'
      ? 'ASHA Worker'
      : user.role === 'SUPERVISOR'
        ? 'ASHA Supervisor'
        : 'District Admin';

  return (
    <header className="sticky top-0 z-20 border-b border-[#E7EDF2] bg-white/95 backdrop-blur-md">
      <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Left: Mobile Menu + Greeting & District */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:bg-[#EDF5FF] lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-[#172B3A] sm:text-lg">
              {greeting}, {user.fullName}
            </h1>
            <p className="truncate text-xs text-[#718096]">
              {roleLabel} · {user.assignedArea ?? 'Devanahalli PHC Cluster'} ·{' '}
              <span className="font-mono tabular-nums">
                {now.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Sync State, Language Selector, Bell, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Connectivity Indicator */}
          <div
            className={`hidden items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:inline-flex whitespace-nowrap ${
              isOnline
                ? 'border-[#D1FAE5] bg-[#E8F7F1] text-[#087F75]'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isOnline
                ? pendingOfflineCount > 0
                  ? `Syncing (${pendingOfflineCount})`
                  : 'Online'
                : `Offline (${pendingOfflineCount})`}
            </span>
          </div>

          {/* Language Selector */}
          <div className="relative flex items-center">
            <Globe
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#087F75]"
              aria-hidden="true"
            />
            <select
              aria-label="Select Voice and UI Language"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
              className="min-h-[40px] max-w-[140px] truncate rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] pl-8 pr-3 text-xs font-semibold text-[#172B3A] focus:border-[#087F75] focus:outline-none sm:max-w-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {/* Notification Bell Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBellPopover((prev) => !prev);
                setShowProfileMenu(false);
              }}
              aria-label="Notifications and Alerts"
              aria-expanded={showBellPopover}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]/40 hover:bg-[#EDF5FF]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D94B4B] px-1 font-mono text-[10px] font-bold text-white">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {showBellPopover && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-[#E7EDF2] bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-2.5">
                  <span className="font-display text-sm font-bold text-[#172B3A]">
                    Notifications ({unreadAlerts.length} unread)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBellPopover(false);
                      onNavigate('ALERTS');
                    }}
                    className="text-xs font-semibold text-[#087F75] hover:underline"
                  >
                    Open Alerts
                  </button>
                </div>

                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#718096]">
                      No alert notifications at this time.
                    </p>
                  ) : (
                    alerts.slice(0, 5).map((al) => (
                      <div
                        key={al.id}
                        className={`rounded-xl border p-2.5 text-xs ${
                          al.isRead
                            ? 'border-[#E7EDF2] bg-[#F7F9FC]'
                            : al.severity === 'CRITICAL'
                              ? 'border-red-200 bg-red-50/70'
                              : 'border-amber-200 bg-amber-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-[#172B3A]">{al.title}</span>
                          {!al.isRead && (
                            <button
                              type="button"
                              onClick={() => onMarkAlertRead(al.id)}
                              title="Mark as read"
                              className="inline-flex items-center gap-0.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#087F75] border border-[#E7EDF2]"
                            >
                              <Check className="h-3 w-3" aria-hidden="true" />
                              Read
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-[#718096]">{al.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setShowBellPopover(false);
              }}
              aria-expanded={showProfileMenu}
              className="flex min-h-[40px] items-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-2 py-1 hover:border-[#087F75]/40"
            >
              <img
                src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
                alt={user.fullName}
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full object-cover"
              />
              <ChevronDown className="hidden h-3.5 w-3.5 text-[#718096] sm:block" aria-hidden="true" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E7EDF2] bg-white p-2 shadow-xl">
                <div className="border-b border-[#E7EDF2] px-3 py-2">
                  <div className="text-xs font-bold text-[#172B3A]">{user.fullName}</div>
                  <div className="font-mono text-[11px] text-[#718096]">
                    {user.workerCode ?? user.username}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('SETTINGS');
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
                >
                  <Settings className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                  Settings &amp; Accessibility
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('HELP');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
                >
                  <HelpCircle className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                  Help &amp; Guidelines
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSignOut();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[#E7EDF2] px-3 py-2 text-xs font-semibold text-[#D94B4B] hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
