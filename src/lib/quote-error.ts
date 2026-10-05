import Big from "big.js"

export const DEFAULT_QUOTE_ERROR_MESSAGE = "Failed to get quote, please try again later"

function addThousands(value: string): string {
  const [whole, fraction] = value.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return fraction ? `${grouped}.${fraction}` : grouped
}

/** Readable amount. Values smaller than the token precision render as `< 0.00…1`. */
export function formatTokenAmount(value: Big | string | number, precision: number): string {
  const amount = value instanceof Big ? value : new Big(value)
  if (amount.lte(0)) return "0"
  const places = Math.max(0, precision)
  if (places > 0 && amount.lt(new Big(10).pow(-places))) {
    return `< ${new Big(10).pow(-places).toFixed(places)}`
  }
  const fixed = amount.toFixed(places).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
  return addThousands(fixed)
}

function fromMinor(raw: string, decimals: number): Big {
  return new Big(raw).div(new Big(10).pow(decimals))
}

export function formatQuoteError(
  message: string | null | undefined,
  tokens: {
    sourceDecimals: number
    sourceSymbol: string
    destinationDecimals: number
    destinationSymbol: string
  },
): string {
  const raw = message?.trim() || ""
  if (!raw || raw === "Internal server error") return DEFAULT_QUOTE_ERROR_MESSAGE
  if (raw === "Failed to get quote") return "Amount exceeds max"
  if (raw.includes("Amount is too low for bridge, try at least")) {
    const match = raw.match(/try at least\s+(\d+(?:\.\d+)?)/i)
    const minimumRaw = match ? match[1] : new Big(10).pow(tokens.sourceDecimals).toFixed(0)
    const minimum = fromMinor(minimumRaw, tokens.sourceDecimals)
    return `Amount is too low, at least ${formatTokenAmount(minimum, tokens.sourceDecimals)}`
  }
  if (raw.includes("Cannot convert undefined or null to object")) return "app fees exceeds 5% of amount"
  const inWei = raw.match(/requested amount smaller than token in minimum wei \[(\d+)\]/)
  if (inWei) {
    const amount = fromMinor(inWei[1], tokens.sourceDecimals)
    return `Amount is too low, at least ${formatTokenAmount(amount, tokens.sourceDecimals)} ${tokens.sourceSymbol}`
  }
  const outWei = raw.match(/requested amount smaller than token out minimum wei \[(\d+)\]/)
  if (outWei) {
    const amount = fromMinor(outWei[1], tokens.destinationDecimals)
    return `Amount is too low. A minimum of ${formatTokenAmount(amount, tokens.destinationDecimals)} ${tokens.destinationSymbol} must be output.`
  }
  const seller = raw.match(/seller token amount too small, min: (\d+)/i)
  if (seller) {
    const amount = fromMinor(seller[1], tokens.sourceDecimals)
    return `Amount is too low, at least ${formatTokenAmount(amount, tokens.sourceDecimals)} ${tokens.sourceSymbol}`
  }
  return raw
}

export function errorText(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === "object" && data && "message" in data) {
      const message = (data as { message?: unknown }).message
      if (typeof message === "string" && message.trim()) return message
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return ""
}

export function priceToDecimal(price: number): string | null {
  if (!Number.isFinite(price) || price <= 0) return null
  const text = price.toFixed(18).replace(/\.?0+$/, "")
  if (!text || text === "0") return null
  return text
}

/** USD notional from `Temporary swap limits: minimum swap amount is $1,000`. */
export function minimumSwapUsd(message: string | null | undefined): number | null {
  const match = message?.match(/minimum swap amount is \$([0-9,]+(?:\.\d+)?)/i)
  if (!match) return null
  const value = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

const STABLECOINS = new Set(["USDC", "USDT", "USDT0", "DAI"])

function isStablecoin(symbol: string): boolean {
  return STABLECOINS.has(symbol.trim().toUpperCase())
}

/** Smallest-unit amount equal to about `usd` dollars. Stablecoins use 1 token = 1 USD. */
export function usdMinor(usd: number, price: number, decimals: number, symbol: string): string | null {
  const decimal = isStablecoin(symbol) ? "1" : priceToDecimal(price)
  if (!decimal || !Number.isFinite(usd) || usd <= 0 || !Number.isInteger(decimals) || decimals < 0) return null
  const minor = new Big(usd).div(decimal).times(new Big(10).pow(decimals)).round(0, Big.roundHalfUp)
  if (minor.lte(0)) return null
  return minor.toFixed(0)
}

/** Smallest-unit amount equal to about 1 USD. */
export function oneUsdMinor(symbol: string, price: number, decimals: number): string | null {
  return usdMinor(1, price, decimals, symbol)
}

export function formatMinorAmount(raw: string, decimals: number): string {
  return formatTokenAmount(new Big(raw).div(new Big(10).pow(decimals)), decimals)
}

export function formatBalance(amount: string): string {
  try {
    const value = new Big(amount)
    if (value.lte(0)) return "0"
    const fixed = value.toFixed(6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    return addThousands(fixed)
  } catch {
    return "0"
  }
}

export function formatUsd(amount: string, price: number): string {
  const decimal = priceToDecimal(price)
  if (!decimal) return "$0"
  try {
    return `$${new Big(amount || 0).times(decimal).toFixed(2)}`
  } catch {
    return "$0"
  }
}
