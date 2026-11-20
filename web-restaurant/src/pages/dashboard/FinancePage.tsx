import React from 'react';
import { Download } from 'lucide-react';
import { formatMoney } from '@zestroute/shared';
import { DataTable, EmptyState, PrimaryButton, SecondaryButton, StatusBadge, useToast } from '../../components/ui';
import { useRestaurantList } from '../../hooks/useRestaurantData';

interface FinancialTxRow {
  id: string;
  reference: string;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
  status: string;
  date: string;
}

export const FinancePage: React.FC = () => {
  const { showToast } = useToast();
  const { data } = useRestaurantList<FinancialTxRow>('finance');

  const grossTotal = data.reduce((sum, r) => sum + (r.grossMinor ?? 0), 0);
  const commissionTotal = data.reduce((sum, r) => sum + (r.commissionMinor ?? 0), 0);
  const netTotal = data.reduce((sum, r) => sum + (r.netMinor ?? 0), 0);
  const settledTotal = data
    .filter((r) => r.status === 'settled' || r.status === 'paid')
    .reduce((sum, r) => sum + (r.netMinor ?? 0), 0);
  const pendingTotal = Math.max(0, netTotal - settledTotal);

  const cards = [
    { label: 'Gross Sales', value: formatMoney(grossTotal) },
    { label: 'Platform Commission', value: formatMoney(commissionTotal) },
    { label: 'Net Earnings', value: formatMoney(netTotal) },
    { label: 'Pending Settlements', value: formatMoney(pendingTotal) },
    { label: 'Settled / Paid', value: formatMoney(settledTotal) },
    { label: 'Total Transactions', value: String(data.length) },
  ];

  const handleExportCsv = () => {
    const header = ['Reference', 'Gross (PKR)', 'Commission (PKR)', 'Net (PKR)', 'Status', 'Date'];
    const rows = data.map((r) => [
      r.reference,
      (r.grossMinor / 100).toFixed(2),
      (r.commissionMinor / 100).toFixed(2),
      (r.netMinor / 100).toFixed(2),
      r.status,
      r.date,
    ]);
    const csv = [header, ...rows].map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zestroute-finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Finance CSV report downloaded!', 'success');
  };

  const handlePrintPdf = () => {
    const win = window.open('', '_blank', 'width=820,height=640');
    if (!win) {
      showToast('Allow popups to print PDF report', 'error');
      return;
    }
    const tableRows = data
      .map(
        (r) =>
          `<tr><td>${r.reference}</td><td>${formatMoney(r.grossMinor)}</td><td>${formatMoney(r.commissionMinor)}</td><td>${formatMoney(r.netMinor)}</td><td>${r.status}</td><td>${r.date}</td></tr>`
      )
      .join('');
    win.document.write(`<!doctype html><html><head><title>ZestRoute Finance Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}</style>
      </head><body><h2>ZestRoute Restaurant Financial Statement</h2>
      <p>Gross: ${formatMoney(grossTotal)} | Commission: ${formatMoney(commissionTotal)} | Net: ${formatMoney(netTotal)}</p>
      <table><thead><tr><th>Reference</th><th>Gross</th><th>Commission</th><th>Net</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="6">No transactions yet</td></tr>'}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Financial Management &amp; Reports</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Live commission snapshots, order settlements, and downloadable CSV / PDF reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton leftIcon={<Download size={16} />} onClick={handleExportCsv}>
            Export CSV / Excel
          </SecondaryButton>
          <PrimaryButton leftIcon={<Download size={16} />} onClick={handlePrintPdf}>
            Print / Save PDF
          </PrimaryButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {cards.map((c) => (
          <div key={c.label} className="zr-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'ref', header: 'Reference', render: (r) => <strong>{r.reference}</strong> },
          { key: 'gross', header: 'Gross', render: (r) => formatMoney(r.grossMinor) },
          { key: 'comm', header: 'Commission', render: (r) => formatMoney(r.commissionMinor) },
          { key: 'net', header: 'Net', render: (r) => formatMoney(r.netMinor) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} tone={r.status === 'settled' ? 'success' : 'info'} /> },
          { key: 'date', header: 'Date', render: (r) => r.date },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No financial transactions yet"
            description="Completed order settlements, commissions, and payouts will appear here automatically."
          />
        }
      />
    </div>
  );
};
