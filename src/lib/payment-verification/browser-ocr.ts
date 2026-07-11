let worker: Tesseract.Worker | null = null
let workerPromise: Promise<Tesseract.Worker> | null = null

const RUPPE_MISPRINT_WORD = /^[7gG9@](\d{1,5}(?:[.,]\d{1,2})?)$/

const PAYMENT_KEYWORDS = [
  'amount', 'paid', 'transfer to', 'transfer', 'total', 'payment',
  'transaction successful', 'payment successful', 'success', 'successful',
  'debit', 'debited', 'sent',
]

const BANK_KEYWORDS = [
  'bank', 'account', 'a/c', 'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'yes bank',
  'xxxx', 'from', 'to', 'debited from', 'credited to',
]

function normalizeOcrText(raw: string): string {
  let text = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^ +/gm, '')
    .trim()

  text = text
    .replace(/\bRs\b\.?\s*/gi, '₹')
    .replace(/\bINR\b\s*/gi, '₹')
    .replace(/\bRupees?\b\s*/gi, '₹')
    .replace(/\brp\b\s*/gi, '₹')

  return text
}

function contextWords(words: Tesseract.Word[], idx: number, range: number): string {
  const start = Math.max(0, idx - range)
  const end = Math.min(words.length - 1, idx + range)
  const ctx: string[] = []
  for (let i = start; i <= end; i++) {
    if (i !== idx) ctx.push(words[i].text.trim())
  }
  return ctx.join(' ')
}

function correctRupeeMisprints(words: Tesseract.Word[]): { correctedWords: any[], text: string } {
  const corrected: any[] = []
  const segments: string[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wText = word.text.trim()
    if (!wText) {
      corrected.push({ original: word.text, corrected: word.text })
      segments.push(word.text)
      continue
    }

    const match = wText.match(RUPPE_MISPRINT_WORD)
    if (match) {
      const context = contextWords(words, i, 3)
      const lowerCtx = context.toLowerCase()

      const hasPaymentKw = PAYMENT_KEYWORDS.some(kw => lowerCtx.includes(kw))
      const hasBankKw = BANK_KEYWORDS.some(kw => lowerCtx.includes(kw))

      if (hasPaymentKw && !hasBankKw) {
        const rest = match[1]
        const correctedText = '₹' + rest
        corrected.push({ original: word.text, corrected: correctedText, isRupeeMisprint: true, confidence: word.confidence })
        segments.push(correctedText)
      } else {
        corrected.push({ original: word.text, corrected: word.text, isRupeeMisprint: false })
        segments.push(word.text)
      }
    } else {
      corrected.push({ original: word.text, corrected: word.text })
      segments.push(word.text)
    }
  }

  const text = normalizeOcrText(segments.join(' '))

  return { correctedWords: corrected, text }
}

function correctRupeeMisprintsInText(text: string): string {
  return text.replace(RUPPE_MISPRINT_WORD, (match, rest) => '₹' + rest)
}

export interface OcrProgress {
  status: 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
  message: string
}

export interface OcrWordData {
  text: string
  corrected: string
  confidence: number
  isRupeeMisprint: boolean
  bbox?: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrResult {
  text: string
  rawText: string
  words: OcrWordData[]
  correctedCount: number
}

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker) return worker
  if (workerPromise) return workerPromise

  const Tesseract = await import('tesseract.js')

  workerPromise = (async () => {
    const w = await Tesseract.createWorker('eng')

    await w.setParameters({
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789₹.,:;/&-()[]{}@#!?$+= ',
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6',
    })

    worker = w
    return w
  })()

  return workerPromise
}

export async function extractTextFromImage(
  imageDataUrl: string,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  onProgress?.({ status: 'loading', progress: 0, message: 'Initializing OCR...' })

  try {
    const w = await getWorker()

    onProgress?.({ status: 'recognizing', progress: 0.1, message: 'Reading receipt...' })

    const progressInterval = setInterval(() => {
      onProgress?.({ status: 'recognizing', progress: 0.1, message: 'Reading receipt...' })
    }, 500)

    const result = await w.recognize(imageDataUrl)

    clearInterval(progressInterval)

    onProgress?.({ status: 'done', progress: 1, message: 'Text extraction complete' })

    const rawText = result.data.text || ''
    const words = result.data.words || []

    let ocrResult: OcrResult

    if (words.length > 0) {
      const { correctedWords, text } = correctRupeeMisprints(words)
      const correctedCount = correctedWords.filter((w: any) => w.isRupeeMisprint).length
      ocrResult = {
        text,
        rawText,
        words: correctedWords.map((w: any, i: number) => ({
          text: words[i]?.text || w.original,
          corrected: w.corrected,
          confidence: words[i]?.confidence || 0,
          isRupeeMisprint: w.isRupeeMisprint || false,
          bbox: words[i]?.bbox,
        })),
        correctedCount,
      }
    } else {
      const text = correctRupeeMisprintsInText(normalizeOcrText(rawText))
      ocrResult = {
        text,
        rawText,
        words: [],
        correctedCount: 0,
      }
    }

    return ocrResult
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR failed'
    onProgress?.({ status: 'error', progress: 0, message })
    throw new Error(message)
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    try {
      await worker.terminate()
    } catch {}
    worker = null
    workerPromise = null
  }
}

export function compressImage(
  dataUrl: string,
  maxDimension: number = 2048,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let w = img.width
      let h = img.height

      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context unavailable'))

      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}
