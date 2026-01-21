/**
 * SmartForm Mock Data
 *
 * Development-only mock data for testing the SmartForm workflow.
 * This file should NOT be included in production builds.
 *
 * Usage:
 *   import { generateMockRecords } from '../mocks/smartFormMockData';
 *   const records = generateMockRecords();
 */

import type { SmartFormRecord } from '../types';

/** Manager approval mock records (6 total) */
const MANAGER_RECORDS: SmartFormRecord[] = [
  {
    id: '1',
    transaction: 'TXN001',
    emplid: '12345',
    employeeName: 'John Doe',
    currentEffdt: '2025-01-01',
    newEffdt: '2025-02-01',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS001',
  },
  {
    id: '2',
    transaction: 'TXN002',
    emplid: '12346',
    employeeName: 'Jane Smith',
    currentEffdt: '2025-01-15',
    newEffdt: '2025-01-15', // Date match scenario
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS002',
  },
  {
    id: '3',
    transaction: 'TXN003',
    emplid: '12348',
    employeeName: 'Alice Williams',
    currentEffdt: '2025-02-01',
    newEffdt: '2025-02-15',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS004',
  },
  {
    id: '4',
    transaction: 'TXN004',
    emplid: '12351',
    employeeName: 'Bruce Wayne',
    currentEffdt: '2025-01-20',
    newEffdt: '2025-03-01',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS006',
  },
  {
    id: '5',
    transaction: 'TXN005',
    emplid: '12352',
    employeeName: 'Clark Kent',
    currentEffdt: '2025-02-10',
    newEffdt: '2025-02-10', // Date match scenario
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS007',
  },
  {
    id: '6',
    transaction: 'TXN006',
    emplid: '12353',
    employeeName: 'Peter Parker',
    currentEffdt: '2025-03-05',
    newEffdt: '2025-04-01',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS008',
  },
];

/** Other approval mock records (14 total) */
const OTHER_RECORDS: SmartFormRecord[] = [
  {
    id: '7',
    transaction: 'TXN007',
    emplid: '12347',
    employeeName: 'Bob Johnson',
    currentEffdt: '2025-01-10',
    newEffdt: '2025-03-01',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS003',
  },
  {
    id: '8',
    transaction: 'TXN008',
    emplid: '12349',
    employeeName: 'Charlie Brown',
    currentEffdt: '2025-01-20',
    newEffdt: '2025-04-01',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS005',
  },
  {
    id: '9',
    transaction: 'TXN009',
    emplid: '12350',
    employeeName: 'Diana Prince',
    currentEffdt: '2025-03-01',
    newEffdt: '2025-03-15',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS003', // Duplicate position number
  },
  {
    id: '10',
    transaction: 'TXN010',
    emplid: '12354',
    employeeName: 'Tony Stark',
    currentEffdt: '2025-01-05',
    newEffdt: '2025-02-01',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS009',
  },
  {
    id: '11',
    transaction: 'TXN011',
    emplid: '12355',
    employeeName: 'Natasha Romanoff',
    currentEffdt: '2025-02-15',
    newEffdt: '2025-03-15',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS010',
  },
  {
    id: '12',
    transaction: 'TXN012',
    emplid: '12356',
    employeeName: 'Steve Rogers',
    currentEffdt: '2025-01-25',
    newEffdt: '2025-02-25',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS011',
  },
  {
    id: '13',
    transaction: 'TXN013',
    emplid: '12357',
    employeeName: 'Wanda Maximoff',
    currentEffdt: '2025-03-10',
    newEffdt: '2025-04-10',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS012',
  },
  {
    id: '14',
    transaction: 'TXN014',
    emplid: '12358',
    employeeName: 'Vision Android',
    currentEffdt: '2025-02-20',
    newEffdt: '2025-03-20',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS013',
  },
  {
    id: '15',
    transaction: 'TXN015',
    emplid: '12359',
    employeeName: 'Thor Odinson',
    currentEffdt: '2025-01-30',
    newEffdt: '2025-02-28',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS014',
  },
  {
    id: '16',
    transaction: 'TXN016',
    emplid: '12360',
    employeeName: 'Loki Laufeyson',
    currentEffdt: '2025-03-15',
    newEffdt: '2025-04-15',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS015',
  },
  {
    id: '17',
    transaction: 'TXN017',
    emplid: '12361',
    employeeName: 'Scott Lang',
    currentEffdt: '2025-02-05',
    newEffdt: '2025-03-05',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS016',
  },
  {
    id: '18',
    transaction: 'TXN018',
    emplid: '12362',
    employeeName: 'Hope Van Dyne',
    currentEffdt: '2025-01-12',
    newEffdt: '2025-02-12',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS017',
  },
  {
    id: '19',
    transaction: 'TXN019',
    emplid: '12363',
    employeeName: 'Stephen Strange',
    currentEffdt: '2025-03-20',
    newEffdt: '2025-04-20',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS018',
  },
  {
    id: '20',
    transaction: 'TXN020',
    emplid: '12364',
    employeeName: 'Carol Danvers',
    currentEffdt: '2025-02-28',
    newEffdt: '2025-03-28',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS019',
  },
];

/**
 * Generate all mock SmartForm records.
 * Returns 6 Manager records and 14 Other records.
 */
export function generateMockRecords(): SmartFormRecord[] {
  return [...MANAGER_RECORDS, ...OTHER_RECORDS];
}

/**
 * Generate only Manager mock records.
 */
export function generateManagerMockRecords(): SmartFormRecord[] {
  return [...MANAGER_RECORDS];
}

/**
 * Generate only Other mock records.
 */
export function generateOtherMockRecords(): SmartFormRecord[] {
  return [...OTHER_RECORDS];
}
