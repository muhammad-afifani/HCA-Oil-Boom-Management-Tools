import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppDatabase, AppSettings, LoanRequest, MapLocation, StockBatch } from '../types'
import { buildSeedDatabase } from '../data/seed'
import { makeId } from '../lib/id'

interface StoreState {
  db: AppDatabase

  // Locations
  addLocation: (loc: Omit<MapLocation, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateLocation: (id: string, patch: Partial<MapLocation>) => void
  deleteLocation: (id: string) => void

  // Stock batches
  addStockBatch: (batch: Omit<StockBatch, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateStockBatch: (id: string, patch: Partial<StockBatch>) => void
  deleteStockBatch: (id: string) => void

  // Loans
  addLoan: (loan: Omit<LoanRequest, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateLoan: (id: string, patch: Partial<LoanRequest>) => void
  deleteLoan: (id: string) => void

  // Settings & bulk
  updateSettings: (patch: Partial<AppSettings>) => void
  replaceDatabase: (db: AppDatabase) => void
  resetToSeedData: () => void
  clearAllData: () => void
}

const EMPTY_DB: AppDatabase = {
  version: 1,
  settings: {
    companyName: 'HCA Environment Department',
    siteName: 'HCA Site',
    centerLat: -0.8414299596012856,
    centerLng: 117.27831949619498,
    defaultUnitLengthMeters: 15,
  },
  locations: [],
  stockBatches: [],
  loans: [],
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      db: buildSeedDatabase(),

      addLocation: (loc) => {
        const id = makeId('loc')
        const now = new Date().toISOString()
        set((s) => ({
          db: {
            ...s.db,
            locations: [...s.db.locations, { ...loc, id, createdAt: now, updatedAt: now }],
          },
        }))
        return id
      },
      updateLocation: (id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            locations: s.db.locations.map((l) =>
              l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
            ),
          },
        })),
      deleteLocation: (id) =>
        set((s) => ({
          db: {
            ...s.db,
            locations: s.db.locations.filter((l) => l.id !== id),
            stockBatches: s.db.stockBatches.filter((b) => b.posId !== id),
          },
        })),

      addStockBatch: (batch) => {
        const id = makeId('stk')
        const now = new Date().toISOString()
        set((s) => ({
          db: {
            ...s.db,
            stockBatches: [...s.db.stockBatches, { ...batch, id, createdAt: now, updatedAt: now }],
          },
        }))
        return id
      },
      updateStockBatch: (id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            stockBatches: s.db.stockBatches.map((b) =>
              b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b,
            ),
          },
        })),
      deleteStockBatch: (id) =>
        set((s) => ({
          db: { ...s.db, stockBatches: s.db.stockBatches.filter((b) => b.id !== id) },
        })),

      addLoan: (loan) => {
        const id = makeId('loan')
        const now = new Date().toISOString()
        set((s) => ({
          db: { ...s.db, loans: [...s.db.loans, { ...loan, id, createdAt: now, updatedAt: now }] },
        }))
        return id
      },
      updateLoan: (id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            loans: s.db.loans.map((l) =>
              l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
            ),
          },
        })),
      deleteLoan: (id) =>
        set((s) => ({ db: { ...s.db, loans: s.db.loans.filter((l) => l.id !== id) } })),

      updateSettings: (patch) =>
        set((s) => ({ db: { ...s.db, settings: { ...s.db.settings, ...patch } } })),

      replaceDatabase: (db) => set({ db }),
      resetToSeedData: () => set({ db: buildSeedDatabase() }),
      clearAllData: () => set({ db: EMPTY_DB }),
    }),
    {
      name: 'hca-oil-boom-db',
      version: 1,
    },
  ),
)
