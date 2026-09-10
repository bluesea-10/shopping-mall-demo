import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import AdminOrders from './pages/AdminOrders';
import AdminProductList from './pages/AdminProductList';
import AdminProductRegister from './pages/AdminProductRegister';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import Login from './pages/Login';
import OrderSuccess from './pages/OrderSuccess';
import MyOrders from './pages/MyOrders';
import ProductDetail from './pages/ProductDetail';
import Signup from './pages/Signup';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/success" element={<OrderSuccess />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/products" element={<AdminProductList />} />
        <Route
          path="/admin/products/register"
          element={<AdminProductRegister />}
        />
        <Route
          path="/admin/products/:id/edit"
          element={<AdminProductRegister />}
        />
        <Route path="/admin/orders" element={<AdminOrders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
