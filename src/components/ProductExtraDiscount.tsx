import {
  effectiveSellingPrice,
  extraDiscountHeadline,
  hasFestiveDiscount,
} from '../lib/product-pricing'
import { formatPrice } from '../utils/format'

type ProductLike = {
  price: number
  compareAt?: number
  festiveDiscountPercent?: number
  extraDiscountType?: string
}

export function ProductPriceWithOffer({
  product,
  amount,
  layout = 'inline',
}: {
  product: ProductLike
  amount?: number
  layout?: 'inline' | 'block'
}) {
  const pct = product.festiveDiscountPercent
  const active = hasFestiveDiscount(pct)
  const listPrice = product.price
  const sell = amount ?? effectiveSellingPrice(listPrice, pct)
  const headline = extraDiscountHeadline(product.extraDiscountType, pct)
  const compareAt = product.compareAt && product.compareAt > sell ? product.compareAt : 0
  const showListWas = active && listPrice > sell

  if (layout === 'block') {
    return (
      <div className="product-price-offer product-price-offer--block">
        {active && headline ? <span className="product-offer-chip">{headline}</span> : null}
        <p className="product-price-now">{formatPrice(sell)}</p>
        {showListWas || compareAt > listPrice ? (
          <p className="product-price-reference">
            {showListWas ? (
              <span>
                List price <s>{formatPrice(listPrice)}</s>
              </span>
            ) : null}
            {compareAt > listPrice ? (
              <span>
                {showListWas ? ' · ' : ''}
                MRP <s>{formatPrice(compareAt)}</s>
              </span>
            ) : !showListWas && compareAt ? (
              <span>
                MRP <s>{formatPrice(compareAt)}</s>
              </span>
            ) : null}
          </p>
        ) : compareAt && !active ? (
          <p className="product-price-reference">
            MRP <s>{formatPrice(compareAt)}</s>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <span className="product-price-offer product-price-offer--inline">
      <strong>{formatPrice(sell)}</strong>
      {active ? (
        <s className="product-price-inline-was">{formatPrice(listPrice)}</s>
      ) : compareAt ? (
        <s className="product-price-inline-was">{formatPrice(compareAt)}</s>
      ) : null}
    </span>
  )
}

export function CartLineDiscountNote({ product }: { product: ProductLike }) {
  if (!hasFestiveDiscount(product.festiveDiscountPercent)) return null
  const headline = extraDiscountHeadline(product.extraDiscountType, product.festiveDiscountPercent)
  if (!headline) return null
  return <p className="cart-line-extra-offer">{headline}</p>
}