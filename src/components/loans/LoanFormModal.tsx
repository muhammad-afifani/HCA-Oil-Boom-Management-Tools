import { useEffect, useMemo, useState } from 'react'
import { MapPin, CheckCircle2, Plus, X, AlertTriangle, PackageCheck, Clock } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Field'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useStore } from '../../store/useStore'
import type { LoanAllocation, LoanPriority, LoanRequest, LoanStatus } from '../../types'
import { getNearestPosOptions, getNearestStandbyOptions, getNearbyForecastSupply } from '../../lib/nearestPos'
import { formatDistance } from '../../lib/geo'
import { formatDateID, todayISO } from '../../lib/date'
import { loanStatusLabel } from '../../lib/inventory'
import { LocationFormModal } from '../master/LocationFormModal'
import { PosSelectionMap } from './PosSelectionMap'

const STATUSES: LoanStatus[] = ['Pending', 'Disetujui', 'Aktif', 'Selesai', 'Dibatalkan']
const PRIORITIES: LoanPriority[] = ['Normal', 'Tinggi', 'Urgent']

function emptyForm(defaultUnitLength: number, nextRequestNumber: string) {
  return {
    requestNumber: nextRequestNumber,
    requesterName: '',
    entity: '',
    ext: '',
    email: '',
    boomFunction: '',
    workDescription: '',
    siteLocationId: '',
    sourcePosId: '',
    quantityUnits: 1,
    unitLengthMeters: defaultUnitLength,
    additionalSources: [] as LoanAllocation[],
    requestDate: todayISO(),
    startDate: todayISO(),
    endDate: todayISO(),
    endDateTBC: false,
    status: 'Pending' as LoanStatus,
    priority: 'Normal' as LoanPriority,
    notes: '',
    approvedBy: '',
    actualReturnDate: '',
    returnedTo: 'pos' as 'pos' | 'standby',
  }
}

export function LoanFormModal({ open, loan, onClose }: { open: boolean; loan?: LoanRequest; onClose: () => void }) {
  const db = useStore((s) => s.db)
  const addLoan = useStore((s) => s.addLoan)
  const updateLoan = useStore((s) => s.updateLoan)

  const nextRequestNumber = useMemo(() => {
    const year = new Date().getFullYear()
    const count = db.loans.filter((l) => l.requestNumber.includes(String(year))).length + 1
    return `REQ-${year}-${String(count).padStart(3, '0')}`
  }, [db.loans])

  const approverSuggestions = useMemo(
    () => Array.from(new Set(db.loans.map((l) => l.approvedBy).filter((v): v is string => !!v))),
    [db.loans],
  )

  const [form, setForm] = useState(() => emptyForm(db.settings.defaultUnitLengthMeters, nextRequestNumber))
  const [showNewSite, setShowNewSite] = useState(false)

  useEffect(() => {
    if (!open) return
    if (loan) {
      setForm({
        requestNumber: loan.requestNumber,
        requesterName: loan.requesterName,
        entity: loan.entity,
        ext: loan.ext,
        email: loan.email ?? '',
        boomFunction: loan.boomFunction,
        workDescription: loan.workDescription,
        siteLocationId: loan.siteLocationId,
        sourcePosId: loan.sourcePosId,
        quantityUnits: loan.quantityUnits,
        unitLengthMeters: loan.unitLengthMeters,
        additionalSources: loan.additionalSources ?? [],
        requestDate: loan.requestDate,
        startDate: loan.startDate,
        endDate: loan.endDate,
        endDateTBC: loan.endDateTBC ?? false,
        status: loan.status,
        priority: loan.priority,
        notes: loan.notes ?? '',
        approvedBy: loan.approvedBy ?? '',
        actualReturnDate: loan.actualReturnDate ?? '',
        returnedTo: loan.returnedTo ?? 'pos',
      })
    } else {
      setForm(emptyForm(db.settings.defaultUnitLengthMeters, nextRequestNumber))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id])

  const siteList = db.locations.filter((l) => l.type !== 'pos')
  const selectedSite = db.locations.find((l) => l.id === form.siteLocationId)

  const posOptions = useMemo(
    () =>
      getNearestPosOptions(
        db.locations,
        db.stockBatches,
        db.loans,
        form.siteLocationId || undefined,
        form.quantityUnits,
        loan?.id,
      ),
    [db.locations, db.stockBatches, db.loans, form.siteLocationId, form.quantityUnits, loan?.id],
  )

  const standbyOptions = useMemo(
    () => getNearestStandbyOptions(db.locations, db.loans, form.siteLocationId || undefined, form.quantityUnits, loan?.id),
    [db.locations, db.loans, form.siteLocationId, form.quantityUnits, loan?.id],
  )

  const forecastOptions = useMemo(
    () => getNearbyForecastSupply(db.locations, db.loans, form.siteLocationId || undefined, 14).filter((f) => f.loan.id !== loan?.id),
    [db.locations, db.loans, form.siteLocationId, loan?.id],
  )

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  // Unified "who can supply this" list — pos stock and standby-at-site stock treated the same way.
  const allChoices = useMemo(
    () => [
      ...posOptions.map((o) => ({ id: o.pos.id, name: o.pos.name, availableUnits: o.stock.availableUnits, kind: 'pos' as const })),
      ...standbyOptions.map((o) => ({ id: o.site.id, name: `${o.site.name} (Standby)`, availableUnits: o.availableUnits, kind: 'standby' as const })),
    ],
    [posOptions, standbyOptions],
  )

  const primaryChoice = allChoices.find((c) => c.id === form.sourcePosId)
  const primaryAvailable = primaryChoice?.availableUnits ?? 0
  const additionalTotal = form.additionalSources.reduce((s, a) => s + (Number(a.quantityUnits) || 0), 0)
  const totalAllocated = Math.min(primaryAvailable, form.quantityUnits) + additionalTotal
  const primaryShortfall = Math.max(0, form.quantityUnits - primaryAvailable)
  const showSplitHint = form.sourcePosId && primaryShortfall > 0
  const otherChoices = allChoices.filter((c) => c.id !== form.sourcePosId)

  const addSplitRow = () => {
    const used = new Set(form.additionalSources.map((a) => a.posId))
    const next = otherChoices.find((o) => !used.has(o.id))
    if (!next) return
    set('additionalSources', [...form.additionalSources, { posId: next.id, quantityUnits: Math.min(primaryShortfall || 1, next.availableUnits || 1) }])
  }
  const updateSplitRow = (idx: number, patch: Partial<LoanAllocation>) => {
    set('additionalSources', form.additionalSources.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }
  const removeSplitRow = (idx: number) => {
    set('additionalSources', form.additionalSources.filter((_, i) => i !== idx))
  }

  const canSubmit =
    form.requesterName.trim() &&
    form.entity.trim() &&
    form.siteLocationId &&
    form.sourcePosId &&
    form.quantityUnits > 0 &&
    form.startDate &&
    (form.endDateTBC || form.endDate)

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      requestNumber: form.requestNumber,
      requesterName: form.requesterName.trim(),
      entity: form.entity.trim(),
      ext: form.ext.trim(),
      email: form.email.trim() || undefined,
      boomFunction: form.boomFunction.trim(),
      workDescription: form.workDescription.trim(),
      siteLocationId: form.siteLocationId,
      sourcePosId: form.sourcePosId,
      quantityUnits: Number(form.quantityUnits),
      unitLengthMeters: Number(form.unitLengthMeters),
      additionalSources: form.additionalSources.filter((a) => a.posId && a.quantityUnits > 0),
      requestDate: form.requestDate,
      startDate: form.startDate,
      endDate: form.endDateTBC ? '' : form.endDate,
      endDateTBC: form.endDateTBC,
      actualReturnDate: form.actualReturnDate || undefined,
      status: form.status,
      priority: form.priority,
      notes: form.notes.trim(),
      approvedBy: form.approvedBy.trim() || undefined,
      returnedTo: form.status === 'Selesai' ? form.returnedTo : undefined,
    }
    if (loan) {
      updateLoan(loan.id, payload)
    } else {
      addLoan(payload)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={loan ? `Edit Permintaan - ${loan.requestNumber}` : 'Permintaan Peminjaman Baru'} wide>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="No Permintaan">
          <input className={inputClass} value={form.requestNumber} onChange={(e) => set('requestNumber', e.target.value)} />
        </Field>
        <Field label="Tanggal Request (email masuk)" required>
          <input type="date" className={inputClass} value={form.requestDate} onChange={(e) => set('requestDate', e.target.value)} />
        </Field>

        <Field label="Nama Peminta" required>
          <input className={inputClass} value={form.requesterName} onChange={(e) => set('requesterName', e.target.value)} placeholder="cth. Budi Santoso" />
        </Field>
        <Field label="Entity / Perusahaan" required>
          <input className={inputClass} value={form.entity} onChange={(e) => set('entity', e.target.value)} placeholder="cth. PT Mitra Marine Services" />
        </Field>

        <Field label="Ext / No. Telepon">
          <input className={inputClass} value={form.ext} onChange={(e) => set('ext', e.target.value)} placeholder="cth. 2145" />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="cth. budi.santoso@mitramarine.co.id" />
        </Field>

        <Field label="Fungsi Pekerjaan">
          <input className={inputClass} value={form.boomFunction} onChange={(e) => set('boomFunction', e.target.value)} placeholder="cth. Drilling Support" />
        </Field>
        <Field label="Jumlah Unit Boom Dibutuhkan" required>
          <input type="number" min={1} className={inputClass} value={form.quantityUnits} onChange={(e) => set('quantityUnits', Number(e.target.value))} />
        </Field>

        <div className="md:col-span-2">
          <Field label="Deskripsi Pekerjaan">
            <textarea className={inputClass} rows={2} value={form.workDescription} onChange={(e) => set('workDescription', e.target.value)} placeholder="Uraian singkat pekerjaan yang berpotensi tumpahan minyak" />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Lokasi Kerja (sumur/platform/cluster)" required>
            <div className="flex gap-2">
              <select
                className={inputClass}
                value={form.siteLocationId}
                onChange={(e) => { set('siteLocationId', e.target.value); set('sourcePosId', ''); set('additionalSources', []) }}
              >
                <option value="">Pilih lokasi kerja...</option>
                {siteList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
              <Button type="button" size="md" onClick={() => setShowNewSite(true)} title="Lokasi belum ada di daftar? Tambahkan baru">
                <Plus size={15} />
              </Button>
            </div>
            {siteList.length === 0 && (
              <span className="mt-1 block text-[11px] text-amber-600">Belum ada lokasi kerja terdaftar — klik tombol + untuk menambahkan.</span>
            )}
          </Field>
        </div>

        <Field label="Tanggal Mulai Pakai" required>
          <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="Rencana Tanggal Selesai" required={!form.endDateTBC}>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={inputClass}
              value={form.endDate}
              disabled={form.endDateTBC}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>
          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={form.endDateTBC}
              onChange={(e) => set('endDateTBC', e.target.checked)}
              className="accent-teal-600"
            />
            Belum ada info / TBC (durasi belum pasti)
          </label>
        </Field>

        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as LoanStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{loanStatusLabel(s)}</option>)}
          </select>
        </Field>
        <Field label="Prioritas">
          <select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value as LoanPriority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Disetujui oleh (ENV)" hint="cth. Lintang, Anja">
          <input
            list="approver-suggestions"
            className={inputClass}
            value={form.approvedBy}
            onChange={(e) => set('approvedBy', e.target.value)}
            placeholder="Nama yang menyetujui"
          />
          <datalist id="approver-suggestions">
            {approverSuggestions.map((name) => <option key={name} value={name} />)}
          </datalist>
        </Field>
        {form.status === 'Selesai' && (
          <Field label="Tanggal Kembali Aktual">
            <input type="date" className={inputClass} value={form.actualReturnDate} onChange={(e) => set('actualReturnDate', e.target.value)} />
          </Field>
        )}
        {form.status === 'Selesai' && (
          <div className="md:col-span-2">
            <Field label="Setelah selesai, boom-nya kemana?" hint="Standby = ditinggal di lokasi kerja, siap diambil langsung untuk permintaan berikutnya tanpa dibawa balik ke pos.">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('returnedTo', 'pos')}
                  className={clsx(
                    'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    form.returnedTo === 'pos' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  Dikembalikan ke Pos
                </button>
                <button
                  type="button"
                  onClick={() => set('returnedTo', 'standby')}
                  className={clsx(
                    'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    form.returnedTo === 'standby' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  Standby di Lokasi Kerja
                </button>
              </div>
            </Field>
          </div>
        )}

        <div className="md:col-span-2">
          <Field label="Catatan">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <MapPin size={14} /> Pilih Sumber Boom — Pos atau Standby di Lokasi Kerja (diurutkan dari yang terdekat &amp; stok mencukupi)
        </div>
        {!form.siteLocationId && (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">Pilih lokasi kerja terlebih dahulu untuk melihat sumber terdekat.</p>
        )}
        {form.siteLocationId && selectedSite && (
          <>
            <div className="mb-3">
              <PosSelectionMap
                site={selectedSite}
                posOptions={posOptions}
                standbyOptions={standbyOptions}
                primaryPosId={form.sourcePosId}
                additionalPosIds={form.additionalSources.map((a) => a.posId)}
                onSelectPrimary={(posId) => set('sourcePosId', posId)}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-600" /> Sumber utama terpilih</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Sumber tambahan</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-600" /> Pos lain</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Standby di lokasi</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Lokasi kerja</span>
              </div>
            </div>

            {standbyOptions.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                  <PackageCheck size={13} /> Standby di Lokasi Kerja — siap ambil sekarang, tanpa perlu ke pos
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {standbyOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.site.id}
                      onClick={() => set('sourcePosId', opt.site.id)}
                      className={clsx(
                        'rounded-xl border p-3 text-left transition-colors',
                        form.sourcePosId === opt.site.id ? 'border-amber-500 bg-amber-50' : 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
                        !opt.sufficient && form.sourcePosId !== opt.site.id && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{opt.site.name}</span>
                        {form.sourcePosId === opt.site.id && <CheckCircle2 size={16} className="text-amber-600" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <Badge tone="amber">Standby</Badge>
                        <Badge tone="slate">{formatDistance(opt.distanceKm)}</Badge>
                        <Badge tone={opt.sufficient ? 'green' : 'red'}>{opt.availableUnits} unit siap ambil</Badge>
                        {!opt.sufficient && <span className="text-red-500">stok tidak cukup</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              {standbyOptions.length > 0 && (
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-600">
                  <MapPin size={13} /> Stok di Pos Penyimpanan
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {posOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.pos.id}
                    onClick={() => set('sourcePosId', opt.pos.id)}
                    className={clsx(
                      'rounded-xl border p-3 text-left transition-colors',
                      form.sourcePosId === opt.pos.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300',
                      !opt.sufficient && form.sourcePosId !== opt.pos.id && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{opt.pos.name}</span>
                      {form.sourcePosId === opt.pos.id && <CheckCircle2 size={16} className="text-teal-600" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <Badge tone="slate">{formatDistance(opt.distanceKm)}</Badge>
                      <Badge tone={opt.sufficient ? 'green' : 'red'}>{opt.stock.availableUnits} unit tersedia</Badge>
                      {!opt.sufficient && <span className="text-red-500">stok tidak cukup</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {forecastOptions.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <Clock size={13} /> Perkiraan Akan Tersedia (belum bisa diambil, informasi saja)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {forecastOptions.map((f) => (
                    <div key={f.loan.id} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-600">{f.site.name}</span>
                        <Badge tone={f.daysUntil < 0 ? 'red' : f.daysUntil <= 2 ? 'amber' : 'slate'}>
                          {f.daysUntil < 0 ? `Lewat ${Math.abs(f.daysUntil)}h` : f.daysUntil === 0 ? 'Hari ini' : `~${f.daysUntil} hari lagi`}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {f.loan.quantityUnits} unit &middot; {f.loan.requestNumber} &middot; {f.loan.requesterName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">Rencana selesai {formatDateID(f.loan.endDate)} &middot; {formatDistance(f.distanceKm)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showSplitHint && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    Stok di <b>{primaryChoice?.name}</b> tidak cukup (tersedia {primaryAvailable}, butuh {form.quantityUnits} unit).
                    Kekurangan {primaryShortfall} unit bisa diambil dari pos lain — <b>opsional</b>, hanya jika memang diperlukan.
                  </div>
                </div>

                {form.additionalSources.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {form.additionalSources.map((row, idx) => {
                      const opt = otherChoices.find((o) => o.id === row.posId)
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            className={`${inputClass} bg-white`}
                            value={row.posId}
                            onChange={(e) => updateSplitRow(idx, { posId: e.target.value })}
                          >
                            {otherChoices.map((o) => (
                              <option key={o.id} value={o.id}>{o.name} ({o.availableUnits} unit)</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            max={opt?.availableUnits}
                            className={`${inputClass} w-28 bg-white`}
                            value={row.quantityUnits}
                            onChange={(e) => updateSplitRow(idx, { quantityUnits: Number(e.target.value) })}
                          />
                          <button type="button" onClick={() => removeSplitRow(idx)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                            <X size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <Button type="button" size="sm" onClick={addSplitRow} disabled={form.additionalSources.length >= otherChoices.length}>
                    <Plus size={13} /> Tambah Pos Lain
                  </Button>
                  <span className={clsx('text-xs font-medium', totalAllocated >= form.quantityUnits ? 'text-emerald-600' : 'text-amber-600')}>
                    Teralokasi {totalAllocated} / {form.quantityUnits} unit
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {loan ? 'Simpan Perubahan' : 'Buat Permintaan'}
        </Button>
      </div>

      <LocationFormModal
        open={showNewSite}
        kind="site"
        onClose={() => setShowNewSite(false)}
        onCreated={(id) => {
          set('siteLocationId', id)
          set('sourcePosId', '')
        }}
      />
    </Modal>
  )
}
