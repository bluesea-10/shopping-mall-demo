import { useEffect, useState } from 'react';
import { getCart } from '../api/client';

export const CART_UPDATED_EVENT = 'cart-updated';

function getCartItemCount(cart) {
  if (!cart?.items?.length) return 0;
  return cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function notifyCartUpdated(cart) {
  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: { count: getCartItemCount(cart) },
    })
  );
}

export function useCartCount(enabled = true) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCartCount(0);
      return undefined;
    }

    let cancelled = false;

    const loadCartCount = () => {
      getCart()
        .then((data) => {
          if (!cancelled) {
            setCartCount(getCartItemCount(data.cart));
          }
        })
        .catch(() => {
          if (!cancelled) setCartCount(0);
        });
    };

    loadCartCount();

    const handleCartUpdated = (event) => {
      if (typeof event.detail?.count === 'number') {
        setCartCount(event.detail.count);
        return;
      }
      loadCartCount();
    };

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [enabled]);

  return cartCount;
}
