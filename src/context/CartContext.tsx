import React, { createContext, useContext, useState } from 'react';
import { CartItem, MenuItem, Bill } from '../types/models';
import { calculateLineTotal } from '../lib/money';
import { generateUUID } from '../lib/uuid';

interface DiscountState {
  type: 'percentage' | 'fixed';
  value: number;
  appliedBy?: string;
  approvedBy?: string;
}

interface CartCustomer {
  id?: string;
  name?: string;
  phone?: string;
}

interface CartContextType {
  cart: CartItem[];
  addItem: (item: MenuItem, isHalf?: boolean) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, delta: number) => void;
  clearCart: () => void;
  addCustomItem: (name: string, price: number, quantity?: number) => void;
  discount: DiscountState | null;
  setDiscount: (d: DiscountState | null) => void;
  tableNumber: string | null;
  setTableNumber: (table: string | null) => void;
  customer: CartCustomer | null;
  setCustomer: (cust: CartCustomer | null) => void;
  editingBill: Bill | null;
  startEditingBill: (bill: Bill) => void;
  cancelEditingBill: () => void;
  toastMessage: string | null;
  flash: (msg: string) => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  addCustomItem: () => {},
  discount: null,
  setDiscount: () => {},
  tableNumber: null,
  setTableNumber: () => {},
  customer: null,
  setCustomer: () => {},
  editingBill: null,
  startEditingBill: () => {},
  cancelEditingBill: () => {},
  toastMessage: null,
  flash: () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<DiscountState | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CartCustomer | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  };

  const addItem = (item: MenuItem, isHalf: boolean = false) => {
    const key = `${item.id}|${isHalf ? 'half' : 'full'}`;
    const unitPrice = isHalf && item.halfPrice ? item.halfPrice : item.price;

    setCart(prev => {
      const idx = prev.findIndex(c => c.key === key);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = next[idx].quantity + 1;
        next[idx] = {
          ...next[idx],
          quantity: newQty,
          lineTotal: calculateLineTotal(unitPrice, newQty),
        };
        return next;
      }
      return [
        ...prev,
        {
          key,
          itemId: item.id,
          name: item.name,
          unitPrice,
          quantity: 1,
          isHalf,
          lineTotal: unitPrice,
        },
      ];
    });
  };

  const removeItem = (key: string) => {
    setCart(prev => prev.filter(c => c.key !== key));
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => {
          if (c.key === key) {
            const nextQty = c.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...c,
              quantity: nextQty,
              lineTotal: calculateLineTotal(c.unitPrice, nextQty),
            };
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(null);
    setTableNumber(null);
    setCustomer(null);
  };

  const addCustomItem = (name: string, price: number, quantity: number = 1) => {
    const customId = `custom_${generateUUID().slice(0, 8)}`;
    const key = `${customId}|full`;
    const cleanPrice = Math.max(0, price);
    const cleanQty = Math.max(1, quantity);

    setCart(prev => [
      ...prev,
      {
        key,
        itemId: customId,
        name: name.trim() || 'Custom Item',
        unitPrice: cleanPrice,
        quantity: cleanQty,
        isHalf: false,
        lineTotal: calculateLineTotal(cleanPrice, cleanQty),
      },
    ]);
  };

  const startEditingBill = (bill: Bill) => {
    setEditingBill(bill);
    setTableNumber(bill.tableNumber || null);
    setCustomer({
      id: bill.customerId || undefined,
      name: bill.customerName || undefined,
      phone: bill.customerPhone || undefined,
    });
    if (bill.discountAmount && bill.discountAmount > 0) {
      setDiscount({
        type: (bill.discountType as any) || 'fixed',
        value: bill.discountValue || bill.discountAmount,
      });
    } else {
      setDiscount(null);
    }

    const cartItems: CartItem[] = (bill.items || []).map(it => ({
      key: `${it.menuItemId || generateUUID()}|${it.isHalf ? 'half' : 'full'}`,
      itemId: it.menuItemId || generateUUID(),
      name: it.itemName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      isHalf: it.isHalf,
      lineTotal: it.lineTotal,
    }));
    setCart(cartItems);
  };

  const cancelEditingBill = () => {
    setEditingBill(null);
    clearCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        addCustomItem,
        discount,
        setDiscount,
        tableNumber,
        setTableNumber,
        customer,
        setCustomer,
        editingBill,
        startEditingBill,
        cancelEditingBill,
        toastMessage,
        flash,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
