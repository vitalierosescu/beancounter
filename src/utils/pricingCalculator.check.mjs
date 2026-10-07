// node src/utils/pricingCalculator.check.mjs
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG as c, createState, calculate } from './pricingCalculator.js'

const mm = (qty, on = {}) => {
  const s = createState(c)
  s.myminfin = { active: true, quantity: qty }
  for (const k of Object.keys(on)) s[k].active = on[k]
  return calculate(s, c).myminfinCost
}

assert.equal(Math.round(mm(300)), 540) // standalone, billed from dossier 1
assert.equal(Math.round(mm(1200, { pb: true })), 360) // combo, first 1000 free
assert.equal(mm(800, { blt: true }), 0) // combo under 1000 = Gratis
assert.equal(Math.round(mm(1200, { optimize: true })), 2160) // Optimize does not unlock free 1000
console.log('pricingCalculator ok')
