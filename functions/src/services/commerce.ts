export type CouponInput = {
  code?: string | null;
  discount?: number | string | null;
};

export type CouponResult = {
  code: string | null;
  discount: number;
  finalAmount: number;
  couponApplied: boolean;
};

export function calculateOrderTotal(amount: number | string, discount: number | string = 0) {
  const base = Number(amount ?? 0);
  const discountValue = Number(discount ?? 0);
  if (Number.isNaN(base) || Number.isNaN(discountValue)) {
    return 0;
  }
  return Math.max(0, base - discountValue);
}

export function applyCoupon(amount: number | string, coupon?: CouponInput | null): CouponResult {
  const discount = Number(coupon?.discount ?? 0);
  const finalAmount = calculateOrderTotal(amount, discount);
  const couponApplied = Boolean(discount > 0);
  return {
    code: coupon?.code ?? null,
    discount,
    finalAmount,
    couponApplied,
  };
}
