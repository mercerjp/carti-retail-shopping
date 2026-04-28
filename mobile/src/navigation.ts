import { OrderSummary } from './types';

export type RootStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: { order: OrderSummary } | undefined;
};
