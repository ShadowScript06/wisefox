// src/utils/price.util.ts
import { livePrices } from '../../server' // exported from server.ts

function toSymbolKey(symbol: string): string {
    if(symbol==="XAUUSD" ){
        symbol="PAXGUSD"
    }
    
  return symbol.replace('/', '')
  
}

export function getLivePrice(symbol: string): number {
  const key = toSymbolKey(symbol)
  const price = livePrices[key]
  if (!price) throw new Error(`No live price available for ${symbol}`)
  return price
}