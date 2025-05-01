import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Checkout from './pages/Checkout/Checkout';
import Product from './pages/Product/Product';
import Admin from './pages/Admin/Admin';
import './i18n'; // Importa o arquivo de configuração do i18next
import MarketPlace from './pages/Marketplace/Marketplace';
import Course from './pages/Course/Course';
import Editor from './pages/Editor/Editor';

export function App() {
  return (

    
    
    <BrowserRouter>
      <Routes>
        <Route path="/como-criar-um-website-v2/" element={<Home />} />
        <Route path="/como-criar-um-website-v2/login" element={<Login />} />
        <Route path="/como-criar-um-website-v2/dashboard" element={<Dashboard />} />
        <Route path="/como-criar-um-website-v2/product" element={<Product />} />
        <Route path="/como-criar-um-website-v2/checkout" element={<Checkout />} />
        <Route path="/como-criar-um-website-v2/admin" element={<Admin />} />
        <Route path="/como-criar-um-website-v2/marketplace" element={<MarketPlace />} />
        <Route path="/como-criar-um-website-v2/course" element={<Course />} />
        <Route path="/como-criar-um-website-v2/editor" element={<Editor />} />
        {/* <Route path="/como-criar-um-website-v2/login" element={<Login />} /> */}
        {/* <Route path="/about/" element={<Home />} /> */}
        {/* <Route path="/project/:id" element={<ProjectDetails />} /> */}
      </Routes>
    </BrowserRouter>

  )
}
