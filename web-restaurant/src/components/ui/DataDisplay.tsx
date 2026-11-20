import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SecondaryButton } from './Button';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyState,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
}) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="zr-table-wrap">
      <table className="zr-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, onPageChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
      Page {page} of {Math.max(1, totalPages)}
    </span>
    <div style={{ display: 'flex', gap: 8 }}>
      <SecondaryButton
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        leftIcon={<ChevronLeft size={16} />}
      >
        Previous
      </SecondaryButton>
      <SecondaryButton
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        rightIcon={<ChevronRight size={16} />}
      >
        Next
      </SecondaryButton>
    </div>
  </div>
);
