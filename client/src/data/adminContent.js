export const ADMIN_STATS = [
  {
    id: 'orders',
    label: '총 주문',
    value: '1,234',
    change: '+12% from last month',
    tone: 'blue',
    icon: 'cart',
  },
  {
    id: 'products',
    label: '총 상품',
    value: '156',
    change: '+3% from last month',
    tone: 'green',
    icon: 'box',
  },
  {
    id: 'customers',
    label: '총 고객',
    value: '2,345',
    change: '+8% from last month',
    tone: 'purple',
    icon: 'users',
  },
  {
    id: 'sales',
    label: '총 매출',
    value: '$45,678',
    change: '+15% from last month',
    tone: 'orange',
    icon: 'chart',
  },
];

export const ADMIN_MENUS = [
  {
    id: 'products',
    title: '상품 관리',
    description: '상품 등록, 수정, 삭제 및 재고 관리',
    icon: 'box',
    tone: 'brown',
    to: '/admin/products',
  },
  {
    id: 'orders',
    title: '주문 관리',
    description: '주문 조회, 상태 변경 및 배송 관리',
    icon: 'cart',
    tone: 'blue',
    to: '/admin/orders',
  },
];

export const RECENT_ORDERS = [
  {
    id: 'ORD-001234',
    customer: '김민수',
    date: '2024-12-30',
    status: '처리중',
    statusTone: 'warning',
    amount: '$219',
  },
  {
    id: 'ORD-001233',
    customer: '이서연',
    date: '2024-12-29',
    status: '배송중',
    statusTone: 'info',
    amount: '$156',
  },
  {
    id: 'ORD-001232',
    customer: '박준호',
    date: '2024-12-29',
    status: '배송완료',
    statusTone: 'success',
    amount: '$342',
  },
  {
    id: 'ORD-001231',
    customer: '최유진',
    date: '2024-12-28',
    status: '처리중',
    statusTone: 'warning',
    amount: '$89',
  },
  {
    id: 'ORD-001230',
    customer: '정하늘',
    date: '2024-12-28',
    status: '배송완료',
    statusTone: 'success',
    amount: '$267',
  },
];
