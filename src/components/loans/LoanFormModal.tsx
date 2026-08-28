import { useEffect, useMemo, useState } from 'react'
import { MapPin, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Field'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useStore } from '../../store/useStore'
import type { LoanPriority, LoanRequest, LoanStatus } from '../../types'
import { getNearestPosOptions } from '../../lib/nearestPos'
import { formatDistance } from '../../lib/geo'
import { todayISO } from '../../lib/date'

const STATUSES: LoanStatus[] = ['Pending', 'Disetujui', 'Aktif', 'Selesai', 'Dibatalkan']
const PRIORITIES: LoanPriority[] = ['Normal', 'Tinggi', 'Urgent']

function emptyForm(defaultUnitLength: number, nextRequestNumber: string) {
  return {
    requestNumber: nextRequestNumber,
    requesterName: '',
    entity: '',
    ext: '',
    boomFunction: '',
    workDescription: '',
    siteLocationId: '',
    sourcePosId: '',
    quantityUnits: 1,
    unitLengthMeters: defaultUnitLength,
    requestDate: todayISO(),
    startDate: todayISO(),
    endDate: todayISO(),
    status: 'Pending' as LoanStatus,
    priority: 'Normal' as LoanPriority,
    notes: '',
    actualReturnDate: '',
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

  const [form, setForm] = useState(() => emptyForm(db.settings.defaultUnitLengthMeters, nextRequestNumber))

  useEffect(() => {
    if (!open) return
    if (loan) {
      setForm({
        requestNumber: loan.requestNumber,
        requesterName: loan.requesterName,
        entity: loan.entity,
        ext: loan.ext,
        boomFunction: loan.boomFunction,
        workDescription: loan.workDescription,
        siteLocationId: loan.siteLocationId,
        sourcePosId: loan.sourcePosId,
        quantityUnits: loan.quantityUnits,
        unitLengthMeters: loan.unitLengthMeters,
        requestDate: loan.requestDate,
        startDate: loan.startDate,
        endDate: loan.endDate,
        status: loan.status,
        priority: loan.priority,
        notes: loan.notes ?? '',
        actualReturnDate: loan.actualReturnDate ?? '',
      })
    } else {
      setForm(emptyForm(db.settings.defaultUnitLengthMeters, nextRequestNumber))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id])

  const siteList = db.locations.filter((l) => l.type !== 'pos')

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

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const canSubmit =
    form.requesterName.trim() &&
    form.entity.trim() &&
    form.siteLocationId &&
    form.sourcePosId &&
    form.quantityUnits > 0 &&
    form.startDate &&
    form.endDate

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      requestNumber: form.requestNumber,
      requesterName: form.requesterName.trim(),
      entity: form.entity.trim(),
      ext: form.ext.trim(),
      boomFunction: form.boomFunction.trim(),
      workDescription: form.workDescription.trim(),
      siteLocationId: form.siteLocationId,
      sourcePosId: form.sourcePosId,
      quantityUnits: Number(form.quantityUnits),
      unitLengthMeters: Number(form.unitLengthMeters),
      requestDate: form.requestDate,
      startDate: form.startDate,
      endDate: form.endDate,
      actualReturnDate: form.actualReturnDate || undefined,
      status: form.status,
      priority: form.priority,
      notes: form.notes.trim(),
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
        <Field label="Fungsi Pekerjaan">
          <input className={inputClass} value={form.boomFunction} onChange={(e) => set('boomFunction', e.target.value)} placeholder="cth. Drilling Support" />
        </Field>

        <div className="md:col-span-2">
          <Field label="Deskripsi Pekerjaan">
            <textarea className={inputClass} rows={2} value={form.workDescription} onChange={(e) => set('workDescription', e.target.value)} placeholder="Uraian singkat pekerjaan yang berpotensi tumpahan minyak" />
          </Field>
        </div>

        <Field label="Lokasi Kerja (sumur/platform/cluster)" required>
          <select className={inputClass} value={form.siteLocationId} onChange={(e) => { set('siteLocationId', e.target.value); set('sourcePosId', '') }}>
            <option value="">Pilih lokasi kerja...</option>
            {siteList.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
            ))}
          </select>
        </Field>
        <Field label="Jumlah Unit Boom Dibutuhkan" required>
          <input type="number" min={1} className={inputClass} value={form.quantityUnits} onChange={(e) => set('quantityUnits', Number(e.target.value))} />
        </Field>

        <Field label="Tanggal Mulai Pakai" required>
          <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="Rencana Tanggal Selesai" required>
          <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </Field>

        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as LoanStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Prioritas">
          <select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value as LoanPriority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        {form.status === 'Selesai' && (
          <Field label="Tanggal Kembali Aktual">
            <input type="date" className={inputClass} value={form.actualReturnDate} onChange={(e) => set('actualReturnDate', e.target.value)} />
          </Field>
        )}

        <div className="md:col-span-2">
          <Field label="Catatan">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <MapPin size={14} /> Pilih Pos Asal (diurutkan dari yang terdekat &amp; stok mencukupi)
        </div>
        {!form.siteLocationId && (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">Pilih lokasi kerja terlebih dahulu untuk melihat pos terdekat.</p>
        )}
        {form.siteLocationId && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {posOptions.map((opt) => (
              <button
                type="button"
                key={opt.pos.id}
                onClick={() => set('sourcePosId', opt.pos.id)}
                className={clsx(
                  'rounded-xl border p-3 text-left transition-colors',
                  form.sourcePosId === opt.pos.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300',
                  !opt.sufficient && 'opacity-60',
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
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {loan ? 'Simpan Perubahan' : 'Buat Permintaan'}
        </Button>
      </div>
    </Modal>
  )
}
