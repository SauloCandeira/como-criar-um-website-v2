import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Admin.css';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/init-firebase';
import { deleteUser, fetchUserByEmail, fetchUsers, updateUser, upsertUser, UserDTO } from '../../services/usersApi';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import MyBotsList from '../../components/Admin/MyBotsList';
import { MyBotsLeaderboard } from '../../components/MyBotsLeaderboard';
import { DaoAdminPanel } from '../../components/DaoAdminPanel';
import { MyBotsEcosystemMap } from '../../components/Admin/MyBotsEcosystemMap';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../../services/productsApi';
import { createProject, deleteProject, fetchProjects, updateProject } from '../../services/projectsApi';
import { createCost, deleteCost, fetchCosts, updateCost } from '../../services/costsApi';
import { fetchSales, SaleDTO } from '../../services/salesApi';
import { fetchAccesses, AccessDTO } from '../../services/accessesApi';
import { listReportsByProject } from '../../services/aiReportApi';
import type { AiReport } from '../../services/aiReportTypes';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { resetAllPurchases, resetClonedProjects, resetFreeRedeems, resetFull, resetPaidSales } from '../../services/adminToolsApi';
import { fetchAdminMyBotBattles, AdminMyBotBattleDTO } from '../../services/adminMybotApi';

// Registrar os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Sale = SaleDTO;

interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
  productType?: string;
  showOnHome?: boolean;
  showOnMarketplace?: boolean;
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
  ownerUserId?: string;
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
  const location = useLocation();
  const currentEmail = (localStorage.getItem('email') || '').toLowerCase();
  const effectiveAdminId = (currentEmail || auth.currentUser?.email || '').toLowerCase();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const profile = await fetchUserByEmail(currentEmail || user.email || '');
        const dbLevel = (profile?.permissionLevel || 'A') as 'A' | 'B' | 'C';
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
  const [mybotsSubTab, setMybotsSubTab] = useState<'overview' | 'battles' | 'ecosystem'>('overview');
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
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
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', productType: 'digital', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState({ id: '', name: '', price: '', description: '', productType: 'digital', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [paidSales, setPaidSales] = useState<PurchaseDTO[]>([]);
  const [paidSalesLoading, setPaidSalesLoading] = useState(false);
  const [paidSalesError, setPaidSalesError] = useState<string | null>(null);
  const [redeems, setRedeems] = useState<PurchaseDTO[]>([]);
  const [redeemsLoading, setRedeemsLoading] = useState(false);
  const [redeemsError, setRedeemsError] = useState<string | null>(null);
  const [accesses, setAccesses] = useState<AccessItem[]>([]);
  const [accessesLoading, setAccessesLoading] = useState(false);
  const [accessesError, setAccessesError] = useState<string | null>(null);
  const [aiReports, setAiReports] = useState<AiReport[]>([]);
  const [aiReportsLoading, setAiReportsLoading] = useState(false);
  const [aiReportsError, setAiReportsError] = useState<string | null>(null);
  const [adminToolsConfirm, setAdminToolsConfirm] = useState('');
  const [adminToolsLoading, setAdminToolsLoading] = useState<string | null>(null);
  const [adminToolsError, setAdminToolsError] = useState<string | null>(null);
  const [adminToolsSuccess, setAdminToolsSuccess] = useState<string | null>(null);
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
  const aiReportsProjectId = new URLSearchParams(location.search).get('projectId') || 'HKTECH';
  const isAdmin = (localStorage.getItem('permissionLevel') || 'A') === 'B';
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [costsError, setCostsError] = useState<string | null>(null);
  const [newCost, setNewCost] = useState({ name: '', costValue: '', billingCycle: 'monthly' as 'monthly' | 'annual' });
  const [isEditCostModalOpen, setIsEditCostModalOpen] = useState(false);
  const [editCostData, setEditCostData] = useState({ id: '', name: '', costValue: '', billingCycle: 'monthly' as 'monthly' | 'annual' });
  const [selectedPeriod, setSelectedPeriod] = useState('day'); // day, month, year
  const [mybotBattles, setMybotBattles] = useState<AdminMyBotBattleDTO[]>([]);
  const [mybotBattlesLoading, setMybotBattlesLoading] = useState(false);
  const [mybotBattlesError, setMybotBattlesError] = useState<string | null>(null);
  const [selectedMyBotBattle, setSelectedMyBotBattle] = useState<AdminMyBotBattleDTO | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  type MenuItemConfig = {
    id: string;
    label: string;
    children?: Array<{ id: string; label: string }>;
    adminOnly?: boolean;
  };

  const menuItems: MenuItemConfig[] = [
    { id: 'reports', label: 'Relatórios' },
    { id: 'accounting', label: 'Contabilidade' },
    { id: 'users', label: 'Usuários' },
    { id: 'sales', label: 'Vendas' },
    { id: 'redeems', label: 'Resgates' },
    { id: 'projects', label: 'Projetos' },
    { id: 'products', label: 'Produtos' },
    { id: 'costs', label: 'Custos' },
    { id: 'ai-reports', label: 'AI Reports' },
    {
      id: 'mybots',
      label: 'MyBots',
      children: [
        { id: 'overview', label: 'Visão geral' },
        { id: 'battles', label: 'Batalhas' },
        { id: 'ecosystem', label: 'Ecossistema' },
      ],
    },
    { id: 'dao', label: 'DAO' },
    { id: 'admin-tools', label: 'Admin Tools', adminOnly: true },
  ];

  const handleSelectMenu = (menuId: string, childId?: string) => {
    if (menuId === 'mybots' && childId) {
      setActiveTab('mybots');
      setMybotsSubTab(childId as 'overview' | 'battles' | 'ecosystem');
      if (window.innerWidth < 768) {
        setExpandedMenuId(null);
      }
      return;
    }
    setActiveTab(menuId);
    if (window.innerWidth < 768) {
      setExpandedMenuId(null);
    }
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenuId((prev) => (prev === menuId ? null : menuId));
  };


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

  const loadMyBotBattles = async () => {
    setMybotBattlesLoading(true);
    setMybotBattlesError(null);
    try {
      const data = await fetchAdminMyBotBattles(effectiveAdminId, 200);
      setMybotBattles(data);
    } catch (error) {
      console.error('Erro ao carregar batalhas MyBot:', error);
      setMybotBattlesError('Não foi possível carregar as batalhas do MyBot.');
    } finally {
      setMybotBattlesLoading(false);
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

  const loadAiReports = async () => {
    setAiReportsLoading(true);
    setAiReportsError(null);
    try {
      const data = await listReportsByProject(aiReportsProjectId);
      setAiReports(data);
    } catch (error) {
      console.error('Erro ao buscar AI reports:', error);
      setAiReportsError('Não foi possível carregar os relatórios de IA.');
    } finally {
      setAiReportsLoading(false);
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

  const loadPaidSales = async () => {
    setPaidSalesLoading(true);
    setPaidSalesError(null);
    try {
      const data = await fetchPurchases(undefined, 'paid');
      setPaidSales(data);
    } catch (error) {
      console.error('Erro ao buscar vendas pagas:', error);
      setPaidSalesError(error instanceof Error ? error.message : 'Não foi possível carregar as vendas pagas.');
    } finally {
      setPaidSalesLoading(false);
    }
  };

  const loadRedeems = async () => {
    setRedeemsLoading(true);
    setRedeemsError(null);
    try {
      const data = await fetchPurchases(undefined, 'free');
      setRedeems(data);
    } catch (error) {
      console.error('Erro ao buscar resgates:', error);
      setRedeemsError(error instanceof Error ? error.message : 'Não foi possível carregar os resgates.');
    } finally {
      setRedeemsLoading(false);
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

  const runAdminTool = async (action: string, handler: (adminId: string) => Promise<unknown>) => {
    if (!currentEmail) {
      setAdminToolsError('Admin não identificado.');
      return;
    }
    if (adminToolsConfirm.trim().toUpperCase() !== 'RESET') {
      setAdminToolsError('Digite RESET para confirmar.');
      return;
    }
    const confirmed = window.confirm('Esta ação é irreversível. Deseja continuar?');
    if (!confirmed) return;
    setAdminToolsLoading(action);
    setAdminToolsError(null);
    setAdminToolsSuccess(null);
    try {
      await handler(currentEmail);
      setAdminToolsSuccess('Ação executada com sucesso.');
      setAdminToolsConfirm('');
      loadPaidSales();
      loadRedeems();
      loadProjects();
    } catch (error) {
      console.error('Erro ao executar ação admin:', error);
      setAdminToolsError(error instanceof Error ? error.message : 'Falha ao executar ação.');
    } finally {
      setAdminToolsLoading(null);
    }
  };

  useEffect(() => {
    loadUsers();
    loadProducts();
    loadProjects();
    loadCosts();
    loadSales();
    loadPaidSales();
    loadRedeems();
    loadAccesses();
    loadAiReports();
  }, [aiReportsProjectId]);

  useEffect(() => {
    if (activeTab === 'mybots' && mybotsSubTab === 'battles') {
      loadMyBotBattles();
    }
  }, [activeTab, mybotsSubTab]);

  useEffect(() => {
    const stored = localStorage.getItem('adminSidebarExpanded');
    if (stored) {
      setExpandedMenuId(stored);
    }
  }, []);

  useEffect(() => {
    if (expandedMenuId) {
      localStorage.setItem('adminSidebarExpanded', expandedMenuId);
    } else {
      localStorage.removeItem('adminSidebarExpanded');
    }
  }, [expandedMenuId]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (window.innerWidth >= 768) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setExpandedMenuId(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
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
        productType: newProduct.productType,
        showOnHome: newProduct.showOnHome,
        showOnMarketplace: newProduct.showOnMarketplace,
        purchasePrice: newProduct.purchasePrice.trim(),
        salePrice: newProduct.salePrice.trim() || newProduct.price.trim()
      });
      setNewProduct({ name: '', price: '', description: '', productType: 'digital', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
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
      productType: product.productType ?? 'digital',
      showOnHome: product.showOnHome ?? false,
      showOnMarketplace: product.showOnMarketplace ?? false,
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
        productType: editProductData.productType,
        showOnHome: editProductData.showOnHome,
        showOnMarketplace: editProductData.showOnMarketplace,
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

  const handleToggleProductHome = async (product: ProductItem, nextValue: boolean) => {
    setProductsError(null);
    try {
      await updateProduct(product.id, {
        name: product.name,
        price: product.price,
        description: product.description,
        productType: product.productType ?? 'digital',
        showOnHome: nextValue,
        showOnMarketplace: product.showOnMarketplace ?? false,
        purchasePrice: product.purchasePrice ?? '',
        salePrice: product.salePrice ?? product.price,
      });
      loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar exibição na Home:', error);
      setProductsError('Não foi possível atualizar a exibição na Home.');
    }
  };

  const handleToggleProductMarketplace = async (product: ProductItem, nextValue: boolean) => {
    setProductsError(null);
    try {
      await updateProduct(product.id, {
        name: product.name,
        price: product.price,
        description: product.description,
        productType: product.productType ?? 'digital',
        showOnHome: product.showOnHome ?? false,
        showOnMarketplace: nextValue,
        purchasePrice: product.purchasePrice ?? '',
        salePrice: product.salePrice ?? product.price,
      });
      loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar exibição no Marketplace:', error);
      setProductsError('Não foi possível atualizar a exibição no Marketplace.');
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
        <aside className="admin-sidebar" ref={sidebarRef}>
          <h2>Admin</h2>
          <ul>
            {menuItems.flatMap((item) => {
              if (item.adminOnly && !isAdmin) return [];
              const isParent = !!item.children?.length;
              const isExpanded = expandedMenuId === item.id;
              const isActive = activeTab === item.id;
              const entries: JSX.Element[] = [
                <li key={item.id} className={isActive ? 'active' : ''}>
                  {isParent ? (
                    <button
                      type="button"
                      className={`admin-menu-item ${isExpanded ? 'open' : ''}`}
                      onClick={() => toggleMenu(item.id)}
                      aria-expanded={isExpanded}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`admin-menu-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectMenu(item.id)}
                    >
                      {item.label}
                    </button>
                  )}
                </li>,
              ];

              if (isParent && isExpanded) {
                item.children?.forEach((child) => {
                  entries.push(
                    <li key={`${item.id}-${child.id}`} className="admin-menu-child">
                      <button
                        type="button"
                        className={`admin-submenu-item ${mybotsSubTab === child.id && isActive ? 'active' : ''}`}
                        onClick={() => handleSelectMenu(item.id, child.id)}
                      >
                        {child.label}
                      </button>
                    </li>
                  );
                });
              }

              return entries;
            })}
          </ul>
          {/* Botão removido: o projeto master HKTECH estará apenas na lista de projetos */}
        </aside>

        <main className="admin-content">
        {activeTab === 'mybots' && (
          <section>
            {mybotsSubTab === 'overview' && (
              <>
                <h2>MyBots - Placar dos Bots</h2>
                <MyBotsLeaderboard />
                <MyBotsList />
              </>
            )}
            {mybotsSubTab === 'battles' && (
              <>
                <h2>MyBots - Batalhas (Auditoria)</h2>
                {mybotBattlesLoading && <p>Carregando batalhas...</p>}
                {mybotBattlesError && <p>{mybotBattlesError}</p>}
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Mapa</th>
                        <th>Tipo</th>
                        <th>Aposta</th>
                        <th>Gás</th>
                        <th>Prêmio</th>
                        <th>Vencedor</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!mybotBattlesLoading && mybotBattles.length === 0 && (
                        <tr>
                          <td colSpan={8}>Nenhuma batalha registrada.</td>
                        </tr>
                      )}
                      {mybotBattles.map((battle) => (
                        <tr key={battle.id}>
                          <td>{battle.createdAt ? new Date(battle.createdAt).toLocaleString('pt-BR') : '—'}</td>
                          <td>{battle.mapName}</td>
                          <td>{battle.battleType}</td>
                          <td>{battle.betAmount.toFixed(2).replace('.', ',')}</td>
                          <td>{battle.gasAmount.toFixed(2).replace('.', ',')}</td>
                          <td>{battle.payoutAmount.toFixed(2).replace('.', ',')}</td>
                          <td>{battle.winnerUserId}</td>
                          <td>
                            <button
                              className="admin-btn admin-btn--ghost"
                              onClick={() => setSelectedMyBotBattle(battle)}
                            >
                              Ver detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedMyBotBattle && (
                  <div className="admin-modal-backdrop" onClick={() => setSelectedMyBotBattle(null)}>
                    <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                      <div className="admin-modal__header">
                        <h3>Detalhes da batalha</h3>
                        <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedMyBotBattle(null)}>
                          Fechar
                        </button>
                      </div>
                      <div className="admin-modal__form">
                        <div className="admin-modal__grid">
                          <div>
                            <span>ID</span>
                            <strong>{selectedMyBotBattle.id}</strong>
                          </div>
                          <div>
                            <span>Data</span>
                            <strong>{selectedMyBotBattle.createdAt ? new Date(selectedMyBotBattle.createdAt).toLocaleString('pt-BR') : '—'}</strong>
                          </div>
                          <div>
                            <span>Usuário A</span>
                            <strong>{selectedMyBotBattle.userIdA}</strong>
                          </div>
                          <div>
                            <span>Usuário B</span>
                            <strong>{selectedMyBotBattle.userIdB}</strong>
                          </div>
                          <div>
                            <span>Mapa</span>
                            <strong>{selectedMyBotBattle.mapName}</strong>
                          </div>
                          <div>
                            <span>Tipo</span>
                            <strong>{selectedMyBotBattle.battleType}</strong>
                          </div>
                          <div>
                            <span>Aposta</span>
                            <strong>{selectedMyBotBattle.betAmount.toFixed(2).replace('.', ',')}</strong>
                          </div>
                          <div>
                            <span>Gás</span>
                            <strong>{selectedMyBotBattle.gasAmount.toFixed(2).replace('.', ',')} ({(selectedMyBotBattle.gasPct * 100).toFixed(0)}%)</strong>
                          </div>
                          <div>
                            <span>Prêmio</span>
                            <strong>{selectedMyBotBattle.payoutAmount.toFixed(2).replace('.', ',')}</strong>
                          </div>
                          <div>
                            <span>Vencedor</span>
                            <strong>{selectedMyBotBattle.winnerUserId}</strong>
                          </div>
                          <div>
                            <span>Poder base (A/B)</span>
                            <strong>{selectedMyBotBattle.powerA.toFixed(2)} / {selectedMyBotBattle.powerB.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>Fator aleatório (A/B)</span>
                            <strong>{selectedMyBotBattle.randomFactorA.toFixed(3)} / {selectedMyBotBattle.randomFactorB.toFixed(3)}</strong>
                          </div>
                          <div>
                            <span>Poder final (A/B)</span>
                            <strong>{selectedMyBotBattle.powerFinalA.toFixed(2)} / {selectedMyBotBattle.powerFinalB.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>XP (A/B)</span>
                            <strong>{selectedMyBotBattle.xpA} / {selectedMyBotBattle.xpB}</strong>
                          </div>
                          <div>
                            <span>Seed</span>
                            <strong>{selectedMyBotBattle.seed}</strong>
                          </div>
                          <div>
                            <span>Modificadores</span>
                            <strong>{Array.isArray(selectedMyBotBattle.modifiers) && selectedMyBotBattle.modifiers.length ? JSON.stringify(selectedMyBotBattle.modifiers) : '—'}</strong>
                          </div>
                          <div>
                            <span>Motivo</span>
                            <strong>{selectedMyBotBattle.reason || '—'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {mybotsSubTab === 'ecosystem' && (
              <MyBotsEcosystemMap mode="admin" viewerId={effectiveAdminId} />
            )}
          </section>
        )}
        {activeTab === 'dao' && (
          <section>
            <h2>DAO - Governança</h2>
            <DaoAdminPanel adminId={currentEmail} />
          </section>
        )}
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
            <table className="admin-table admin-table--users">
              <thead>
                <tr>
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
                    <td colSpan={6}>Nenhum usuário encontrado.</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.authProvider}</td>
                    <td>{permissionLabels[user.permissionLevel || 'A']}</td>
                    <td>{user.status}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => setSelectedUser(user)} aria-label="Visualizar">
                        <span className="admin-action-icon">👁️</span>
                        <span className="admin-action-text">Visualizar</span>
                      </button>
                      <button className="admin-btn" onClick={() => handleEditUser(user)} aria-label="Editar">
                        <span className="admin-action-icon">✏️</span>
                        <span className="admin-action-text">Editar</span>
                      </button>
                      <button className="admin-btn" onClick={() => handleDeactivateUser(user)} aria-label="Desativar">
                        <span className="admin-action-icon">⏸️</span>
                        <span className="admin-action-text">Desativar</span>
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteUser(user)} aria-label="Excluir">
                        <span className="admin-action-icon">🗑️</span>
                        <span className="admin-action-text">Excluir</span>
                      </button>
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
            <h2>Vendas (Pagas)</h2>
            {paidSalesLoading && <p>Carregando vendas...</p>}
            {paidSalesError && <p>{paidSalesError}</p>}
            <table className="admin-table admin-table--sales">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Projeto</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {!paidSalesLoading && paidSales.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nenhuma venda encontrada.</td>
                  </tr>
                )}
                {paidSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.userId}</td>
                    <td>{sale.productName || 'Produto'}</td>
                    <td>R$ {Number(sale.price || 0).toFixed(2).replace('.', ',')}</td>
                    <td>{sale.status}</td>
                    <td>
                      {sale.projectId ? (
                        <button
                          className="admin-btn admin-btn--ghost"
                          onClick={() => navigate(`/manager?projectId=${encodeURIComponent(sale.projectId || '')}`)}
                        >
                          Ver projeto
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'redeems' && (
          <section>
            <h2>Resgates (Gratuitos)</h2>
            {redeemsLoading && <p>Carregando resgates...</p>}
            {redeemsError && <p>{redeemsError}</p>}
            <table className="admin-table admin-table--sales">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Projeto</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {!redeemsLoading && redeems.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum resgate encontrado.</td>
                  </tr>
                )}
                {redeems.map((redeem) => (
                  <tr key={redeem.id}>
                    <td>{redeem.userId}</td>
                    <td>{redeem.productName || 'Produto'}</td>
                    <td>FREE</td>
                    <td>
                      {redeem.projectId ? (
                        <button
                          className="admin-btn admin-btn--ghost"
                          onClick={() => navigate(`/manager?projectId=${encodeURIComponent(redeem.projectId || '')}`)}
                        >
                          Ver projeto
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{redeem.createdAt ? new Date(redeem.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'admin-tools' && isAdmin && (
          <section>
            <h2>Admin Tools</h2>
            <p><strong>Atenção:</strong> use apenas em ambiente de teste. Essas ações são irreversíveis.</p>
            <div className="admin-modal__form">
              <label>
                <span>Digite RESET para confirmar</span>
                <input
                  type="text"
                  value={adminToolsConfirm}
                  onChange={(e) => setAdminToolsConfirm(e.target.value)}
                />
              </label>
            </div>
            {adminToolsError && <p className="admin-modal__error">{adminToolsError}</p>}
            {adminToolsSuccess && <p className="admin-modal__success">{adminToolsSuccess}</p>}
            <div className="admin-user-actions" style={{ flexWrap: 'wrap', gap: 12 }}>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-purchases', resetAllPurchases)}
              >
                Resetar todas as compras
              </button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-sales', resetPaidSales)}
              >
                Resetar vendas pagas
              </button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-redeems', resetFreeRedeems)}
              >
                Resetar resgates gratuitos
              </button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-projects', resetClonedProjects)}
              >
                Resetar projetos clonados
              </button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-full', resetFull)}
              >
                Full Reset (teste)
              </button>
            </div>
            {adminToolsLoading && <p>Executando ação...</p>}
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

            <table className="admin-table admin-table--projects">
              <thead>
                <tr>
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
                  <th>Criador</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!projectsLoading && projects.length === 0 && (
                  <tr>
                    <td colSpan={13}>Nenhum projeto encontrado.</td>
                  </tr>
                )}
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><strong>{project.name}</strong></td>
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
                    <td>{project.ownerUserId || '—'}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditProject(project)} aria-label="Editar">
                        <span className="admin-action-icon">✏️</span>
                        <span className="admin-action-text">Editar</span>
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProject(project)} aria-label="Excluir">
                        <span className="admin-action-icon">🗑️</span>
                        <span className="admin-action-text">Excluir</span>
                      </button>
                      <button
                        className="admin-btn admin-btn--primary"
                        style={{ marginLeft: 8, background: '#38bdf8', color: '#fff', borderRadius: 8, fontWeight: 600 }}
                        onClick={() => navigate(`/manager?projectId=${encodeURIComponent(project.id)}`)}
                        aria-label={`Administrar ${project.name}`}
                      >
                        <span className="admin-action-icon">🛠️</span>
                        <span className="admin-action-text">Administrar</span>
                      </button>
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

        {activeTab === 'ai-reports' && (
          <section>
            <h2>AI Reports</h2>
            {aiReportsLoading && <p>Carregando relatórios...</p>}
            {aiReportsError && <p>{aiReportsError}</p>}
            {!aiReportsLoading && aiReports.length === 0 && (
              <p>Nenhum relatório encontrado.</p>
            )}
            {aiReports.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Agente</th>
                    <th>Resumo</th>
                    <th>Kanban</th>
                  </tr>
                </thead>
                <tbody>
                  {aiReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.createdAt ? new Date(report.createdAt).toLocaleString('pt-BR') : '-'}</td>
                      <td>{report.agent}</td>
                      <td>{report.summary}</td>
                      <td>{report.kanbanItemId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  setNewProduct({ name: '', price: '', description: '', productType: 'digital', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
                  setIsProductModalOpen(true);
                }}
              >
                Criar produto
              </button>
            </div>

            <table className="admin-table admin-table--products">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Preço venda</th>
                  <th>Preço compra</th>
                  <th>Descrição</th>
                  <th>Home</th>
                  <th>Marketplace</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!productsLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={8}>Nenhum produto encontrado.</td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.productType || 'digital'}</td>
                    <td>{product.salePrice || product.price}</td>
                    <td>{product.purchasePrice || '-'}</td>
                    <td>{product.description}</td>
                    <td>
                      <label className="admin-home-toggle">
                        <input
                          type="checkbox"
                          checked={!!product.showOnHome}
                          onChange={(e) => handleToggleProductHome(product, e.target.checked)}
                        />
                        <span>{product.showOnHome ? 'Sim' : 'Não'}</span>
                      </label>
                    </td>
                    <td>
                      <label className="admin-home-toggle">
                        <input
                          type="checkbox"
                          checked={!!product.showOnMarketplace}
                          onChange={(e) => handleToggleProductMarketplace(product, e.target.checked)}
                        />
                        <span>{product.showOnMarketplace ? 'Sim' : 'Não'}</span>
                      </label>
                    </td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditProduct(product)} aria-label="Editar">
                        <span className="admin-action-icon">✏️</span>
                        <span className="admin-action-text">Editar</span>
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProduct(product)} aria-label="Excluir">
                        <span className="admin-action-icon">🗑️</span>
                        <span className="admin-action-text">Excluir</span>
                      </button>
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
                      <span>Tipo</span>
                      <select
                        value={newProduct.productType}
                        onChange={(e) => setNewProduct({ ...newProduct, productType: e.target.value })}
                      >
                        <option value="servico">Serviço</option>
                        <option value="digital">Produto digital</option>
                        <option value="fisico">Produto físico</option>
                        <option value="assinatura">Assinatura</option>
                        <option value="projeto">Projeto</option>
                      </select>
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
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={newProduct.showOnMarketplace}
                        onChange={(e) => setNewProduct({ ...newProduct, showOnMarketplace: e.target.checked })}
                      />
                      <span>Exibir no Marketplace</span>
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
                      <span>Tipo</span>
                      <select
                        value={editProductData.productType}
                        onChange={(e) => setEditProductData({ ...editProductData, productType: e.target.value })}
                      >
                        <option value="servico">Serviço</option>
                        <option value="digital">Produto digital</option>
                        <option value="fisico">Produto físico</option>
                        <option value="assinatura">Assinatura</option>
                        <option value="projeto">Projeto</option>
                      </select>
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
                    <label className="admin-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={editProductData.showOnMarketplace}
                        onChange={(e) => setEditProductData({ ...editProductData, showOnMarketplace: e.target.checked })}
                      />
                      <span>Exibir no Marketplace</span>
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

            <table className="admin-table admin-table--costs">
              <thead>
                <tr>
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
                    <td colSpan={5}>Nenhum custo encontrado.</td>
                  </tr>
                )}
                {costs.map((cost) => (
                  <tr key={cost.id}>
                    <td>{cost.name}</td>
                    <td>{cost.costValue || '-'}</td>
                    <td>{cost.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</td>
                    <td>R$ {getMonthlyCost(cost).toFixed(2).replace('.', ',')}</td>
                    <td className="admin-actions">
                      <button className="admin-btn" onClick={() => handleEditCost(cost)} aria-label="Editar">
                        <span className="admin-action-icon">✏️</span>
                        <span className="admin-action-text">Editar</span>
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteCost(cost)} aria-label="Excluir">
                        <span className="admin-action-icon">🗑️</span>
                        <span className="admin-action-text">Excluir</span>
                      </button>
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
