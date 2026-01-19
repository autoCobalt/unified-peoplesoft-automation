/**
 * DataTableSection Component
 *
 * Displays the filtered transaction records in a scrollable table.
 * Features:
 * - Row count and queue label in toolbar
 * - Date match highlighting
 * - Status badges with appropriate colors
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import type { SmartFormRecord } from '../../../../types';
import { fadeIn } from '../../../../utils/motion';
import './DataTableSection.css';

/** Map status to CSS modifier class */
function getStatusClass(status: SmartFormRecord['status']): string {
  const classMap: Record<SmartFormRecord['status'], string> = {
    pending: 'sf-table-status-badge--pending',
    processing: 'sf-table-status-badge--processing',
    success: 'sf-table-status-badge--success',
    error: 'sf-table-status-badge--error',
  };
  return classMap[status];
}

export function DataTableSection() {
  const { state, filteredRecords } = useSmartForm();
  const { activeSubTab } = state;

  const queueLabel = activeSubTab === 'manager' ? 'Manager' : 'Other';
  const rowCount = filteredRecords.length;

  return (
    <motion.div
      className="sf-table-container"
      role="tabpanel"
      id={`sf-tabpanel-${activeSubTab}`}
      aria-labelledby={`sf-tab-${activeSubTab}`}
      {...fadeIn}
    >
      {/* Toolbar */}
      <div className="sf-table-toolbar">
        <div className="sf-table-toolbar-left">
          <span className="sf-table-row-count">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sf-table-toolbar-right">
          <span className="sf-table-queue-label">{queueLabel} Approval Queue</span>
        </div>
      </div>

      {/* Table */}
      <div className="sf-table-scroll-container">
        <table className="sf-table">
          <thead>
            <tr>
              <th className="sf-table-col-number">#</th>
              <th>Transaction</th>
              <th>Emplid</th>
              <th>Employee Name</th>
              <th>Current Effdt</th>
              <th>New Effdt</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="sf-table-empty">
                  No transactions in this queue
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const datesMatch = record.currentEffdt === record.newEffdt;
                return (
                  <tr
                    key={record.id}
                    className={datesMatch ? 'sf-table-row--date-match' : ''}
                  >
                    <td className="sf-table-col-number">{index + 1}</td>
                    <td className="sf-table-cell-mono">{record.transaction}</td>
                    <td className="sf-table-cell-mono">{record.emplid}</td>
                    <td>{record.employeeName}</td>
                    <td
                      className={`sf-table-cell-mono ${
                        datesMatch ? 'sf-table-cell--date-warning' : ''
                      }`}
                    >
                      {record.currentEffdt}
                    </td>
                    <td
                      className={`sf-table-cell-mono ${
                        datesMatch ? 'sf-table-cell--date-warning' : ''
                      }`}
                    >
                      {record.newEffdt}
                    </td>
                    <td>
                      <span className={`sf-table-status-badge ${getStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
