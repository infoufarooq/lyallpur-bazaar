import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext();

function getOrCreateSessionToken() {
  let token = localStorage.getItem('lyallpur_cart_session');
  if (!token) {
    token = 'cart_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('lyallpur_cart_session', token);
  }
  return token;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    total_items: 0,
    subtotal_pkr: 0,
    delivery_fee_pkr: 120,
    free_delivery_threshold_pkr: 2500,
    free_delivery_remaining_pkr: 2500,
    estimated_total_pkr: 0
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      const sessionToken = getOrCreateSessionToken();
      const res = await client.get(`/cart?session_token=${sessionToken}`);
      setCart(res.data);
    } catch (e) {
      console.error("Failed to load cart", e);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId, quantity = 1, openDrawer = true) => {
    setLoading(true);
    try {
      const sessionToken = getOrCreateSessionToken();
      const res = await client.post(`/cart/items?session_token=${sessionToken}`, {
        product_id: productId,
        quantity: quantity
      });
      setCart(res.data);
      if (openDrawer) {
        setIsDrawerOpen(true);
      }
      return res.data;
    } catch (e) {
      console.error("Failed to add to cart", e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, newQty) => {
    try {
      const res = await client.put(`/cart/items/${cartItemId}`, { quantity: newQty });
      setCart(res.data);
    } catch (e) {
      console.error("Failed to update cart item", e);
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      const res = await client.delete(`/cart/items/${cartItemId}`);
      setCart(res.data);
    } catch (e) {
      console.error("Failed to remove cart item", e);
    }
  };

  const clearCartState = () => {
    setCart({
      items: [],
      total_items: 0,
      subtotal_pkr: 0,
      delivery_fee_pkr: 120,
      free_delivery_threshold_pkr: 2500,
      free_delivery_remaining_pkr: 2500,
      estimated_total_pkr: 0
    });
  };

  return (
    <CartContext.Provider value={{
      cart,
      totalItems: cart.total_items,
      subtotal: cart.subtotal_pkr,
      isDrawerOpen,
      setIsDrawerOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      fetchCart,
      clearCartState,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
