import { db, type WalletBalance, type WalletAdjustment } from './db'

export const DIGITAL_METHODS = ['Card', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'SadaPay', 'NayaPay', 'Raast']

export async function getWalletForMonth(year: number, month: number): Promise<WalletBalance | null> {
  return (await db.walletBalances.where('[year+month]').equals([year, month]).first()) ?? null
}

export async function setStartingBalances(
  year: number,
  month: number,
  startingCash: number,
  startingDigital: number,
): Promise<void> {
  const existing = await getWalletForMonth(year, month)
  if (existing) {
    await db.walletBalances.update(existing.id, { startingCash, startingDigital })
  } else {
    await db.walletBalances.add({
      year,
      month,
      startingCash,
      startingDigital,
      adjustments: [],
      confirmedAt: new Date().toISOString(),
    } as Omit<WalletBalance, 'id'> as WalletBalance)
  }
}

export async function addAdjustment(
  year: number,
  month: number,
  adjustment: Omit<WalletAdjustment, 'id' | 'createdAt'>,
): Promise<void> {
  const record = await getWalletForMonth(year, month)
  if (!record) return
  const entry: WalletAdjustment = {
    ...adjustment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await db.walletBalances.update(record.id, {
    adjustments: [...record.adjustments, entry],
  })
}

export async function removeAdjustment(year: number, month: number, adjustmentId: string): Promise<void> {
  const record = await getWalletForMonth(year, month)
  if (!record) return
  await db.walletBalances.update(record.id, {
    adjustments: record.adjustments.filter(a => a.id !== adjustmentId),
  })
}

export async function addTransfer(
  year: number,
  month: number,
  amount: number,
  direction: 'digital-to-cash' | 'cash-to-digital',
  note: string,
): Promise<void> {
  const record = await getWalletForMonth(year, month)
  if (!record) return

  const groupId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const [cashAmount, digitalAmount] =
    direction === 'digital-to-cash' ? [amount, -amount] : [-amount, amount]

  await db.walletBalances.update(record.id, {
    adjustments: [
      ...record.adjustments,
      { id: crypto.randomUUID(), amount: cashAmount,    note, method: 'cash',    createdAt, transferGroupId: groupId },
      { id: crypto.randomUUID(), amount: digitalAmount, note, method: 'digital', createdAt, transferGroupId: groupId },
    ],
  })
}

export async function removeTransferGroup(year: number, month: number, groupId: string): Promise<void> {
  const record = await getWalletForMonth(year, month)
  if (!record) return
  await db.walletBalances.update(record.id, {
    adjustments: record.adjustments.filter(a => a.transferGroupId !== groupId),
  })
}

export interface CurrentBalances {
  cash: number
  digital: number
  total: number
}

export async function calculateCurrentBalances(year: number, month: number): Promise<CurrentBalances> {
  const record = await getWalletForMonth(year, month)
  if (!record) return { cash: 0, digital: 0, total: 0 }

  // Build YYYY-MM prefix for expense filtering
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const expenses = await db.expenses
    .where('date')
    .startsWith(monthStr)
    .toArray()

  let cashSpent = 0
  let digitalSpent = 0
  for (const e of expenses) {
    if (e.paymentMethod === 'Cash') {
      cashSpent += e.amount
    } else if (DIGITAL_METHODS.includes(e.paymentMethod)) {
      digitalSpent += e.amount
    }
    // 'Other' is excluded from wallet tracking
  }

  const cashAdj = record.adjustments
    .filter(a => a.method === 'cash')
    .reduce((s, a) => s + a.amount, 0)
  const digitalAdj = record.adjustments
    .filter(a => a.method === 'digital')
    .reduce((s, a) => s + a.amount, 0)

  const cash = record.startingCash - cashSpent + cashAdj
  const digital = record.startingDigital - digitalSpent + digitalAdj

  return { cash, digital, total: cash + digital }
}

export async function getPreviousMonthEndBalances(
  year: number,
  month: number,
): Promise<{ cash: number; digital: number } | null> {
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear -= 1
  }

  const prev = await getWalletForMonth(prevYear, prevMonth)
  if (!prev || !prev.confirmedAt) return null

  const balances = await calculateCurrentBalances(prevYear, prevMonth)
  return { cash: balances.cash, digital: balances.digital }
}

export async function confirmWalletMonth(year: number, month: number): Promise<void> {
  const record = await getWalletForMonth(year, month)
  if (!record) return
  await db.walletBalances.update(record.id, { confirmedAt: new Date().toISOString() })
}
