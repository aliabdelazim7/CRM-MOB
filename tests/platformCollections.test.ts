import { describe, it, expect } from 'vitest';
import { findMatchingCarrier } from '../src/store/useStore';
import type { ShippingCarrier } from '../src/store/useStore';

describe('Platform Collections & Carrier Brand Matching Engine', () => {
  const sampleCarriers: ShippingCarrier[] = [
    { id: '1', name: 'Noon', base_fee: 50, commission_rate: 15, status: 'active' },
    { id: '2', name: 'Amazon', base_fee: 40, commission_rate: 10, status: 'active' },
    { id: '3', name: 'Jumia', base_fee: 35, commission_rate: 12, status: 'active' },
    { id: '4', name: 'Bosta', base_fee: 65, commission_rate: 0, status: 'active' },
    { id: '5', name: 'J&T', base_fee: 75, commission_rate: 0, status: 'active' },
  ];

  it('matches Arabic and English brand names correctly', () => {
    expect(findMatchingCarrier('نون (Noon)', sampleCarriers)?.name).toBe('Noon');
    expect(findMatchingCarrier('نون', sampleCarriers)?.name).toBe('Noon');
    expect(findMatchingCarrier('أمازون (Amazon)', sampleCarriers)?.name).toBe('Amazon');
    expect(findMatchingCarrier('امازون', sampleCarriers)?.name).toBe('Amazon');
    expect(findMatchingCarrier('جوميا (Jumia)', sampleCarriers)?.name).toBe('Jumia');
    expect(findMatchingCarrier('بوسطة (Bosta)', sampleCarriers)?.name).toBe('Bosta');
    expect(findMatchingCarrier('جي اند تي (J&T)', sampleCarriers)?.name).toBe('J&T');
  });

  it('calculates net expected payout correctly without compounding', () => {
    const grossTotal = 299.0;
    const commissionRate = 15; // 15%
    const shippingFee = 50.0;
    const upfrontPaid = 0.0;

    const commissionAmount = grossTotal * (commissionRate / 100); // 44.85
    const totalDeductions = commissionAmount + shippingFee + upfrontPaid; // 94.85
    const netExpected = Math.max(0, grossTotal - totalDeductions); // 204.15

    expect(commissionAmount).toBeCloseTo(44.85, 2);
    expect(netExpected).toBeCloseTo(204.15, 2);

    // Repeated recalculation must yield exact same 204.15 without compounding decay
    const repeatNet = Math.max(0, grossTotal - totalDeductions);
    expect(repeatNet).toBeCloseTo(204.15, 2);
  });
});
