import { Discount } from './discount.entity';

export const DISCOUNT_SEED: Discount[] = [
  {
    id: 'd-coffee-20',
    name: '20% off coffee beans',
    description: 'Save 20% on every bag of single-origin coffee beans.',
    active: true,
    kind: 'PERCENT_OFF_PRODUCT',
    productId: 'p-coffee-beans',
    percent: 20,
  },
  {
    id: 'd-order-5-over-30',
    name: '£5 off when you spend £30',
    description: 'Spend £30 or more and we take £5 off your order.',
    active: true,
    kind: 'FIXED_OFF_ORDER',
    minSubtotalCents: 3000,
    amountCents: 500,
  },
  {
    id: 'd-oat-milk-3-for-2',
    name: 'Oat milk: 3 for 2',
    description: 'Buy 2 oat milks, get 1 free.',
    active: true,
    kind: 'BUY_X_GET_Y_FREE',
    productId: 'p-oat-milk',
    buyQuantity: 2,
    freeQuantity: 1,
  },
  {
    id: 'd-coffee-oatmilk-bundle',
    name: 'Coffee & oat milk bundle',
    description: 'Buy coffee beans and oat milk together — save £2.',
    active: true,
    kind: 'BUNDLE',
    productIds: ['p-coffee-beans', 'p-oat-milk'],
    amountCents: 200,
  },
];
