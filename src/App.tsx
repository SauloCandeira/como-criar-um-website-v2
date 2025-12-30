import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export function App() {
  return (

    
    
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/product" element={<Product />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/course" element={<Course />} />
        <Route path="/editor" element={<Editor />} />
        {/* <Route path="/como-criar-um-website-v2/login" element={<Login />} /> */}
        {/* <Route path="/about/" element={<Home />} /> */}
        {/* <Route path="/project/:id" element={<ProjectDetails />} /> */}
      </Routes>
    </BrowserRouter>

  )
}
