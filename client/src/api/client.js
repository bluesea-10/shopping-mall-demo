const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

async function request(path, options = {}) {
  let response;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    const error = new Error(
      '서버에 연결할 수 없습니다. server에서 npm run dev를 실행해 주세요.'
    );
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `API request failed: ${response.status}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options = {}) => request(path, options),
  post: (path, body, options = {}) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
      headers: {
        ...options.headers,
      },
    }),
  put: (path, body, options = {}) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
      headers: {
        ...options.headers,
      },
    }),
  delete: (path, options = {}) =>
    request(path, {
      method: 'DELETE',
      ...options,
      headers: {
        ...options.headers,
      },
    }),
};

/** 회원가입: POST /api/users */
export async function createUser(userData) {
  return api.post('/users', userData);
}

/** 로그인: POST /api/auth/login */
export async function loginUser({ email, password }) {
  return api.post('/auth/login', { email, password });
}

/** 내 정보 조회: GET /api/auth/me */
export async function getMe() {
  const token = getStoredToken();

  if (!token) {
    const error = new Error('인증 토큰이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return request('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/** 상품 목록: GET /api/products?page=1&limit=2 */
export async function getProducts(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(cleanParams).map(([key, value]) => [key, String(value)])
    )
  ).toString();
  return api.get(`/products${query ? `?${query}` : ''}`);
}

/** 전체 상품 목록: GET /api/products?all=true */
export async function getAllProducts(params = {}) {
  return getProducts({ ...params, all: true });
}

/** 상품 상세: GET /api/products/:id */
export async function getProductById(id) {
  return api.get(`/products/${id}`);
}

/** 상품 등록: POST /api/products (관리자) */
export async function createProduct(productData) {
  const token = getStoredToken();

  if (!token) {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return api.post('/products', productData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/** 상품 수정: PUT /api/products/:id (관리자) */
export async function updateProduct(id, productData) {
  const token = getStoredToken();

  if (!token) {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return api.put(`/products/${id}`, productData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/** 상품 삭제: DELETE /api/products/:id (관리자) */
export async function deleteProduct(id) {
  const token = getStoredToken();

  if (!token) {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return api.delete(`/products/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function authRequest(path, options = {}) {
  const token = getStoredToken();

  if (!token) {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return request(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/** 장바구니 조회: GET /api/cart */
export async function getCart() {
  return authRequest('/cart');
}

/** 장바구니 추가: POST /api/cart/items */
export async function addCartItem({ productId, quantity, size }) {
  return authRequest('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, size }),
  });
}

/** 장바구니 항목 수정: PUT /api/cart/items/:itemId */
export async function updateCartItem(itemId, data) {
  return authRequest(`/cart/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 장바구니 항목 삭제: DELETE /api/cart/items/:itemId */
export async function removeCartItem(itemId) {
  return authRequest(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

/** 배송지 기본값: GET /api/orders/checkout-defaults */
export async function getCheckoutDefaults() {
  return authRequest('/orders/checkout-defaults');
}

/** 주문 생성: POST /api/orders */
export async function createOrder(orderData) {
  return authRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/** 내 주문 목록: GET /api/orders */
export async function getMyOrders() {
  return authRequest('/orders');
}

/** 주문 상세: GET /api/orders/:id */
export async function getOrderById(id) {
  return authRequest(`/orders/${id}`);
}

/** 전체 주문 (관리자): GET /api/orders/admin */
export async function getAllOrders() {
  return authRequest('/orders/admin');
}

/** 주문 상태 변경 (관리자): PATCH /api/orders/:id/status */
export async function updateOrderStatus(id, status) {
  return authRequest(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** 주문 수정 (관리자): PUT /api/orders/:id */
export async function updateOrder(id, orderData) {
  return authRequest(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  });
}

/** 주문 삭제 (관리자): DELETE /api/orders/:id */
export async function deleteOrder(id) {
  return authRequest(`/orders/${id}`, {
    method: 'DELETE',
  });
}

export { getStoredToken };
