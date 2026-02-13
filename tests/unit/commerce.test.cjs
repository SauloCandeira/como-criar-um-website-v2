const { applyCoupon, calculateOrderTotal } = require('../../functions/lib/services/commerce');

describe('commerce helpers', () => {
  test('calculateOrderTotal applies discount safely', () => {
    expect(calculateOrderTotal(100, 25)).toBe(75);
    expect(calculateOrderTotal(100, 200)).toBe(0);
  });

  test('applyCoupon returns coupon result', () => {
    const result = applyCoupon(120, { code: 'AUTO10', discount: 10 });
    expect(result.finalAmount).toBe(110);
    expect(result.couponApplied).toBe(true);
    expect(result.code).toBe('AUTO10');
  });
});
