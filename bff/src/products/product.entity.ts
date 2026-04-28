export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  imageUrl?: string;
}
