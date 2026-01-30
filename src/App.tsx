import './App.css'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from 'react';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import Checkout from './pages/Checkout/Checkout';
import Product from './pages/Product/Product';
import Admin from './pages/Admin/Admin';
import './i18n'; // Importa o arquivo de configuração do i18next
import MarketPlace from './pages/Marketplace/Marketplace';
import Course from './pages/Course/Course';
import Editor from './pages/Editor/Editor';
import Manager from './pages/Manager/Manager';
import Investor from './pages/Investor/Investor';
import Account from './pages/Account/Account';
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay';

const RouteLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const delay = location.pathname === '/' ? 900 : 600;
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <LoadingOverlay
      visible={loading}
      variant={location.pathname === '/' ? 'rocket' : 'default'}
    />
  );
};

export function App() {
  return (

    
    
    <BrowserRouter>
      <RouteLoader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
        <Route path="/product" element={<Product />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/course" element={<Course />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/investor" element={<Investor />} />
        {/* <Route path="/como-criar-um-website-v2/login" element={<Login />} /> */}
        {/* <Route path="/about/" element={<Home />} /> */}
        {/* <Route path="/project/:id" element={<ProjectDetails />} /> */}
      </Routes>
    </BrowserRouter>

  )
}
