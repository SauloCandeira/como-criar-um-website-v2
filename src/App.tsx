import './App.css'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from 'react';
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
import Preview from './pages/Preview/Preview';

const RouteLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const randomVariant = useMemo(() => {
    const variants = ['planet', 'moon', 'sun', 'saturn'] as const;
    return variants[Math.floor(Math.random() * variants.length)];
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    const delay = location.pathname === '/' ? 1600 : 700;
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <LoadingOverlay
      visible={loading}
      variant={location.pathname === '/' ? 'rocket' : randomVariant}
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
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/admin/governanca/relatorios" element={<Admin />} />
        <Route path="/admin/mybots/overview" element={<Admin />} />
        <Route path="/admin/mybots/battles" element={<Admin />} />
        <Route path="/admin/mybots/ecosystem" element={<Admin />} />
        <Route path="/admin/dao/propostas" element={<Admin />} />
        <Route path="/admin/dao/votacoes" element={<Admin />} />
        <Route path="/admin/dao/tesouraria" element={<Admin />} />
        <Route path="/admin/dao/membros" element={<Admin />} />
        <Route path="/admin/ia/hktech" element={<Admin />} />
        <Route path="/admin/ia/tasks" element={<Admin />} />
        <Route path="/admin/ia/crons" element={<Admin />} />
        <Route path="/admin/ia/agents" element={<Admin />} />
        <Route path="/admin/ia/orchestrator" element={<Admin />} />
        <Route path="/admin/ia/context" element={<Admin />} />
        <Route path="/admin/ia/memory" element={<Admin />} />
        <Route path="/admin/ia/reports" element={<Admin />} />
        <Route path="/admin/monitoramento/sonar" element={<Admin />} />
        <Route path="/admin/monitoramento/overview" element={<Admin />} />
        <Route path="/admin/monitoramento/coverage" element={<Admin />} />
        <Route path="/admin/monitoramento/ci" element={<Admin />} />
        <Route path="/admin/monitoramento/executions" element={<Admin />} />
        <Route path="/admin/monitoramento/health" element={<Admin />} />
        <Route path="/admin/projetos/templates" element={<Admin />} />
        <Route path="/admin/projetos/templates/novo" element={<Admin />} />
        <Route path="/admin/projetos/templates/:id" element={<Admin />} />
        <Route path="/admin/projetos/clonados" element={<Admin />} />
        <Route path="/admin/operacoes/usuarios" element={<Admin />} />
        <Route path="/admin/operacoes/projetos" element={<Admin />} />
        <Route path="/admin/operacoes/produtos" element={<Admin />} />
        <Route path="/admin/sistema/tools" element={<Admin />} />
        <Route path="/admin/sistema/sonarcloud" element={<Admin />} />
        <Route path="/admin/sistema/hktech-ia" element={<Admin />} />
        <Route path="/admin/sistema/ai-reports" element={<Admin />} />
        <Route path="/admin/documentacao/api" element={<Admin />} />
        <Route path="/admin/documentacao/ui" element={<Admin />} />
        <Route path="/admin/documentacao/architecture" element={<Admin />} />
        <Route path="/admin/financeiro" element={<Admin />} />
        <Route path="/admin/financeiro/vendas" element={<Admin />} />
        <Route path="/admin/financeiro/resgates" element={<Admin />} />
        <Route path="/admin/financeiro/custos" element={<Admin />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/course" element={<Course />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/investor" element={<Investor />} />
        <Route path="/preview/:projectId" element={<Preview />} />
        {/* <Route path="/como-criar-um-website-v2/login" element={<Login />} /> */}
        {/* <Route path="/about/" element={<Home />} /> */}
        {/* <Route path="/project/:id" element={<ProjectDetails />} /> */}
      </Routes>
    </BrowserRouter>

  )
}
