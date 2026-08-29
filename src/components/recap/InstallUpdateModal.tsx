import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Field'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'
import { resizeImageToDataUrl } from '../../lib/image'
import { todayISO } from '../../lib/date'
import type { LoanRequest } from '../../types'

export function InstallUpdateModal({ open, loan, onClose }: { open: boolean; loan?: LoanRequest; onClose: () => void }) {
  const db = useStore((s) => s.db)
  const updateLoan = useStore((s) => s.updateLoan)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const approverSuggestions = useMemo(
    () => Array.from(new Set(db.loans.map((l) => l.approvedBy).filter((v): v is string => !!v))),
    [db.loans],
  )

  const [form, setForm] = useState({
    approvedBy: '',
    installedAt: todayISO(),
    installedNotes: '',
    installedPhotoDataUrl: '' as string | undefined,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !loan) return
    setForm({
      approvedBy: loan.approvedBy ?? '',
      installedAt: loan.installedAt ?? todayISO(),
      installedNotes: loan.installedNotes ?? '',
      installedPhotoDataUrl: loan.installedPhotoDataUrl,
    })
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG/PNG).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      set('installedPhotoDataUrl', dataUrl)
    } catch {
      setError('Gagal memproses foto, coba file lain.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = () => {
    if (!loan) return
    updateLoan(loan.id, {
      approvedBy: form.approvedBy.trim() || undefined,
      installedAt: form.installedAt || undefined,
      installedNotes: form.installedNotes.trim() || undefined,
      installedPhotoDataUrl: form.installedPhotoDataUrl,
    })
    onClose()
  }

  return (
    <Modal open={open && !!loan} onClose={onClose} title={loan ? `Update Pemasangan - ${loan.requestNumber}` : 'Update Pemasangan'}>
      {loan && (
        <div className="grid grid-cols-1 gap-4">
          <Field label="Disetujui oleh (ENV)" hint="cth. Lintang, Anja">
            <input
              list="install-approver-suggestions"
              className={inputClass}
              value={form.approvedBy}
              onChange={(e) => set('approvedBy', e.target.value)}
              placeholder="Nama yang menyetujui"
            />
            <datalist id="install-approver-suggestions">
              {approverSuggestions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </Field>

          <Field label="Tanggal Terpasang">
            <input type="date" className={inputClass} value={form.installedAt} onChange={(e) => set('installedAt', e.target.value)} />
          </Field>

          <Field label="Catatan Pemasangan">
            <textarea className={inputClass} rows={3} value={form.installedNotes} onChange={(e) => set('installedNotes', e.target.value)} placeholder="cth. Boom terpasang mengelilingi area kerja, kondisi baik." />
          </Field>

          <Field label="Foto Dokumentasi">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {form.installedPhotoDataUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <img src={form.installedPhotoDataUrl} alt="Dokumentasi pemasangan" className="max-h-64 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('installedPhotoDataUrl', undefined)}
                  className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-red-500 shadow hover:bg-white"
                  title="Hapus foto"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-400 transition-colors hover:border-teal-400 hover:text-teal-600"
              >
                {busy ? <Camera size={22} className="animate-pulse" /> : <Upload size={22} />}
                <span className="text-xs">{busy ? 'Memproses foto...' : 'Klik untuk upload foto (JPG/PNG)'}</span>
              </button>
            )}
            {form.installedPhotoDataUrl && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1.5 text-xs text-teal-600 hover:underline">
                Ganti foto
              </button>
            )}
            {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
          </Field>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={handleSubmit}>Simpan Update</Button>
      </div>
    </Modal>
  )
}
