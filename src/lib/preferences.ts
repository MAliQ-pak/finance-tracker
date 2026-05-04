import { PAYMENT_METHODS, type PaymentMethod } from './categories'

const KEY_PAYMENT = 'lastPaymentMethod'

export function getLastPaymentMethod(): PaymentMethod {
  try {
    const stored = localStorage.getItem(KEY_PAYMENT)
    if (stored && (PAYMENT_METHODS as readonly string[]).includes(stored)) {
      return stored as PaymentMethod
    }
  } catch {
    // localStorage unavailable (private/incognito with strict settings)
  }
  return 'Cash'
}

export function setLastPaymentMethod(method: PaymentMethod): void {
  try {
    localStorage.setItem(KEY_PAYMENT, method)
  } catch {
    // ignore
  }
}
