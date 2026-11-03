export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum MovementType {
  /** Goods received into a warehouse (purchase, return from customer...) */
  IN = 'IN',
  /** Goods issued from a warehouse (sale, production use...) */
  OUT = 'OUT',
  /** Goods moved between two warehouses */
  TRANSFER = 'TRANSFER',
  /** Stock count correction, quantity can be positive or negative */
  ADJUST = 'ADJUST',
}
