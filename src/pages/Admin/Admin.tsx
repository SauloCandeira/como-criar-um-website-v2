import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/init-firebase';
import { deleteUser, fetchUserByEmail, fetchUsers, updateUser, upsertUser, UserDTO } from '../../services/usersApi';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../../services/productsApi';
import { createProject, deleteProject, fetchProjects, updateProject } from '../../services/projectsApi';
import { createCost, deleteCost, fetchCosts, updateCost } from '../../services/costsApi';
import { fetchSales, SaleDTO } from '../../services/salesApi';
import { fetchAccesses, AccessDTO } from '../../services/accessesApi';

// Registrar os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Sale = SaleDTO;

interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
  showOnHome?: boolean;
  purchasePrice?: string;
  salePrice?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  projectType?: string;
  salePrice?: string;
  productionCost?: string;
  purchaseCount?: number;
  repository: string;
  domain: string;
  hosting: string;
  status: string;
  paid: boolean;
  isPublic: boolean;
}

interface CostItem {
  id: string;
  name: string;
  costValue: string;
  billingCycle: 'monthly' | 'annual';
}

type AccessItem = AccessDTO;

interface UserItem {
  id: string;
  name: string;
  email: string;
  authProvider?: string;
  status?: 'Ativo' | 'Inativo';
  cpf?: string;
  address?: string;
  paymentMethods?: string[];
  permissionLevel?: 'A' | 'B' | 'C';
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [permissionLevel, setPermissionLevel] = useState<'A' | 'B' | 'C'>(
    (localStorage.getItem('permissionLevel') || 'A') as 'A' | 'B' | 'C'
  );
  const currentEmail = (localStorage.getItem('email') || '').toLowerCase();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const profile = await fetchUserByEmail(currentEmail || user.email || '');
        const dbLevel = (profile?.permissionLevel || 'A') as 'A' | 'B' | 'C';
        setPermissionLevel(dbLevel);
        localStorage.setItem('permissionLevel', dbLevel);
        if (dbLevel !== 'B') {
          navigate('/account', { replace: true });
        }
      } catch (error) {
        console.error('Erro ao validar permissão:', error);
        navigate('/account', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [currentEmail, navigate]);

  const [activeTab, setActiveTab] = useState('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', permissionLevel: 'A' as 'A' | 'B' | 'C' });

  const permissionLabels: Record<'A' | 'B' | 'C', string> = {
    A: 'A - USER',
    B: 'B - ADMIN',
    C: 'C - INVESTIDOR'
  };
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({
    id: '',
    name: '',
    email: '',
    permissionLevel: 'A' as 'A' | 'B' | 'C'
  });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', showOnHome: false, purchasePrice: '', salePrice: '' });
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState({ id: '', name: '', price: '', description: '', showOnHome: false, purchasePrice: '', salePrice: '' });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [accesses, setAccesses] = useState<AccessItem[]>([]);
  const [accessesLoading, setAccessesLoading] = useState(false);
  const [accessesError, setAccessesError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    projectType: 'Landingpage',
    salePrice: '',
    productionCost: '',
    purchaseCount: 0,
    repository: '',
    domain: '',
    hosting: 'Vercel',
    status: 'Ativo',
    paid: false,
    isPublic: true,
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState({
    id: '',
    name: '',
    description: '',
    projectType: 'Landingpage',
    salePrice: '',
    productionCost: '',
    purchaseCount: 0,
    repository: '',
    domain: '',
    hosting: 'Vercel',
    status: 'Ativo',
    paid: false,
    isPublic: true,
  });
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [costsError, setCostsError] = useState<string | null>(null);
  const [newCost, setNewCost] = useState({ name: '', costValue: '', billingCycle: 'monthly' as 'monthly' | 'annual' });
  const [isEditCostModalOpen, setIsEditCostModalOpen] = useState(false);
  const [editCostData, setEditCostData] = useState({ id: '', name: '', costValue: '', billingCycle: 'monthly' as 'monthly' | 'annual' });
  const [selectedPeriod, setSelectedPeriod] = useState('day'); // day, month, year


  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await fetchUsers();
      const mapped = data.map((user: UserDTO) => ({
        id: user.id,
        name: user.name || 'Sem nome',
        email: user.email || 'Sem email',
        authProvider: user.authProvider || 'N/D',
        status: (user.status as 'Ativo' | 'Inativo') || 'Ativo',
        permissionLevel: user.permissionLevel || 'A'
      }));
      setUsers(mapped);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsersError('Não foi possível carregar os usuários.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProductsError('Não foi possível carregar os produtos.');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      setProjectsError('Não foi possível carregar os projetos.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadAccesses = async () => {
    setAccessesLoading(true);
    setAccessesError(null);
    try {
      const data = await fetchAccesses();
      setAccesses(data);
    } catch (error) {
      console.error('Erro ao buscar acessos:', error);
      setAccessesError(error instanceof Error ? error.message : 'Não foi possível carregar os acessos.');
    } finally {
      setAccessesLoading(false);
    }
  };

  const loadSales = async () => {
    setSalesLoading(true);
    setSalesError(null);
    try {
      const data = await fetchSales();
      setSales(data);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setSalesError(error instanceof Error ? error.message : 'Não foi possível carregar as vendas.');
    } finally {
      setSalesLoading(false);
    }
  };

  const loadCosts = async () => {
    setCostsLoading(true);
    setCostsError(null);
    try {
      const data = await fetchCosts();
      setCosts(data);
    } catch (error) {
      console.error('Erro ao buscar custos:', error);
      setCostsError(error instanceof Error ? error.message : 'Não foi possível carregar os custos.');
    } finally {
      setCostsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadProducts();
    loadProjects();
    loadCosts();
    loadSales();
    loadAccesses();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setUsersError('Preencha nome e email.');
      return;
    }
    try {
      await upsertUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        permissionLevel: newUser.permissionLevel,
        status: 'Ativo'
      });
      setNewUser({ name: '', email: '', permissionLevel: 'A' });
      loadUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setUsersError('Não foi possível criar o usuário.');
    }
  };

  const handleEditUser = (user: UserItem) => {
    setUsersError(null);
    setEditUserData({
      id: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: (user.permissionLevel || 'A') as 'A' | 'B' | 'C'
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveUserEdit = async () => {
    if (!editUserData.name.trim() || !editUserData.email.trim()) {
      setUsersError('Preencha nome e email.');
      return;
    }
    try {
      await updateUser(editUserData.id, {
        name: editUserData.name.trim(),
        email: editUserData.email.trim(),
        permissionLevel: editUserData.permissionLevel
      });
      setIsEditUserModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao editar usuário:', error);
      setUsersError('Não foi possível editar o usuário.');
    }
  };

  const handleDeactivateUser = async (user: UserItem) => {
    try {
      await updateUser(user.id, { status: 'Inativo' });
      loadUsers();
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      setUsersError('Não foi possível desativar o usuário.');
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`Excluir o usuário ${user.name}?`)) return;
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setUsersError('Não foi possível excluir o usuário.');
    }
  };

  const handleCreateProduct = async () => {
    setProductsError(null);
    if (!newProduct.name.trim() || !newProduct.price.trim()) {
      setProductsError('Preencha nome e preço.');
      return;
    }
    try {
      await createProduct({
        name: newProduct.name.trim(),
        price: newProduct.price.trim(),
        description: newProduct.description.trim(),
        showOnHome: newProduct.showOnHome
        ,purchasePrice: newProduct.purchasePrice.trim(),
        salePrice: newProduct.salePrice.trim() || newProduct.price.trim()
      });
      setNewProduct({ name: '', price: '', description: '', showOnHome: false, purchasePrice: '', salePrice: '' });
      setIsProductModalOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      setProductsError('Não foi possível criar o produto.');
    }
  };

  const handleEditProduct = (product: ProductItem) => {
    setProductsError(null);
    setEditProductData({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      showOnHome: product.showOnHome ?? false,
      purchasePrice: product.purchasePrice ?? '',
      salePrice: product.salePrice ?? product.price
    });
    setIsEditProductModalOpen(true);
  };

  const handleSaveProductEdit = async () => {
    if (!editProductData.name.trim() || !editProductData.price.trim()) {
      setProductsError('Preencha nome e preço.');
      return;
    }
    try {
      await updateProduct(editProductData.id, {
        name: editProductData.name.trim(),
        price: editProductData.price.trim(),
        description: editProductData.description.trim(),
        showOnHome: editProductData.showOnHome,
        purchasePrice: editProductData.purchasePrice.trim(),
        salePrice: editProductData.salePrice.trim() || editProductData.price.trim()
      });
      setIsEditProductModalOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      setProductsError('Não foi possível editar o produto.');
    }
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    if (!window.confirm(`Excluir o produto ${product.name}?`)) return;
    try {
      await deleteProduct(product.id);
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      setProductsError('Não foi possível excluir o produto.');
    }
  };

  const handleCreateCost = async () => {
    setCostsError(null);
    if (!newCost.name.trim()) {
      setCostsError('Preencha o nome do custo.');
      return;
    }
    try {
      await createCost({
        name: newCost.name.trim(),
        costValue: newCost.costValue.trim(),
        billingCycle: newCost.billingCycle,
      });
      setNewCost({ name: '', costValue: '', billingCycle: 'monthly' });
      loadCosts();
    } catch (error) {
      console.error('Erro ao criar custo:', error);
      setCostsError('Não foi possível criar o custo.');
    }
  };

  const handleEditCost = (cost: CostItem) => {
    setCostsError(null);
    setEditCostData({
      id: cost.id,
      name: cost.name,
      costValue: cost.costValue,
      billingCycle: cost.billingCycle ?? 'monthly',
    });
    setIsEditCostModalOpen(true);
  };

  const handleSaveCostEdit = async () => {
    if (!editCostData.name.trim()) {
      setCostsError('Preencha o nome do custo.');
      return;
    }
    try {
      await updateCost(editCostData.id, {
        name: editCostData.name.trim(),
        costValue: editCostData.costValue.trim(),
        billingCycle: editCostData.billingCycle,
      });
      setIsEditCostModalOpen(false);
      loadCosts();
    } catch (error) {
      console.error('Erro ao editar custo:', error);
      setCostsError('Não foi possível editar o custo.');
    }
  };

  const handleDeleteCost = async (cost: CostItem) => {
    if (!window.confirm(`Excluir o custo ${cost.name}?`)) return;
    try {
      await deleteCost(cost.id);
      loadCosts();
    } catch (error) {
      console.error('Erro ao excluir custo:', error);
      setCostsError('Não foi possível excluir o custo.');
    }
  };

  const handleCreateProject = async () => {
    setProjectsError(null);
    if (!newProject.name.trim()) {
      setProjectsError('Preencha o nome do projeto.');
      return;
    }
    try {
      await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        projectType: newProject.projectType,
        salePrice: newProject.salePrice.trim(),
        productionCost: newProject.productionCost.trim(),
        purchaseCount: newProject.purchaseCount,
        repository: newProject.repository.trim(),
        domain: newProject.domain.trim(),
        hosting: newProject.hosting.trim(),
        status: newProject.status.trim(),
        paid: newProject.paid,
        isPublic: newProject.isPublic,
      });
      setNewProject({
        name: '',
        description: '',
        projectType: 'Landingpage',
        salePrice: '',
        productionCost: '',
        purchaseCount: 0,
        repository: '',
        domain: '',
        hosting: 'Vercel',
        status: 'Ativo',
        paid: false,
        isPublic: true,
      });
      setIsProjectModalOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      setProjectsError('Não foi possível criar o projeto.');
    }
  };

  const handleEditProject = (project: ProjectItem) => {
    setProjectsError(null);
    setEditProjectData({
      id: project.id,
      name: project.name,
      description: project.description,
      projectType: project.projectType || 'Landingpage',
      salePrice: project.salePrice || '',
      productionCost: project.productionCost || '',
      purchaseCount: project.purchaseCount ?? 0,
      repository: project.repository,
      domain: project.domain,
      hosting: project.hosting || 'Vercel',
      status: project.status || 'Ativo',
      paid: project.paid,
      isPublic: project.isPublic ?? true,
    });
    setIsProjectEditModalOpen(true);
  };

  const handleSaveProjectEdit = async () => {
    if (!editProjectData.name.trim()) {
      setProjectsError('Preencha o nome do projeto.');
      return;
    }
    try {
      await updateProject(editProjectData.id, {
        name: editProjectData.name.trim(),
        description: editProjectData.description.trim(),
        projectType: editProjectData.projectType,
        salePrice: editProjectData.salePrice.trim(),
        productionCost: editProjectData.productionCost.trim(),
        purchaseCount: editProjectData.purchaseCount,
        repository: editProjectData.repository.trim(),
        domain: editProjectData.domain.trim(),
        hosting: editProjectData.hosting.trim(),
        status: editProjectData.status.trim(),
        paid: editProjectData.paid,
        isPublic: editProjectData.isPublic,
      });
      setIsProjectEditModalOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Erro ao editar projeto:', error);
      setProjectsError('Não foi possível editar o projeto.');
    }
  };

  const handleDeleteProject = async (project: ProjectItem) => {
    if (!window.confirm(`Excluir o projeto ${project.name}?`)) return;
    try {
      await deleteProject(project.id);
      loadProjects();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      setProjectsError('Não foi possível excluir o projeto.');
    }
  };

  // Função para formatar a data
  const formatDate = (date: string) => {
    const [day, month, year] = date.split('/');
    return new Date(+year, +month - 1, +day);
  };

  const formatAccessDate = (date: string) => {
    if (!date) return new Date();
    const parts = date.split('/');
    if (parts.length !== 3) return new Date(date);
    const [day, month, year] = parts;
    return new Date(+year, +month - 1, +day);
  };

  const parseSaleValue = (value: string) => {
    const numeric = parseFloat(String(value).replace('R$', '').replace('.', '').replace(',', '.'));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const parseCostValue = (value: string) => {
    const numeric = parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.'));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const getMonthlyCost = (cost: CostItem) => {
    const value = parseCostValue(cost.costValue);
    return cost.billingCycle === 'annual' ? value / 12 : value;
  };

  const getAnnualCost = (cost: CostItem) => {
    const value = parseCostValue(cost.costValue);
    return cost.billingCycle === 'annual' ? value : value * 12;
  };

  const groupSalesByPeriod = (sales: Sale[], period: string) => {
    return sales.reduce(
      (acc: Record<string, { count: number; total: number }>, sale) => {
        const date = formatDate(sale.date);
        let key: string;

        if (period === 'day') {
          key = date.toLocaleDateString();
        } else if (period === 'month') {
          key = `${date.getMonth() + 1}/${date.getFullYear()}`;
        } else {
          key = date.getFullYear().toString();
        }

        if (!acc[key]) acc[key] = { count: 0, total: 0 };
        acc[key].count += 1;
        acc[key].total += parseSaleValue(sale.value);
        return acc;
      },
      {}
    );
  };

  // Agrupar as vendas por período
  const salesGrouped = groupSalesByPeriod(sales, selectedPeriod);
  const chartLabels = Object.keys(salesGrouped);
  const chartData = Object.values(salesGrouped).map((item) => item.count);
  const chartRevenueData = Object.values(salesGrouped).map((item) => Number(item.total.toFixed(2)));

  const groupAccessesByPeriod = (entries: AccessItem[], period: string) => {
    return entries.reduce((acc: Record<string, number>, entry) => {
      const date = formatAccessDate(entry.date);
      let key: string;
      if (period === 'day') {
        key = date.toLocaleDateString();
      } else if (period === 'month') {
        key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      } else {
        key = date.getFullYear().toString();
      }
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    }, {});
  };

  const accessGrouped = groupAccessesByPeriod(accesses, selectedPeriod);
  const accessLabels = Object.keys(accessGrouped);
  const accessData = Object.values(accessGrouped);

  const chartDataLine = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Quantidade de vendas',
        data: chartData,
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      },
    ],
  };

  const chartDataBar = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Faturamento (R$)',
        data: chartRevenueData,
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderColor: 'rgba(255,99,132,1)',
        borderWidth: 1,
      },
    ],
  };

  const chartAvgTicket = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Ticket médio (R$)',
        data: Object.values(salesGrouped).map((item) =>
          Number((item.count ? item.total / item.count : 0).toFixed(2))
        ),
        borderColor: 'rgba(59,130,246,1)',
        fill: false,
      },
    ],
  };

  const chartAccesses = {
    labels: accessLabels,
    datasets: [
      {
        label: 'Acessos',
        data: accessData,
        borderColor: 'rgba(34,197,94,1)',
        fill: false,
      },
    ],
  };

  const costsLabels = costs.map((cost) => cost.name);
  const costsValues = costs.map((cost) => Number(getMonthlyCost(cost).toFixed(2)));

  const chartCosts = {
    labels: costsLabels,
    datasets: [
      {
        label: 'Custos mensais (R$)',
        data: costsValues,
        backgroundColor: 'rgba(249,115,22,0.2)',
        borderColor: 'rgba(249,115,22,1)',
        borderWidth: 1,
      },
    ],
  };

  const totalRevenue = sales.reduce((acc, sale) => acc + parseSaleValue(sale.value), 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;
  const latestSaleDate = sales.length
    ? sales
        .map((sale) => formatDate(sale.date))
        .reduce((latest, current) => (current > latest ? current : latest))
    : null;
  const totalCostsMonthly = costs.reduce((acc, cost) => acc + getMonthlyCost(cost), 0);
  const totalCostsAnnual = costs.reduce((acc, cost) => acc + getAnnualCost(cost), 0);
  const profit = totalRevenue - totalCostsMonthly;
  const totalAccesses = accesses.length;

  return (
    <LayoutPrivate
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
    >
      <div className={`admin-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="admin-sidebar">
          <h2>Admin</h2>
          <ul>
            <li className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
              Relatórios
            </li>
            <li className={activeTab === 'accounting' ? 'active' : ''} onClick={() => setActiveTab('accounting')}>
              Contabilidade
            </li>
            <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              Usuários
            </li>
            <li className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>
              Vendas
            </li>
            <li className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
              Projetos
            </li>
            <li className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
              Produtos
            </li>
            <li className={activeTab === 'costs' ? 'active' : ''} onClick={() => setActiveTab('costs')}>
              Custos
            </li>
          </ul>
        </aside>

        <main className="admin-content">
        {activeTab === 'reports' && (
          <section>
            <h2>Relatórios</h2>
            {salesLoading && <p>Carregando vendas...</p>}
            {salesError && <p>{salesError}</p>}
            {accessesLoading && <p>Carregando acessos...</p>}
            {accessesError && <p>{accessesError}</p>}
            <div className="report-summary">
              <div className="report-card">
                <span>Total de usuários</span>
                <strong>{users.length}</strong>
              </div>
              <div className="report-card">
                <span>Total de vendas</span>
                <strong>{sales.length}</strong>
              </div>
              <div className="report-card">
                <span>Faturamento</span>
                <strong>R$ {totalRevenue.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Ticket médio</span>
                <strong>R$ {avgTicket.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Custos mensais</span>
                <strong>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Custos anuais</span>
                <strong>R$ {totalCostsAnnual.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Lucro / prejuízo</span>
                <strong>{profit >= 0 ? 'R$ ' : '-R$ '}{Math.abs(profit).toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Acessos</span>
                <strong>{totalAccesses}</strong>
              </div>
              <div className="report-card">
                <span>Última venda</span>
                <strong>{latestSaleDate ? latestSaleDate.toLocaleDateString() : '—'}</strong>
              </div>
            </div>

            <div className="report-filter">
              <h3>Filtro por Período</h3>
              <select onChange={(e) => setSelectedPeriod(e.target.value)} value={selectedPeriod}>
                <option value="day">Diário</option>
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div className="report-charts">
              <div className="report-chart">
                <h3>Vendas por período</h3>
                <Line data={chartDataLine} />
              </div>
              <div className="report-chart">
                <h3>Faturamento por período</h3>
                <Bar data={chartDataBar} />
              </div>
              <div className="report-chart">
                <h3>Ticket médio</h3>
                <Line data={chartAvgTicket} />
              </div>
              <div className="report-chart">
                <h3>Custos principais</h3>
                <Bar data={chartCosts} />
              </div>
              <div className="report-chart">
                <h3>Acessos por período</h3>
                <Line data={chartAccesses} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'accounting' && (
          <section>
            <h2>Contabilidade</h2>
            <div className="report-summary">
              <div className="report-card">
                <span>Receita (mês)</span>
                <strong>R$ {totalRevenue.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Custos (mês)</span>
                <strong>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Resultado (mês)</span>
                <strong>{profit >= 0 ? 'R$ ' : '-R$ '}{Math.abs(profit).toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Receita (ano)</span>
                <strong>R$ {(totalRevenue * 12).toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Custos (ano)</span>
                <strong>R$ {totalCostsAnnual.toFixed(2).replace('.', ',')}</strong>
              </div>
            </div>

            <div className="report-card">
              <span>Orçamento de funcionamento (2 anos)</span>
              <strong>R$ {(totalCostsAnnual * 2).toFixed(2).replace('.', ',')}</strong>
            </div>

            <div className="report-chart">
              <h3>Balanço patrimonial (simplificado)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ativo - Caixa</td>
                    <td>R$ {(totalRevenue - totalCostsMonthly).toFixed(2).replace('.', ',')}</td>
                  </tr>
                  <tr>
                    <td>Passivo - Custos mensais</td>
                    <td>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</td>
                  </tr>
                  <tr>
                    <td>Patrimônio líquido</td>
                    <td>{profit >= 0 ? 'R$ ' : '-R$ '}{Math.abs(profit).toFixed(2).replace('.', ',')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <h2>Usuários Cadastrados</h2>
            {usersLoading && <p>Carregando usuários...</p>}
            {usersError && <p>{usersError}</p>}
            <div className="admin-user-actions">
              <input
                type="text"
                placeholder="Nome"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              />
              <select
                value={newUser.permissionLevel}
                onChange={(e) => setNewUser((prev) => ({ ...prev, permissionLevel: e.target.value as 'A' | 'B' | 'C' }))}
              >
                <option value="A">A - USER</option>
                <option value="B">B - ADMIN</option>
                <option value="C">C - INVESTIDOR</option>
              </select>
              <button className="admin-btn" onClick={handleCreateUser}>Criar novo</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Cadastro</th>
                  <th>Permissão</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={7}>Nenhum usuário encontrado.</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.authProvider}</td>
                    <td>{permissionLabels[user.permissionLevel || 'A']}</td>
                    <td>{user.status}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => setSelectedUser(user)}>Visualizar</button>
                      <button className="admin-btn" onClick={() => handleEditUser(user)}>Editar</button>
                      <button className="admin-btn" onClick={() => handleDeactivateUser(user)}>Desativar</button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteUser(user)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedUser && (
              <div className="admin-modal-backdrop" onClick={() => setSelectedUser(null)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Dados do usuário</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedUser(null)}>Fechar</button>
                  </div>
                  <div className="admin-modal__grid">
                    <div>
                      <span>Nome</span>
                      <strong>{selectedUser.name}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selectedUser.email}</strong>
                    </div>
                    <div>
                      <span>Cadastro</span>
                      <strong>{selectedUser.authProvider}</strong>
                    </div>
                    <div>
                      <span>Permissão</span>
                      <strong>{permissionLabels[selectedUser.permissionLevel || 'A']}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{selectedUser.status}</strong>
                    </div>
                    <div>
                      <span>CPF</span>
                      <strong>{selectedUser.cpf || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span>Endereço</span>
                      <strong>{selectedUser.address || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span>Métodos de pagamento</span>
                      <strong>{selectedUser.paymentMethods?.length ? selectedUser.paymentMethods.join(', ') : 'Não informado'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isEditUserModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsEditUserModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Editar usuário</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditUserModalOpen(false)}>Fechar</button>
                  </div>
                  {usersError && <p className="admin-modal__error">{usersError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        value={editUserData.name}
                        onChange={(e) => setEditUserData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        value={editUserData.email}
                        onChange={(e) => setEditUserData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Permissão</span>
                      <select
                        value={editUserData.permissionLevel}
                        onChange={(e) => setEditUserData((prev) => ({ ...prev, permissionLevel: e.target.value as 'A' | 'B' | 'C' }))}
                      >
                        <option value="A">A - USER</option>
                        <option value="B">B - ADMIN</option>
                        <option value="C">C - INVESTIDOR</option>
                      </select>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditUserModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleSaveUserEdit}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'sales' && (
          <section>
            <h2>Vendas Realizadas</h2>
            {salesLoading && <p>Carregando vendas...</p>}
            {salesError && <p>{salesError}</p>}
            <table>
              <thead>
                <tr>
                  <th>ID Venda</th>
                  <th>Usuário</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {!salesLoading && sales.length === 0 && (
                  <tr>
                    <td colSpan={4}>Nenhuma venda encontrada.</td>
                  </tr>
                )}
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>{sale.user}</td>
                    <td>{sale.value}</td>
                    <td>{sale.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}


        {activeTab === 'projects' && (
          <section>
            <h2>Projetos</h2>
            {projectsLoading && <p>Carregando projetos...</p>}
            {projectsError && <p>{projectsError}</p>}
            <div className="admin-user-actions">
              <button
                className="admin-btn"
                onClick={() => {
                  setProjectsError(null);
                  setNewProject({
                    name: '',
                    description: '',
                    projectType: 'Landingpage',
                    salePrice: '',
                    productionCost: '',
                    purchaseCount: 0,
                    repository: '',
                    domain: '',
                    hosting: 'Vercel',
                    status: 'Ativo',
                    paid: false,
                    isPublic: true,
                  });
                  setIsProjectModalOpen(true);
                }}
              >
                Criar projeto
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Venda</th>
                  <th>Produção</th>
                  <th>Compras</th>
                  <th>Repo</th>
                  <th>Domínio</th>
                  <th>Hospedagem</th>
                  <th>Status</th>
                  <th>Pago</th>
                  <th>Público</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!projectsLoading && projects.length === 0 && (
                  <tr>
                    <td colSpan={12}>Nenhum projeto encontrado.</td>
                  </tr>
                )}
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.id}</td>
                    <td>{project.name}</td>
                    <td>{project.projectType || '-'}</td>
                    <td>{project.salePrice || '-'}</td>
                    <td>{project.productionCost || '-'}</td>
                    <td>{project.purchaseCount ?? 0}</td>
                    <td>{project.repository || '-'}</td>
                    <td>{project.domain || '-'}</td>
                    <td>{project.hosting || '-'}</td>
                    <td>{project.status}</td>
                    <td>{project.paid ? 'Pago' : 'Não pago'}</td>
                    <td>{project.isPublic ? 'Sim' : 'Não'}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditProject(project)}>Editar</button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProject(project)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isProjectModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsProjectModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Novo projeto</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProjectModalOpen(false)}>Fechar</button>
                  </div>
                  {projectsError && <p className="admin-modal__error">{projectsError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <textarea
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select
                        value={newProject.projectType}
                        onChange={(e) => setNewProject({ ...newProject, projectType: e.target.value })}
                      >
                        <option value="Landingpage">Landingpage</option>
                        <option value="SaaS">SaaS</option>
                        <option value="App">App</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </label>
                    <label>
                      <span>Valor de venda</span>
                      <input
                        type="text"
                        placeholder="Valor de venda"
                        value={newProject.salePrice}
                        onChange={(e) => setNewProject({ ...newProject, salePrice: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Custo de produção</span>
                      <input
                        type="text"
                        placeholder="Custo de produção"
                        value={newProject.productionCost}
                        onChange={(e) => setNewProject({ ...newProject, productionCost: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Compras</span>
                      <input
                        type="number"
                        min={0}
                        value={newProject.purchaseCount}
                        onChange={(e) =>
                          setNewProject({ ...newProject, purchaseCount: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Repositório</span>
                      <input
                        type="text"
                        value={newProject.repository}
                        onChange={(e) => setNewProject({ ...newProject, repository: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Domínio</span>
                      <input
                        type="text"
                        value={newProject.domain}
                        onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Hospedagem</span>
                      <select
                        value={newProject.hosting}
                        onChange={(e) => setNewProject({ ...newProject, hosting: e.target.value })}
                      >
                        <option value="Vercel">Vercel</option>
                        <option value="Netlify">Netlify</option>
                        <option value="GitHub Pages">GitHub Pages</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Pausado">Pausado</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={newProject.paid}
                        onChange={(e) => setNewProject({ ...newProject, paid: e.target.checked })}
                      />
                      <span>Pago</span>
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={newProject.isPublic}
                        onChange={(e) => setNewProject({ ...newProject, isPublic: e.target.checked })}
                      />
                      <span>Público</span>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProjectModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleCreateProject}>Criar</button>
                  </div>
                </div>
              </div>
            )}

            {isProjectEditModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsProjectEditModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Editar projeto</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProjectEditModalOpen(false)}>Fechar</button>
                  </div>
                  {projectsError && <p className="admin-modal__error">{projectsError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        value={editProjectData.name}
                        onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <textarea
                        value={editProjectData.description}
                        onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select
                        value={editProjectData.projectType}
                        onChange={(e) => setEditProjectData({ ...editProjectData, projectType: e.target.value })}
                      >
                        <option value="Landingpage">Landingpage</option>
                        <option value="SaaS">SaaS</option>
                        <option value="App">App</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </label>
                    <label>
                      <span>Valor de venda</span>
                      <input
                        type="text"
                        value={editProjectData.salePrice}
                        onChange={(e) => setEditProjectData({ ...editProjectData, salePrice: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Custo de produção</span>
                      <input
                        type="text"
                        value={editProjectData.productionCost}
                        onChange={(e) => setEditProjectData({ ...editProjectData, productionCost: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Compras</span>
                      <input
                        type="number"
                        min={0}
                        value={editProjectData.purchaseCount}
                        onChange={(e) =>
                          setEditProjectData({ ...editProjectData, purchaseCount: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Repositório</span>
                      <input
                        type="text"
                        value={editProjectData.repository}
                        onChange={(e) => setEditProjectData({ ...editProjectData, repository: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Domínio</span>
                      <input
                        type="text"
                        value={editProjectData.domain}
                        onChange={(e) => setEditProjectData({ ...editProjectData, domain: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Hospedagem</span>
                      <select
                        value={editProjectData.hosting}
                        onChange={(e) => setEditProjectData({ ...editProjectData, hosting: e.target.value })}
                      >
                        <option value="Vercel">Vercel</option>
                        <option value="Netlify">Netlify</option>
                        <option value="GitHub Pages">GitHub Pages</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={editProjectData.status}
                        onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Pausado">Pausado</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={editProjectData.paid}
                        onChange={(e) => setEditProjectData({ ...editProjectData, paid: e.target.checked })}
                      />
                      <span>Pago</span>
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={editProjectData.isPublic}
                        onChange={(e) => setEditProjectData({ ...editProjectData, isPublic: e.target.checked })}
                      />
                      <span>Público</span>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProjectEditModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleSaveProjectEdit}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'products' && (
          <section>
            <h2>Produtos</h2>
            {productsLoading && <p>Carregando produtos...</p>}
            {productsError && <p>{productsError}</p>}
            <div className="admin-user-actions">
              <button
                className="admin-btn"
                onClick={() => {
                  setProductsError(null);
                  setNewProduct({ name: '', price: '', description: '', showOnHome: false, purchasePrice: '', salePrice: '' });
                  setIsProductModalOpen(true);
                }}
              >
                Criar produto
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Preço venda</th>
                  <th>Preço compra</th>
                  <th>Descrição</th>
                  <th>Home</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!productsLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={7}>Nenhum produto encontrado.</td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.salePrice || product.price}</td>
                    <td>{product.purchasePrice || '-'}</td>
                    <td>{product.description}</td>
                    <td>{product.showOnHome ? 'Sim' : 'Não'}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditProduct(product)}>Editar</button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProduct(product)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isProductModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Novo produto</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProductModalOpen(false)}>Fechar</button>
                  </div>
                  {productsError && <p className="admin-modal__error">{productsError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        placeholder="Nome do produto"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Preço venda</span>
                      <input
                        type="text"
                        placeholder="Preço de venda"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Preço compra</span>
                      <input
                        type="text"
                        placeholder="Preço de compra"
                        value={newProduct.purchasePrice}
                        onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <textarea
                        placeholder="Descrição"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      />
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={newProduct.showOnHome}
                        onChange={(e) => setNewProduct({ ...newProduct, showOnHome: e.target.checked })}
                      />
                      <span>Exibir na Home</span>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsProductModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleCreateProduct}>Criar</button>
                  </div>
                </div>
              </div>
            )}
            {isEditProductModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsEditProductModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Editar produto</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditProductModalOpen(false)}>Fechar</button>
                  </div>
                  {productsError && <p className="admin-modal__error">{productsError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        value={editProductData.name}
                        onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Preço venda</span>
                      <input
                        type="text"
                        value={editProductData.salePrice}
                        onChange={(e) => setEditProductData({ ...editProductData, salePrice: e.target.value, price: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Preço compra</span>
                      <input
                        type="text"
                        value={editProductData.purchasePrice}
                        onChange={(e) => setEditProductData({ ...editProductData, purchasePrice: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <textarea
                        value={editProductData.description}
                        onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                      />
                    </label>
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={editProductData.showOnHome}
                        onChange={(e) => setEditProductData({ ...editProductData, showOnHome: e.target.checked })}
                      />
                      <span>Exibir na Home</span>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditProductModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleSaveProductEdit}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'costs' && (
          <section>
            <h2>Custos</h2>
            {costsLoading && <p>Carregando custos...</p>}
            {costsError && <p>{costsError}</p>}
            <div className="report-summary">
              <div className="report-card">
                <span>Custos mensais</span>
                <strong>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Custos anuais</span>
                <strong>R$ {totalCostsAnnual.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="report-card">
                <span>Total de itens</span>
                <strong>{costs.length}</strong>
              </div>
            </div>
            <div className="admin-user-actions">
              <input
                type="text"
                placeholder="Nome do custo"
                value={newCost.name}
                onChange={(e) => setNewCost((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Valor (opcional)"
                value={newCost.costValue}
                onChange={(e) => setNewCost((prev) => ({ ...prev, costValue: e.target.value }))}
              />
              <select
                value={newCost.billingCycle}
                onChange={(e) => setNewCost((prev) => ({ ...prev, billingCycle: e.target.value as 'monthly' | 'annual' }))}
              >
                <option value="monthly">Mensal</option>
                <option value="annual">Anual</option>
              </select>
              <button className="admin-btn" onClick={handleCreateCost}>Adicionar custo</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Valor</th>
                  <th>Ciclo</th>
                  <th>Mensal eq.</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!costsLoading && costs.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nenhum custo encontrado.</td>
                  </tr>
                )}
                {costs.map((cost) => (
                  <tr key={cost.id}>
                    <td>{cost.id}</td>
                    <td>{cost.name}</td>
                    <td>{cost.costValue || '-'}</td>
                    <td>{cost.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</td>
                    <td>R$ {getMonthlyCost(cost).toFixed(2).replace('.', ',')}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditCost(cost)}>Editar</button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteCost(cost)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditCostModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsEditCostModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Editar custo</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditCostModalOpen(false)}>Fechar</button>
                  </div>
                  {costsError && <p className="admin-modal__error">{costsError}</p>}
                  <div className="admin-modal__form">
                    <label>
                      <span>Nome</span>
                      <input
                        type="text"
                        value={editCostData.name}
                        onChange={(e) => setEditCostData({ ...editCostData, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Valor</span>
                      <input
                        type="text"
                        value={editCostData.costValue}
                        onChange={(e) => setEditCostData({ ...editCostData, costValue: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Ciclo</span>
                      <select
                        value={editCostData.billingCycle}
                        onChange={(e) => setEditCostData({ ...editCostData, billingCycle: e.target.value as 'monthly' | 'annual' })}
                      >
                        <option value="monthly">Mensal</option>
                        <option value="annual">Anual</option>
                      </select>
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditCostModalOpen(false)}>Cancelar</button>
                    <button className="admin-btn" onClick={handleSaveCostEdit}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Admin;
