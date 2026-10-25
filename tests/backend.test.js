// =====================================================================
// TRUENO 219 - Automated Backend Test Suite
// =====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateProductSchema,
  CreateClientSchema,
  CreateSaleSchema,
  AdjustStockSchema,
  TransferStockSchema,
  CreateDebtPaymentSchema
} from '../src/schemas/index.js';

test('Product Validation Schemas', async (t) => {
  await t.test('accepts valid product input', () => {
    const validProduct = {
      name: 'Casco Integral Modular',
      category: 'Cascos',
      description: 'Casco con certificación DOT',
      buy_price: 120000,
      sell_price: 185000,
      stock: 10,
      warehouse_stock: 5,
      min_stock: 3,
      sku: 'CAS-MOD-001'
    };
    const parsed = CreateProductSchema.parse(validProduct);
    assert.equal(parsed.sku, 'CAS-MOD-001');
    assert.equal(parsed.stock, 10);
  });

  await t.test('rejects negative prices and stocks', () => {
    const invalidProduct = {
      name: 'Aceite 4T',
      category: 'Lubricantes',
      buy_price: -5000,
      sell_price: 25000,
      stock: -2,
      sku: 'LUB-001'
    };
    assert.throws(() => CreateProductSchema.parse(invalidProduct));
  });

  await t.test('validates stock adjustment and transfer rules', () => {
    assert.throws(() =>
      TransferStockSchema.parse({
        from: 'store',
        to: 'store', // Same origin and destination not allowed
        quantity: 5
      })
    );

    const validTransfer = TransferStockSchema.parse({
      from: 'warehouse',
      to: 'store',
      quantity: 4
    });
    assert.equal(validTransfer.quantity, 4);
  });
});

test('Client Validation Schemas', async (t) => {
  await t.test('accepts valid client', () => {
    const client = {
      document: '1098765432',
      name: 'Andrés Gómez',
      phone: '3123456789',
      email: 'andres@example.com'
    };
    const parsed = CreateClientSchema.parse(client);
    assert.equal(parsed.name, 'Andrés Gómez');
  });

  await t.test('requires client name', () => {
    assert.throws(() => CreateClientSchema.parse({ phone: '123' }));
  });
});

test('Sale Validation & Financial Calculation Rules', async (t) => {
  await t.test('rejects sale with empty cart', () => {
    assert.throws(() =>
      CreateSaleSchema.parse({
        paymentMethod: 'Efectivo',
        items: []
      })
    );
  });

  await t.test('accepts valid sale payload', () => {
    const validSale = {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      clientName: 'Juan Pérez',
      paymentMethod: 'Crédito',
      discount: 5000,
      interestRate: 10,
      paid: 20000,
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440001',
          qty: 2,
          price: 35000
        }
      ]
    };
    const parsed = CreateSaleSchema.parse(validSale);
    assert.equal(parsed.paymentMethod, 'Crédito');
    assert.equal(parsed.items.length, 1);
  });

  await t.test('rejects interest rate exceeding 100% or negative', () => {
    assert.throws(() =>
      CreateSaleSchema.parse({
        paymentMethod: 'Crédito',
        interestRate: 150,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', qty: 1 }]
      })
    );
  });
});

test('Debt Payment Rules', async (t) => {
  await t.test('rejects debt payment with zero or negative amount', () => {
    assert.throws(() => CreateDebtPaymentSchema.parse({ amount: 0 }));
    assert.throws(() => CreateDebtPaymentSchema.parse({ amount: -500 }));
  });

  await t.test('accepts positive debt payment amount', () => {
    const payment = CreateDebtPaymentSchema.parse({
      amount: 45000,
      paymentMethod: 'Efectivo',
      note: 'Abono quincena'
    });
    assert.equal(payment.amount, 45000);
  });
});
