import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsBucket, SavedVisitSummary, VisitType } from '../shared/types';

interface ReportsAnalyticsPageProps {
  visits: SavedVisitSummary[];
  analyticsRange: '7d' | '30d';
  analyticsBuckets: AnalyticsBucket[];
  onChangeRange: (r: '7d' | '30d') => void;
  onExportCsv: () => Promise<void>;
}

export const ReportsAnalyticsPage: React.FC<ReportsAnalyticsPageProps> = ({
  visits,
  analyticsRange,
  analyticsBuckets,
  onChangeRange,
  onExportCsv,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | VisitType>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const filteredVisits = useMemo(
    () => (typeFilter === 'ALL' ? visits : visits.filter((v) => v.visitType === typeFilter)),
    [typeFilter, visits],
  );

  const categoryData = useMemo(
    () => [
      { name: 'Pregnancy ANC', value: visits.filter((v) => v.visitType === 'ANC').length, color: '#087F75' },
      { name: 'Newborn Care', value: visits.filter((v) => v.visitType === 'NEWBORN').length, color: '#10A77A' },
      { name: 'Immunisation', value: visits.filter((v) => v.visitType === 'IMMUNISATION').length, color: '#60A5FA' },
    ],
    [visits],
  );

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    try {
      await onExportCsv();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#172B3A]">
              Field Reports &amp; Analytics
            </h2>
            <p className="mt-1 text-xs text-[#718096]">
              Aggregated visit completion trends, category distribution, and RBAC-scoped CSV/Print
              exports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadCsv()}
              disabled={isExporting}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#087F75] px-4 py-2 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV Report'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
            >
              <Printer className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Charts Row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4 lg:col-span-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                Visit Trend ({analyticsRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
              </h3>
              <div className="flex gap-1 rounded-lg bg-white p-1 border border-[#E7EDF2]">
                {(['7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRange(r)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      analyticsRange === r ? 'bg-[#087F75] text-white' : 'text-[#718096]'
                    }`}
                  >
                    {r === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsBuckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EDF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E7EDF2', fontSize: 12 }} />
                  <Bar dataKey="ANC" name="ANC" stackId="a" fill="#087F75" />
                  <Bar dataKey="NEWBORN" name="Newborn" stackId="a" fill="#10A77A" />
                  <Bar dataKey="IMMUNISATION" name="Immunisation" stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4 lg:col-span-4">
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              Category Mix ({visits.length} Total)
            </h3>
            <div className="mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#172B3A]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#172B3A]">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Register Table */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              Exportable Visit Summary
            </h3>
            <div className="flex gap-1">
              {(['ALL', 'ANC', 'NEWBORN', 'IMMUNISATION'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    typeFilter === t
                      ? 'bg-[#087F75] text-white'
                      : 'bg-[#F7F9FC] text-[#718096] border border-[#E7EDF2]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E7EDF2]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FC] text-[#718096]">
                <tr className="border-b border-[#E7EDF2]">
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Beneficiary</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Safety</th>
                  <th className="px-3 py-2.5 font-semibold">Next Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EDF2]">
                {filteredVisits.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{v.visitDate}</td>
                    <td className="px-3 py-2.5 font-semibold text-[#172B3A]">
                      {v.beneficiaryName}{' '}
                      <span className="font-mono text-[#718096]">· {v.beneficiaryCode}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{v.visitType}</td>
                    <td className="px-3 py-2.5">{v.recordStatus.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 font-bold">
                      <span
                        className={
                          v.dangerSignStatus === 'positive_detected'
                            ? 'text-[#D94B4B]'
                            : 'text-[#10A77A]'
                        }
                      >
                        {v.dangerSignStatus === 'positive_detected' ? 'REFERRED' : 'CLEAR'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{v.nextVisitDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
