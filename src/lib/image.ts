/** Reads an image file, downscales it, and returns a data URL — keeps localStorage-friendly sizes. */
export function resizeImageToDataUrl(file: File, maxDim = 1000, quality = 0.75, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas tidak didukung di browser ini'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Logos usually need a transparent background kept intact — always exported as PNG. */
export function resizeLogoToDataUrl(file: File, maxDim = 256): Promise<string> {
  return resizeImageToDataUrl(file, maxDim, 1, 'png')
}
