import React, { useState } from 'react';
import { CheckCircle2, Eye, Globe, Shield, Volume2, Wifi } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AuthUser, LanguageCode, UserSettings } from '../shared/types';

interface SettingsPageProps {
  user: AuthUser;
  settings: UserSettings;
  onSaveSettings: (
    patch: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>,
  ) => Promise<void>;
  onTestVoiceSpeed: (speed: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  settings,
  onSaveSettings,
  onTestVoiceSpeed,
}) => {
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (
    patch: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>,
    label: string,
  ) => {
    setSaving(true);
    try {
      await onSaveSettings(patch);
      setSavedNotice(`${label} updated and saved.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">
            Settings &amp; Accessibility
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Personalize voice read-back speed, outdoor high-contrast visibility, larger field text,
            and offline synchronization preferences.
          </p>
        </div>

        {/* Profile Summary */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
          <div className="flex items-center gap-3.5">
            <img
              src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <div className="font-display text-base font-bold text-[#172B3A]">{user.fullName}</div>
              <div className="text-xs text-[#718096]">
                {user.role.replace(/_/g, ' ')} ·{' '}
                <span className="font-mono">{user.workerCode ?? user.username}</span> ·{' '}
                {user.assignedArea ?? 'Devanahalli PHC Cluster'}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8F7F1] px-3 py-1.5 text-xs font-bold text-[#087F75]">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Bearer Session Active
          </span>
        </div>

        {savedNotice && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-2.5 text-xs font-semibold text-[#087F75]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Language & Voice Speed */}
          <div className="space-y-4 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-5">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#172B3A]">
              <Globe className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>Language &amp; Speech Playback</span>
            </div>

            <div>
              <label htmlFor="settings-language" className="block text-xs font-semibold text-[#718096]">
                Preferred Primary Voice Language
              </label>
              <select
                id="settings-language"
                value={settings.preferredLanguage}
                disabled={saving}
                onChange={(e) =>
                  void handleToggle(
                    { preferredLanguage: e.target.value as LanguageCode },
                    'Preferred language',
                  )
                }
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E7EDF2] bg-white px-3 text-sm font-semibold text-[#172B3A]"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="settings-voice-speed" className="text-[#718096]">
                  Voice Read-Back Speed
                </label>
                <span className="font-mono font-bold text-[#087F75]">
                  {settings.voiceSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                id="settings-voice-speed"
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={settings.voiceSpeed}
                onChange={(e) =>
                  void handleToggle({ voiceSpeed: Number(e.target.value) }, 'Voice playback speed')
                }
                className="mt-2 w-full accent-[#087F75]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#718096]">Slower (0.75x) · Faster (1.35x)</span>
                <button
                  type="button"
                  onClick={() => onTestVoiceSpeed(settings.voiceSpeed)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EDF2] bg-white px-2.5 py-1 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Test Speed
                </button>
              </div>
            </div>
          </div>

          {/* Field Accessibility & Sync */}
          <div className="space-y-3 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-5">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#172B3A]">
              <Eye className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>Outdoor Sunlight &amp; Field Accessibility</span>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3">
              <div>
                <div className="text-sm font-bold text-[#172B3A]">High-Contrast Sunlight Mode</div>
                <div className="text-xs text-[#718096]">
                  Increases border weight and focus contrast for bright outdoor visits
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) =>
                  void handleToggle({ highContrast: e.target.checked }, 'High-contrast mode')
                }
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3">
              <div>
                <div className="text-sm font-bold text-[#172B3A]">Larger Text Size</div>
                <div className="text-xs text-[#718096]">
                  Enlarges interface and structured clinical card typography
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) =>
                  void handleToggle({ largeText: e.target.checked }, 'Larger text size')
                }
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Wifi className="mt-0.5 h-4 w-4 text-[#087F75]" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[#172B3A]">Offline Auto-Sync</div>
                  <div className="text-xs text-[#718096]">
                    Automatically sync queued visits when mobile connectivity returns
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.offlineAutoSync}
                onChange={(e) =>
                  void handleToggle({ offlineAutoSync: e.target.checked }, 'Offline auto-sync')
                }
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
