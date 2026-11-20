import { describe, expect, it } from 'vitest';
import { ALL_MODELS } from '../src/models/index.js';

describe('MongoDB / Mongoose 63-Collection Architecture', () => {
  it('registers all 63 required collections from Master Prompt Section 12', () => {
    expect(ALL_MODELS).toHaveLength(63);
    const names = ALL_MODELS.map((m) => m.collection.collectionName);
    expect(new Set(names).size).toBe(63);
  });

  it('includes critical geospatial, unique, and TTL indexes', () => {
    const byName = new Map(ALL_MODELS.map((m) => [m.collection.collectionName, m]));

    const branchIndexes = byName.get('restaurant_branches')!.schema.indexes();
    expect(branchIndexes.some(([fields]) => fields.location === '2dsphere')).toBe(true);

    const orderIndexes = byName.get('orders')!.schema.indexes();
    expect(
      orderIndexes.some(
        ([fields, opts]) => fields.customerId === 1 && fields.idempotencyKey === 1 && opts?.unique
      )
    ).toBe(true);

    const sessionIndexes = byName.get('user_sessions')!.schema.indexes();
    expect(
      sessionIndexes.some(([fields, opts]) => fields.expiresAt === 1 && opts?.expireAfterSeconds === 0)
    ).toBe(true);

    const assignIndexes = byName.get('delivery_assignments')!.schema.indexes();
    expect(
      assignIndexes.some(
        ([fields, opts]) => fields.deliveryId === 1 && opts?.unique && opts?.partialFilterExpression
      )
    ).toBe(true);
  });

  it('rejects negative stock quantities at schema validation level', () => {
    const byName = new Map(ALL_MODELS.map((m) => [m.collection.collectionName, m]));
    const FoodStock = byName.get('food_stock')!;
    const invalid = new FoodStock({
      ingredientId: '507f1f77bcf86cd799439011',
      branchId: '507f1f77bcf86cd799439012',
      quantity: -5,
    });
    const err = invalid.validateSync();
    expect(err?.errors.quantity).toBeDefined();
  });
});
