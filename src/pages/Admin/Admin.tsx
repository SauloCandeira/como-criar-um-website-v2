import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Admin.css';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/init-firebase';
import { deleteUser, fetchUserByEmail, fetchUsers, updateUser, upsertUser, UserDTO } from '../../services/usersApi';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { BreadcrumbleItem } from '../../components/Breadcrumble/Breadcrumble';
import MyBotsList from '../../components/Admin/MyBotsList';
import { MyBotsLeaderboard } from '../../components/MyBotsLeaderboard';
import { DaoAdminPanel } from '../../components/DaoAdminPanel';
import { MyBotsEcosystemMap } from '../../components/Admin/MyBotsEcosystemMap';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../../services/productsApi';
import { cloneTemplate, createProject, deleteProject, fetchProjects, updateProject } from '../../services/projectsApi';
import { fetchTemplateById, updateTemplate } from '../../services/templatesApi';
import { createCost, deleteCost, fetchCosts, updateCost } from '../../services/costsApi';
import { fetchSales, SaleDTO } from '../../services/salesApi';
import { fetchAccesses, AccessDTO } from '../../services/accessesApi';
import { listIaReports } from '../../services/iaReportsApi';
import type { AiReport } from '../../services/aiReportTypes';
import { createIaTask, listAiTasks } from '../../services/aiTasksApi.ts';
import type { AiTask } from '../../services/aiTaskTypes';
import { createIaConversation, listIaConversations, listIaMessages, sendIaMessage } from '../../services/iaChatApi.ts';
import type { IaConversation, IaMessage } from '../../services/iaChatTypes.ts';
import { createIaAgent, executeIaAgent, listIaAgents, updateIaAgent } from '../../services/iaAgentsApi.ts';
import type { IaAgent, IaAgentExecutionResult } from '../../services/iaAgentsTypes.ts';
import { createIaContext, deleteIaContext, listIaContexts, updateIaContext } from '../../services/iaContextsApi.ts';
import type { IaContext } from '../../services/iaContextsTypes.ts';
import { createIaMemory, fetchIaMemoryStats, searchIaMemory } from '../../services/iaMemoryApi.ts';
import type { IaMemoryItem, IaMemoryStats } from '../../services/iaMemoryTypes.ts';
import { activateIaPromptVersion, fetchIaPrompt, listIaPromptVersions, listIaPrompts, reembedIaPrompt, updateIaPrompt } from '../../services/iaPromptsApi.ts';
import type { IaPromptItem, IaPromptVersion } from '../../services/iaPromptsTypes.ts';
import { activateIaOrchestrator, createIaOrchestrator, fetchActiveIaOrchestrator, fetchIaOrchestratorContent, fetchIaOrchestratorSummary, listIaOrchestratorExecutions, listIaOrchestrators, updateIaOrchestrator } from '../../services/iaOrchestratorsApi';
import type { IaOrchestrator, IaOrchestratorContent, IaOrchestratorExecution, IaOrchestratorSummary } from '../../services/iaOrchestratorsTypes';
import { fetchIaConfig, updateIaConfig, IaConfig } from '../../services/iaConfigApi';
import { fetchSonarIssues, fetchSonarSummary, SonarIssueDTO, SonarSummaryDTO } from '../../services/sonarCloudApi';
import { fetchCiStatus, type CiStatusDTO } from '../../services/ciStatusApi';
import { fetchHealthStatus, type HealthStatusDTO } from '../../services/healthApi.ts';
import { resolveHKTechIssues, runHKTechAutofix, simulateHKTechFix, HKTechAiResult } from '../../services/hktechAiApi';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { migrateIaTasks, resetAllPurchases, resetClonedProjects, resetFreeRedeems, resetFull, resetIaTasks, resetPaidSales } from '../../services/adminToolsApi';
import { fetchAdminMyBotBattles, AdminMyBotBattleDTO } from '../../services/adminMybotApi';
import AdminSidebarMenu, { MenuGroupConfig, MenuItemConfig } from '../../components/Admin/AdminSidebarMenu';
import TemplateEditor from '../../components/Admin/TemplateEditor';
import { FinanceiroCustos, FinanceiroResgates, FinanceiroVendas } from './Financeiro';

// Registrar os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Sale = SaleDTO;

interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
  productType?: string;
  templateId?: string;
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
  isTemplate?: boolean;
  templateId?: string;
  templateVersion?: number;
  baseProjectId?: string;
  createdFromPurchase?: boolean;
  version?: number;
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
  const swaggerUrl = '/api-docs';
  const storybookUrl = import.meta.env.VITE_STORYBOOK_URL || '/storybook';
  const architectureUrl = import.meta.env.VITE_ARCHITECTURE_DOC_URL || '/docs/hktech.architecture.action-plan.md';
  const templatePathMatch = location.pathname.match(/^\/admin\/projetos\/templates\/(.+)$/);
  const templateEditorId = templatePathMatch ? templatePathMatch[1] : null;
  const isTemplateCreateRoute = templateEditorId === 'novo';
  const isTemplateEditorRoute = !!templateEditorId && templateEditorId !== 'novo';
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

  useEffect(() => {
    if (!isTemplateEditorRoute || !templateEditorId) {
      setTemplateBreadcrumbLabel('');
      return;
    }
    let isMounted = true;
    const loadTemplateLabel = async () => {
      try {
        const template = await fetchTemplateById(templateEditorId);
        if (isMounted) setTemplateBreadcrumbLabel(template.name ?? '');
      } catch (error) {
        if (isMounted) setTemplateBreadcrumbLabel('');
      }
    };
    loadTemplateLabel();
    return () => {
      isMounted = false;
    };
  }, [isTemplateEditorRoute, templateEditorId]);

  const [activeTab, setActiveTab] = useState('users');
  const [mybotsSubTab, setMybotsSubTab] = useState<'overview' | 'battles' | 'ecosystem'>('overview');
  const [daoSubTab, setDaoSubTab] = useState<'propostas' | 'votacoes' | 'tesouraria' | 'membros'>('propostas');
  const [financeSubTab, setFinanceSubTab] = useState<'vendas' | 'resgates' | 'custos'>('vendas');
  const [projectsSubTab, setProjectsSubTab] = useState<'templates' | 'clonados'>('templates');
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([
    
  ]);
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
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', productType: 'digital', templateId: '', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState({ id: '', name: '', price: '', description: '', productType: 'digital', templateId: '', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
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
  const [aiTasks, setAiTasks] = useState<AiTask[]>([]);
  const [aiTasksLoading, setAiTasksLoading] = useState(false);
  const [aiTasksError, setAiTasksError] = useState<string | null>(null);
  const [iaTasksStatusFilter, setIaTasksStatusFilter] = useState<string>('all');
  const [iaTasksPage, setIaTasksPage] = useState(1);
  const [iaTaskForm, setIaTaskForm] = useState({ title: '', description: '', status: 'TODO', linkedAgentId: '', specialistType: '', contextReference: '' });
  const [iaConversations, setIaConversations] = useState<IaConversation[]>([]);
  const [iaConversationsLoading, setIaConversationsLoading] = useState(false);
  const [iaConversationsError, setIaConversationsError] = useState<string | null>(null);
  const [iaMessages, setIaMessages] = useState<IaMessage[]>([]);
  const [iaMessagesLoading, setIaMessagesLoading] = useState(false);
  const [iaMessagesError, setIaMessagesError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [iaAgents, setIaAgents] = useState<IaAgent[]>([]);
  const [iaAgentsLoading, setIaAgentsLoading] = useState(false);
  const [iaAgentsError, setIaAgentsError] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', description: '', specialty: '', system_prompt: '', autonomy_level: 'manual', is_active: true });
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentExecutionResult, setAgentExecutionResult] = useState<IaAgentExecutionResult | null>(null);
  const [selectedAgentToExecute, setSelectedAgentToExecute] = useState('');
  const [iaContexts, setIaContexts] = useState<IaContext[]>([]);
  const [iaContextsLoading, setIaContextsLoading] = useState(false);
  const [iaContextsError, setIaContextsError] = useState<string | null>(null);
  const [contextForm, setContextForm] = useState({ title: '', content: '', context_type: '', related_agent_id: '' });
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [iaMemoryStats, setIaMemoryStats] = useState<IaMemoryStats | null>(null);
  const [iaMemoryLoading, setIaMemoryLoading] = useState(false);
  const [iaMemoryError, setIaMemoryError] = useState<string | null>(null);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [memorySearchResults, setMemorySearchResults] = useState<IaMemoryItem[]>([]);
  const [memorySearchLoading, setMemorySearchLoading] = useState(false);
  const [iaPrompts, setIaPrompts] = useState<IaPromptItem[]>([]);
  const [iaPromptsLoading, setIaPromptsLoading] = useState(false);
  const [iaPromptsError, setIaPromptsError] = useState<string | null>(null);
  const [iaPromptsCategory, setIaPromptsCategory] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<IaPromptItem | null>(null);
  const [promptVersions, setPromptVersions] = useState<IaPromptVersion[]>([]);
  const [promptVersionsLoading, setPromptVersionsLoading] = useState(false);
  const [promptVersionsError, setPromptVersionsError] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ title: '', category: '', description: '', content: '', is_active: true, reembed: false });
  const [iaOrchestrators, setIaOrchestrators] = useState<IaOrchestrator[]>([]);
  const [iaOrchestratorsLoading, setIaOrchestratorsLoading] = useState(false);
  const [iaOrchestratorsError, setIaOrchestratorsError] = useState<string | null>(null);
  const [activeOrchestrator, setActiveOrchestrator] = useState<IaOrchestrator | null>(null);
  const [orchestratorSummary, setOrchestratorSummary] = useState<IaOrchestratorSummary | null>(null);
  const [orchestratorExecutions, setOrchestratorExecutions] = useState<IaOrchestratorExecution[]>([]);
  const [orchestratorExecutionsLoading, setOrchestratorExecutionsLoading] = useState(false);
  const [orchestratorExecutionsError, setOrchestratorExecutionsError] = useState<string | null>(null);
  const [supremePromptModal, setSupremePromptModal] = useState<IaOrchestrator | null>(null);
  const [supremePromptContent, setSupremePromptContent] = useState<IaOrchestratorContent | null>(null);
  const [supremePromptLoading, setSupremePromptLoading] = useState(false);
  const [editingOrchestratorId, setEditingOrchestratorId] = useState<string | null>(null);
  const [orchestratorForm, setOrchestratorForm] = useState({ name: '', supreme_prompt: '', execution_flow: '[]', is_active: true });
  const [viewingContext, setViewingContext] = useState<IaContext | null>(null);
  const [iaConfig, setIaConfig] = useState<IaConfig | null>(null);
  const [iaConfigLoading, setIaConfigLoading] = useState(false);
  const [iaConfigError, setIaConfigError] = useState<string | null>(null);
  const [sonarSummary, setSonarSummary] = useState<SonarSummaryDTO | null>(null);
  const [sonarIssues, setSonarIssues] = useState<SonarIssueDTO[]>([]);
  const [sonarLoading, setSonarLoading] = useState(false);
  const [sonarError, setSonarError] = useState<string | null>(null);
  const [ciStatus, setCiStatus] = useState<CiStatusDTO | null>(null);
  const [ciLoading, setCiLoading] = useState(false);
  const [ciError, setCiError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatusDTO | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState({ api: false, ui: false, architecture: false });
  const [docsError, setDocsError] = useState<{ api: string | null; ui: string | null; architecture: string | null }>({
    api: null,
    ui: null,
    architecture: null,
  });
  const [hktechAiResult, setHktechAiResult] = useState<HKTechAiResult | null>(null);
  const [hktechAiLoading, setHktechAiLoading] = useState(false);
  const [hktechAiError, setHktechAiError] = useState<string | null>(null);
  const [automationMode, setAutomationMode] = useState<'manual' | 'semi' | 'controlled'>('manual');
  const [maxIssuesPerRun, setMaxIssuesPerRun] = useState(5);
  const [maxExecutionsPerHour, setMaxExecutionsPerHour] = useState(2);
  const [cooldownMinutes, setCooldownMinutes] = useState(30);
  const [simulateModalIssue, setSimulateModalIssue] = useState<SonarIssueDTO | null>(null);
  const [simulateResult, setSimulateResult] = useState<HKTechAiResult | null>(null);
  const [simulateLoading, setSimulateLoading] = useState(false);
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
    isTemplate: false,
  });
  const [templateCreateData, setTemplateCreateData] = useState({
    name: '',
    description: '',
    level: '',
    category: '',
    blogContent: '',
  });
  const [templateCreateError, setTemplateCreateError] = useState<string | null>(null);
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
    isTemplate: false,
  });
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
  const [templateBreadcrumbLabel, setTemplateBreadcrumbLabel] = useState<string>('');
  const sidebarRef = useRef<HTMLElement | null>(null);

  const permissionFlags = (localStorage.getItem('permissionFlags') || '')
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean);

  const hasPermission = (flag?: string) => {
    if (!flag) return true;
    return isAdmin || permissionFlags.includes(flag);
  };

  const canViewFinance = hasPermission('ADMIN_FINANCEIRO_VIEW');

  const menuGroups: MenuGroupConfig[] = [
    {
      id: 'governanca',
      label: 'Governança',
      items: [
        { id: 'reports', label: 'Relatórios' },
      ],
    },
    {
      id: 'ia',
      label: 'IA',
      items: [
        { id: 'ia-hktech', label: 'HK IA', adminOnly: true },
        { id: 'ia-tasks', label: 'Tasks IA', adminOnly: true },
        { id: 'ia-agents', label: 'Agentes IA', adminOnly: true },
        { id: 'ia-orchestrator', label: 'Orquestrador IA', adminOnly: true },
        { id: 'ia-context', label: 'Contextos IA', adminOnly: true },
        { id: 'ia-memory', label: 'Memória IA', adminOnly: true },
        { id: 'ia-reports', label: 'AI Reports' },
      ],
    },
    {
      id: 'monitoramento',
      label: 'Monitoramento',
      items: [
        { id: 'monitoramento-overview', label: 'Visão geral' },
        { id: 'monitoramento-sonar', label: 'SonarCloud' },
        { id: 'monitoramento-coverage', label: 'Test Coverage' },
        { id: 'monitoramento-ci', label: 'CI Status' },
      ],
    },
    {
      id: 'documentacao',
      label: 'Documentação',
      items: [
        { id: 'documentacao-api', label: 'API (Swagger)' },
        { id: 'documentacao-ui', label: 'UI (Storybook)' },
        { id: 'documentacao-architecture', label: 'Architecture' },
      ],
    },
    {
      id: 'mybots',
      label: 'MyBots',
      items: [
        { id: 'overview', label: 'Visão geral', targetMenuId: 'mybots', childId: 'overview' },
        { id: 'battles', label: 'Batalhas', targetMenuId: 'mybots', childId: 'battles' },
        { id: 'ecosystem', label: 'Ecossistema', targetMenuId: 'mybots', childId: 'ecosystem' },
      ],
    },
    {
      id: 'dao',
      label: 'DAO',
      items: [
        { id: 'propostas', label: 'Propostas', targetMenuId: 'dao', childId: 'propostas' },
        { id: 'votacoes', label: 'Votações', targetMenuId: 'dao', childId: 'votacoes' },
        { id: 'tesouraria', label: 'Tesouraria', targetMenuId: 'dao', childId: 'tesouraria' },
        { id: 'membros', label: 'Membros', targetMenuId: 'dao', childId: 'membros' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      items: [
        { id: 'vendas', label: 'Vendas', permissionFlag: 'ADMIN_FINANCEIRO_VIEW', targetMenuId: 'financeiro', childId: 'vendas' },
        { id: 'resgates', label: 'Resgates', permissionFlag: 'ADMIN_FINANCEIRO_VIEW', targetMenuId: 'financeiro', childId: 'resgates' },
        { id: 'custos', label: 'Custos', permissionFlag: 'ADMIN_FINANCEIRO_VIEW', targetMenuId: 'financeiro', childId: 'custos' },
      ],
    },
    {
      id: 'operacoes',
      label: 'Operações',
      items: [
        { id: 'users', label: 'Usuários' },
        { id: 'products', label: 'Produtos' },
      ],
    },
    {
      id: 'projetos',
      label: 'Projetos',
      items: [
        { id: 'templates', label: 'Templates', targetMenuId: 'projetos', childId: 'templates' },
        { id: 'clonados', label: 'Projetos Clonados', targetMenuId: 'projetos', childId: 'clonados' },
      ],
    },
    {
      id: 'sistema',
      label: 'Sistema',
      items: [
        { id: 'admin-tools', label: 'Admin Tools', adminOnly: true },
      ],
    },
  ];

  const adminRouteMap: Record<string, string> = {
    reports: '/admin/governanca/relatorios',
    'ia-hktech': '/admin/ia/hktech',
    'ia-tasks': '/admin/ia/tasks',
    'ia-agents': '/admin/ia/agents',
    'ia-orchestrator': '/admin/ia/orchestrator',
    'ia-context': '/admin/ia/context',
    'ia-memory': '/admin/ia/memory',
    'ia-reports': '/admin/ia/reports',
    'monitoramento-overview': '/admin/monitoramento/overview',
    'monitoramento-sonar': '/admin/monitoramento/sonar',
    'monitoramento-coverage': '/admin/monitoramento/coverage',
    'monitoramento-ci': '/admin/monitoramento/ci',
    'documentacao-api': '/admin/documentacao/api',
    'documentacao-ui': '/admin/documentacao/ui',
    'documentacao-architecture': '/admin/documentacao/architecture',
    'mybots/overview': '/admin/mybots/overview',
    'mybots/battles': '/admin/mybots/battles',
    'mybots/ecosystem': '/admin/mybots/ecosystem',
    'dao/propostas': '/admin/dao/propostas',
    'dao/votacoes': '/admin/dao/votacoes',
    'dao/tesouraria': '/admin/dao/tesouraria',
    'dao/membros': '/admin/dao/membros',
    'financeiro/vendas': '/admin/financeiro/vendas',
    'financeiro/resgates': '/admin/financeiro/resgates',
    'financeiro/custos': '/admin/financeiro/custos',
    'projetos/templates': '/admin/projetos/templates',
    'projetos/clonados': '/admin/projetos/clonados',
    users: '/admin/operacoes/usuarios',
    products: '/admin/operacoes/produtos',
    'admin-tools': '/admin/sistema/tools',
  };

  const getRouteForMenuItem = (item?: MenuItemConfig) => {
    if (!item) return undefined;
    const targetKey = item.targetMenuId && item.childId ? `${item.targetMenuId}/${item.childId}` : item.id;
    return adminRouteMap[targetKey];
  };

  const getDefaultRouteForGroup = (group?: MenuGroupConfig) => {
    if (!group) return undefined;
    const firstItem = group.items.find((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.permissionFlag && !hasPermission(item.permissionFlag)) return false;
      return true;
    });
    return getRouteForMenuItem(firstItem);
  };

  const adminCrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'admin') return [] as BreadcrumbleItem[];

    const section = parts[1] || 'governanca';
    const page = parts[2];

    let groupId = section;
    let itemId: string | undefined;

    if (section === 'governanca') {
      itemId = 'reports';
    } else if (section === 'mybots') {
      const allowed = ['overview', 'battles', 'ecosystem'] as const;
      itemId = allowed.includes(page as typeof allowed[number]) ? page : mybotsSubTab;
    } else if (section === 'dao') {
      const allowed = ['propostas', 'votacoes', 'tesouraria', 'membros'] as const;
      itemId = allowed.includes(page as typeof allowed[number]) ? page : daoSubTab;
    } else if (section === 'financeiro') {
      const allowed = ['vendas', 'resgates', 'custos'] as const;
      itemId = allowed.includes(page as typeof allowed[number]) ? page : financeSubTab;
    } else if (section === 'projetos') {
      const allowed = ['templates', 'clonados'] as const;
      itemId = allowed.includes(page as typeof allowed[number]) ? page : projectsSubTab;
    } else if (section === 'ia') {
      if (page === 'hktech') itemId = 'ia-hktech';
      else if (page === 'tasks') itemId = 'ia-tasks';
      else if (page === 'agents') itemId = 'ia-agents';
      else if (page === 'orchestrator') itemId = 'ia-orchestrator';
      else if (page === 'context') itemId = 'ia-context';
      else if (page === 'memory') itemId = 'ia-memory';
      else if (page === 'reports') itemId = 'ia-reports';
      else itemId = 'ia-hktech';
    } else if (section === 'monitoramento') {
      if (page === 'sonar') itemId = 'monitoramento-sonar';
      else if (page === 'coverage') itemId = 'monitoramento-coverage';
      else if (page === 'ci') itemId = 'monitoramento-ci';
      else itemId = 'monitoramento-sonar';
    } else if (section === 'documentacao') {
      if (page === 'api') itemId = 'documentacao-api';
      else if (page === 'ui') itemId = 'documentacao-ui';
      else if (page === 'architecture') itemId = 'documentacao-architecture';
      else itemId = 'documentacao-api';
    } else if (section === 'operacoes') {
      if (page === 'usuarios') itemId = 'users';
      else if (page === 'produtos') itemId = 'products';
      else itemId = 'users';
    } else if (section === 'sistema') {
      if (page === 'tools') itemId = 'admin-tools';
      else itemId = 'admin-tools';
    } else {
      groupId = 'governanca';
      itemId = 'reports';
    }

    const group = menuGroups.find((entry) => entry.id === groupId) ?? menuGroups[0];
    const item = group?.items.find((entry) => entry.id === itemId) ?? group?.items[0];
    const groupRoute = getDefaultRouteForGroup(group);
    const itemRoute = getRouteForMenuItem(item);

    const crumbs: BreadcrumbleItem[] = [{ label: 'Admin', to: '/admin' }];
    if (group) {
      crumbs.push({ label: group.label, to: groupRoute });
    }
    if (item) {
      crumbs.push({ label: item.label, to: itemRoute });
    }
    if (isTemplateEditorRoute && templateBreadcrumbLabel) {
      crumbs.push({ label: templateBreadcrumbLabel });
    }
    return crumbs;
  }, [
    location.pathname,
    menuGroups,
    mybotsSubTab,
    daoSubTab,
    financeSubTab,
    projectsSubTab,
    isAdmin,
    hasPermission,
    isTemplateEditorRoute,
    templateBreadcrumbLabel,
  ]);

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleSelectMenu = (menuId: string, childId?: string) => {
    const target = childId ? `${menuId}/${childId}` : menuId;
    const nextRoute = adminRouteMap[target] ?? '/admin/governanca/relatorios';
    navigate(nextRoute);
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
    if (!effectiveAdminId) return;
    setAiReportsLoading(true);
    setAiReportsError(null);
    try {
      const data = await listIaReports(effectiveAdminId);
      setAiReports(data);
    } catch (error) {
      console.error('Erro ao buscar AI reports:', error);
      setAiReportsError('Não foi possível carregar os relatórios de IA.');
    } finally {
      setAiReportsLoading(false);
    }
  };

  const loadIaConfig = async () => {
    if (!effectiveAdminId) return;
    setIaConfigLoading(true);
    setIaConfigError(null);
    try {
      const data = await fetchIaConfig(effectiveAdminId);
      setIaConfig(data);
      if (typeof data.maxTasksPerRun === 'number') {
        setMaxIssuesPerRun(data.maxTasksPerRun);
      }
      if (typeof data.maxExecutionsPerHour === 'number') {
        setMaxExecutionsPerHour(data.maxExecutionsPerHour);
      }
      if (typeof data.cooldownMinutes === 'number') {
        setCooldownMinutes(data.cooldownMinutes);
      }
    } catch (error) {
      console.error('Erro ao carregar config IA:', error);
      setIaConfigError('Não foi possível carregar a configuração de IA.');
    } finally {
      setIaConfigLoading(false);
    }
  };

  const loadAiTasks = async () => {
    if (!effectiveAdminId) return;
    setAiTasksLoading(true);
    setAiTasksError(null);
    try {
      const data = await listAiTasks(effectiveAdminId);
      setAiTasks(data);
    } catch (error) {
      console.error('Erro ao buscar tarefas de IA:', error);
      setAiTasksError('Não foi possível carregar as tarefas de IA.');
    } finally {
      setAiTasksLoading(false);
    }
  };

  const loadIaConversations = async () => {
    if (!effectiveAdminId) return;
    setIaConversationsLoading(true);
    setIaConversationsError(null);
    try {
      const data = await listIaConversations(effectiveAdminId);
      setIaConversations(data);
      if (!selectedConversationId && data[0]?.id) {
        setSelectedConversationId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas IA:', error);
      setIaConversationsError('Não foi possível carregar as conversas IA.');
    } finally {
      setIaConversationsLoading(false);
    }
  };

  const loadIaMessages = async (conversationId: string) => {
    if (!effectiveAdminId) return;
    setIaMessagesLoading(true);
    setIaMessagesError(null);
    try {
      const data = await listIaMessages(effectiveAdminId, conversationId);
      setIaMessages(data);
    } catch (error) {
      console.error('Erro ao carregar mensagens IA:', error);
      setIaMessagesError('Não foi possível carregar as mensagens IA.');
    } finally {
      setIaMessagesLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!effectiveAdminId) return;
    try {
      const convo = await createIaConversation(effectiveAdminId, newConversationTitle || undefined);
      setNewConversationTitle('');
      setIaConversations((prev) => [convo, ...prev]);
      setSelectedConversationId(convo.id);
      setIaMessages([]);
    } catch (error) {
      console.error('Erro ao criar conversa IA:', error);
      setIaConversationsError('Não foi possível criar a conversa IA.');
    }
  };

  const handleSendChat = async () => {
    if (!effectiveAdminId || !chatInput.trim()) return;
    setChatSending(true);
    try {
      const response = await sendIaMessage(effectiveAdminId, selectedConversationId, chatInput.trim());
      setChatInput('');
      if (!selectedConversationId && response.conversationId) {
        setSelectedConversationId(response.conversationId);
      }
      if (response.conversationId) {
        await loadIaMessages(response.conversationId);
        await loadIaConversations();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem IA:', error);
      setIaMessagesError('Não foi possível enviar a mensagem.');
    } finally {
      setChatSending(false);
    }
  };

  const loadIaAgents = async () => {
    if (!effectiveAdminId) return;
    setIaAgentsLoading(true);
    setIaAgentsError(null);
    try {
      const data = await listIaAgents(effectiveAdminId);
      setIaAgents(data);
    } catch (error) {
      console.error('Erro ao carregar agentes IA:', error);
      setIaAgentsError('Não foi possível carregar agentes IA.');
    } finally {
      setIaAgentsLoading(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!effectiveAdminId || !agentForm.name.trim()) return;
    try {
      if (editingAgentId) {
        const updated = await updateIaAgent(effectiveAdminId, editingAgentId, agentForm);
        setIaAgents((prev) => prev.map((agent) => (agent.id === updated.id ? updated : agent)));
      } else {
        const created = await createIaAgent(effectiveAdminId, agentForm);
        setIaAgents((prev) => [created, ...prev]);
      }
      setAgentForm({ name: '', description: '', specialty: '', system_prompt: '', autonomy_level: 'manual', is_active: true });
      setEditingAgentId(null);
    } catch (error) {
      console.error('Erro ao salvar agente IA:', error);
      setIaAgentsError('Não foi possível salvar agente IA.');
    }
  };

  const handleExecuteAgent = async (agentId: string) => {
    if (!effectiveAdminId) return;
    try {
      const result = await executeIaAgent(effectiveAdminId, agentId);
      setAgentExecutionResult(result);
      await loadAiTasks();
      await loadAiReports();
    } catch (error) {
      console.error('Erro ao executar agente IA:', error);
      setIaAgentsError('Não foi possível executar agente IA.');
    }
  };

  const loadIaContexts = async () => {
    if (!effectiveAdminId) return;
    setIaContextsLoading(true);
    setIaContextsError(null);
    try {
      const data = await listIaContexts(effectiveAdminId);
      setIaContexts(data);
    } catch (error) {
      console.error('Erro ao carregar contextos IA:', error);
      setIaContextsError('Não foi possível carregar contextos IA.');
    } finally {
      setIaContextsLoading(false);
    }
  };

  const handleSaveContext = async () => {
    if (!effectiveAdminId || !contextForm.title.trim() || !contextForm.content.trim()) return;
    try {
      if (editingContextId) {
        const updated = await updateIaContext(effectiveAdminId, editingContextId, contextForm);
        setIaContexts((prev) => prev.map((ctx) => (ctx.id === updated.id ? updated : ctx)));
      } else {
        const created = await createIaContext(effectiveAdminId, contextForm);
        setIaContexts((prev) => [created, ...prev]);
      }
      setContextForm({ title: '', content: '', context_type: '', related_agent_id: '' });
      setEditingContextId(null);
    } catch (error) {
      console.error('Erro ao salvar contexto IA:', error);
      setIaContextsError('Não foi possível salvar contexto IA.');
    }
  };

  const handleDeleteContext = async (id: string) => {
    if (!effectiveAdminId) return;
    try {
      await deleteIaContext(effectiveAdminId, id);
      setIaContexts((prev) => prev.filter((ctx) => ctx.id !== id));
    } catch (error) {
      console.error('Erro ao remover contexto IA:', error);
      setIaContextsError('Não foi possível remover contexto IA.');
    }
  };

  const loadIaMemoryStats = async () => {
    if (!effectiveAdminId) return;
    setIaMemoryLoading(true);
    setIaMemoryError(null);
    try {
      const stats = await fetchIaMemoryStats(effectiveAdminId);
      setIaMemoryStats(stats);
    } catch (error) {
      console.error('Erro ao carregar memória IA:', error);
      setIaMemoryError('Não foi possível carregar memória IA.');
    } finally {
      setIaMemoryLoading(false);
    }
  };

  const loadIaPrompts = async () => {
    if (!effectiveAdminId) return;
    setIaPromptsLoading(true);
    setIaPromptsError(null);
    try {
      const data = await listIaPrompts(effectiveAdminId, iaPromptsCategory || undefined);
      setIaPrompts(data);
    } catch (error) {
      console.error('Erro ao carregar prompts IA:', error);
      setIaPromptsError('Não foi possível carregar prompts IA.');
    } finally {
      setIaPromptsLoading(false);
    }
  };

  const loadPromptVersions = async (promptId: string) => {
    if (!effectiveAdminId) return;
    setPromptVersionsLoading(true);
    setPromptVersionsError(null);
    try {
      const data = await listIaPromptVersions(effectiveAdminId, promptId);
      setPromptVersions(data);
    } catch (error) {
      console.error('Erro ao carregar versões do prompt IA:', error);
      setPromptVersionsError('Não foi possível carregar o histórico do prompt.');
    } finally {
      setPromptVersionsLoading(false);
    }
  };

  const loadIaOrchestrators = async () => {
    if (!effectiveAdminId) return;
    setIaOrchestratorsLoading(true);
    setIaOrchestratorsError(null);
    try {
      const data = await listIaOrchestrators(effectiveAdminId);
      setIaOrchestrators(data);
    } catch (error) {
      console.error('Erro ao carregar orquestradores IA:', error);
      setIaOrchestratorsError('Não foi possível carregar orquestradores IA.');
    } finally {
      setIaOrchestratorsLoading(false);
    }
  };

  const loadActiveOrchestrator = async () => {
    if (!effectiveAdminId) return;
    try {
      const data = await fetchActiveIaOrchestrator(effectiveAdminId);
      setActiveOrchestrator(data);
    } catch (error) {
      console.error('Erro ao carregar orquestrador ativo:', error);
    }
  };

  const loadOrchestratorSummary = async () => {
    if (!effectiveAdminId) return;
    try {
      const data = await fetchIaOrchestratorSummary(effectiveAdminId);
      setOrchestratorSummary(data);
    } catch (error) {
      console.error('Erro ao carregar resumo do orquestrador IA:', error);
    }
  };

  const loadOrchestratorExecutions = async (orchestratorId?: string) => {
    if (!effectiveAdminId) return;
    setOrchestratorExecutionsLoading(true);
    setOrchestratorExecutionsError(null);
    try {
      const data = await listIaOrchestratorExecutions(effectiveAdminId, { orchestratorId, limit: 20 });
      setOrchestratorExecutions(data);
    } catch (error) {
      console.error('Erro ao carregar execuções do orquestrador IA:', error);
      setOrchestratorExecutionsError('Não foi possível carregar execuções do orquestrador IA.');
    } finally {
      setOrchestratorExecutionsLoading(false);
    }
  };

  const loadOrchestratorContent = async (id: string) => {
    if (!effectiveAdminId) return;
    setSupremePromptLoading(true);
    try {
      const data = await fetchIaOrchestratorContent(effectiveAdminId, id);
      setSupremePromptContent(data);
      if (editingOrchestratorId === id) {
        setOrchestratorForm((prev) => ({ ...prev, supreme_prompt: data.content }));
      }
      return data;
    } catch (error) {
      console.error('Erro ao carregar conteúdo do orquestrador IA:', error);
      setIaOrchestratorsError('Não foi possível carregar o Supreme Prompt.');
      return null;
    } finally {
      setSupremePromptLoading(false);
    }
  };

  const handleSelectPrompt = async (promptId: string) => {
    if (!effectiveAdminId) return;
    try {
      const full = await fetchIaPrompt(effectiveAdminId, promptId);
      setSelectedPrompt(full);
      setPromptForm({
        title: full.title || '',
        category: full.category || '',
        description: full.description || '',
        content: full.content || '',
        is_active: full.is_active ?? true,
        reembed: false,
      });
      setPromptVersions([]);
      await loadPromptVersions(promptId);
    } catch (error) {
      console.error('Erro ao carregar prompt IA:', error);
      setIaPromptsError('Não foi possível carregar o prompt.');
    }
  };

  const handleSavePrompt = async () => {
    if (!effectiveAdminId || !selectedPrompt) return;
    try {
      await updateIaPrompt(effectiveAdminId, selectedPrompt.id, {
        title: promptForm.title,
        category: promptForm.category,
        description: promptForm.description,
        content: promptForm.content,
        is_active: promptForm.is_active,
        reembed: promptForm.reembed,
      });
      setSelectedPrompt(null);
      setPromptForm({ title: '', category: '', description: '', content: '', is_active: true, reembed: false });
      await loadIaPrompts();
      await loadIaMemoryStats();
    } catch (error) {
      console.error('Erro ao salvar prompt IA:', error);
      setIaPromptsError('Não foi possível salvar o prompt.');
    }
  };

  const handleReembedPrompt = async (promptId: string) => {
    if (!effectiveAdminId) return;
    try {
      await reembedIaPrompt(effectiveAdminId, promptId);
      await loadIaPrompts();
      await loadIaMemoryStats();
    } catch (error) {
      console.error('Erro ao re-embutir prompt IA:', error);
      setIaPromptsError('Não foi possível re-embutir o prompt.');
    }
  };

  const handleExportPrompts = () => {
    if (!effectiveAdminId) return;
    const base = import.meta.env.VITE_API_BASE || '/api';
    const url = `${base}/ia/prompts/export?adminId=${encodeURIComponent(effectiveAdminId)}`;
    window.open(url, '_blank');
  };

  const handleAdminPromptBackup = () => {
    handleExportPrompts();
    setAdminToolsSuccess('Backup de prompts iniciado.');
  };

  const handleAdminPromptUpdate = () => {
    handleExportPrompts();
    setAdminToolsSuccess('Atualização de prompts iniciada.');
  };

  const handleActivatePromptVersion = async (promptId: string, version: number) => {
    if (!effectiveAdminId) return;
    try {
      await activateIaPromptVersion(effectiveAdminId, promptId, version, true);
      await loadIaPrompts();
      await loadPromptVersions(promptId);
      await loadIaMemoryStats();
    } catch (error) {
      console.error('Erro ao ativar versão do prompt IA:', error);
      setIaPromptsError('Não foi possível ativar a versão do prompt.');
    }
  };

  const handleSaveOrchestrator = async () => {
    if (!effectiveAdminId) return;
    try {
      const flow = orchestratorForm.execution_flow?.trim() ? JSON.parse(orchestratorForm.execution_flow) : [];
      if (editingOrchestratorId) {
        await updateIaOrchestrator(effectiveAdminId, editingOrchestratorId, {
          name: orchestratorForm.name,
          supreme_prompt: orchestratorForm.supreme_prompt,
          execution_flow: flow,
          is_active: orchestratorForm.is_active,
        });
      } else {
        await createIaOrchestrator(effectiveAdminId, {
          name: orchestratorForm.name,
          supreme_prompt: orchestratorForm.supreme_prompt,
          execution_flow: flow,
          is_active: orchestratorForm.is_active,
        });
      }
      setEditingOrchestratorId(null);
      setOrchestratorForm({ name: '', supreme_prompt: '', execution_flow: '[]', is_active: true });
      await loadIaOrchestrators();
    } catch (error) {
      console.error('Erro ao salvar orquestrador IA:', error);
      setIaOrchestratorsError('Não foi possível salvar o orquestrador IA.');
    }
  };

  const handleActivateOrchestrator = async (id: string) => {
    if (!effectiveAdminId) return;
    try {
      await activateIaOrchestrator(effectiveAdminId, id);
      await loadIaOrchestrators();
    } catch (error) {
      console.error('Erro ao ativar orquestrador IA:', error);
      setIaOrchestratorsError('Não foi possível ativar o orquestrador IA.');
    }
  };


  const handleMemorySearch = async () => {
    if (!effectiveAdminId || !memorySearchQuery.trim()) return;
    setMemorySearchLoading(true);
    try {
      const results = await searchIaMemory(effectiveAdminId, { query: memorySearchQuery.trim(), topK: 5 });
      setMemorySearchResults(results);
    } catch (error) {
      console.error('Erro ao buscar memória IA:', error);
      setIaMemoryError('Não foi possível buscar memória IA.');
    } finally {
      setMemorySearchLoading(false);
    }
  };

  const handleCreateMemory = async () => {
    if (!effectiveAdminId || !memorySearchQuery.trim()) return;
    try {
      await createIaMemory(effectiveAdminId, { content: memorySearchQuery.trim(), context_type: 'manual' });
      await loadIaMemoryStats();
      setMemorySearchQuery('');
    } catch (error) {
      console.error('Erro ao criar memória IA:', error);
      setIaMemoryError('Não foi possível criar memória IA.');
    }
  };

  const handleCreateIaTask = async () => {
    if (!effectiveAdminId || !iaTaskForm.title.trim()) return;
    try {
      await createIaTask(effectiveAdminId, {
        title: iaTaskForm.title.trim(),
        description: iaTaskForm.description,
        status: iaTaskForm.status,
        linkedAgentId: iaTaskForm.linkedAgentId || undefined,
        specialistType: iaTaskForm.specialistType,
        contextReference: iaTaskForm.contextReference,
        origin: 'Manual',
      });
      setIaTaskForm({ title: '', description: '', status: 'TODO', linkedAgentId: '', specialistType: '', contextReference: '' });
      await loadAiTasks();
    } catch (error) {
      console.error('Erro ao criar task IA:', error);
      setAiTasksError('Não foi possível criar a task IA.');
    }
  };

  const loadSonarData = async () => {
    setSonarLoading(true);
    setSonarError(null);
    try {
      const [summary, issues] = await Promise.all([
        fetchSonarSummary(),
        fetchSonarIssues(),
      ]);
      setSonarSummary(summary);
      setSonarIssues(issues);
    } catch (error) {
      console.error('Erro ao buscar SonarCloud:', error);
      setSonarError('Não foi possível carregar dados do SonarCloud.');
    } finally {
      setSonarLoading(false);
    }
  };

  const loadCiStatus = async () => {
    setCiLoading(true);
    setCiError(null);
    try {
      const data = await fetchCiStatus();
      setCiStatus(data);
    } catch (error) {
      console.error('Erro ao buscar status do CI:', error);
      setCiError('Não foi possível carregar o status do CI.');
    } finally {
      setCiLoading(false);
    }
  };

  const loadHealthStatus = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchHealthStatus();
      setHealthStatus(data);
    } catch (error) {
      console.error('Erro ao buscar status de saúde:', error);
      setHealthError('Não foi possível carregar o status de saúde.');
    } finally {
      setHealthLoading(false);
    }
  };

  const checkDocUrl = async (key: 'api' | 'ui' | 'architecture', url: string) => {
    setDocsLoading((prev) => ({ ...prev, [key]: true }));
    setDocsError((prev) => ({ ...prev, [key]: null }));
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Falha ao acessar ${key}.`);
      }
    } catch (error) {
      console.error('Erro ao carregar documentação:', error);
      setDocsError((prev) => ({ ...prev, [key]: 'Não foi possível carregar a documentação.' }));
    } finally {
      setDocsLoading((prev) => ({ ...prev, [key]: false }));
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

  const handleRunHKTechFix = async () => {
    if (!effectiveAdminId) {
      setHktechAiError('Admin não identificado.');
      return;
    }
    setHktechAiLoading(true);
    setHktechAiError(null);
    try {
      const result = await runHKTechAutofix(effectiveAdminId);
      setHktechAiResult(result);
      loadAiReports();
      loadSonarData();
    } catch (error) {
      console.error('Erro ao executar HKTECH IA:', error);
      setHktechAiError('Não foi possível executar a rotina de autofix.');
    } finally {
      setHktechAiLoading(false);
    }
  };

  const handleSimulateIssue = async (issue: SonarIssueDTO) => {
    if (!effectiveAdminId) {
      setHktechAiError('Admin não identificado.');
      return;
    }
    setSimulateModalIssue(issue);
    setSimulateLoading(true);
    setSimulateResult(null);
    try {
      const result = await simulateHKTechFix(effectiveAdminId, issue.key);
      setSimulateResult(result);
    } catch (error) {
      console.error('Erro ao simular issue:', error);
      setSimulateResult({
        status: 'blocked',
        reason: 'Falha ao simular.',
        issues: [],
        plan: null,
      });
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleResolveIssue = async (issue: SonarIssueDTO) => {
    if (!effectiveAdminId) {
      setHktechAiError('Admin não identificado.');
      return;
    }
    setHktechAiLoading(true);
    setHktechAiError(null);
    try {
      const result = await resolveHKTechIssues(effectiveAdminId, [issue.key], maxIssuesPerRun);
      setHktechAiResult(result);
      loadAiReports();
      loadSonarData();
    } catch (error) {
      console.error('Erro ao resolver issue:', error);
      setHktechAiError('Não foi possível resolver a issue selecionada.');
    } finally {
      setHktechAiLoading(false);
    }
  };

  const handleResolveBatch = async () => {
    if (!effectiveAdminId) {
      setHktechAiError('Admin não identificado.');
      return;
    }
    const eligible = sonarIssues.filter((issue) => issue.riskLevel !== 'HIGH');
    const batch = eligible.slice(0, maxIssuesPerRun);
    if (batch.length === 0) {
      setHktechAiError('Nenhuma issue elegível para resolução automática.');
      return;
    }
    setHktechAiLoading(true);
    setHktechAiError(null);
    try {
      const result = await resolveHKTechIssues(effectiveAdminId, batch.map((issue) => issue.key), maxIssuesPerRun);
      setHktechAiResult(result);
      loadAiReports();
      loadSonarData();
    } catch (error) {
      console.error('Erro ao resolver batch:', error);
      setHktechAiError('Não foi possível resolver o lote.');
    } finally {
      setHktechAiLoading(false);
    }
  };

  const handleSaveIaConfig = async () => {
    if (!effectiveAdminId) {
      setIaConfigError('Admin não identificado.');
      return;
    }
    setIaConfigLoading(true);
    setIaConfigError(null);
    try {
      const data = await updateIaConfig(effectiveAdminId, {
        managedByAI: true,
        taskCreationPolicy: 'AI_ALLOWED',
        allowAutoBacklogIfEmpty: true,
        maxTasksPerRun: maxIssuesPerRun,
        maxExecutionsPerHour,
        cooldownMinutes,
      });
      setIaConfig(data);
    } catch (error) {
      console.error('Erro ao salvar config IA:', error);
      setIaConfigError('Não foi possível salvar a configuração de IA.');
    } finally {
      setIaConfigLoading(false);
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
    loadAiTasks();
    loadIaConfig();
    loadIaConversations();
    loadIaAgents();
    loadIaContexts();
    loadIaMemoryStats();
    loadIaPrompts();
  }, [effectiveAdminId]);

  useEffect(() => {
    if (activeTab === 'monitoramento-overview' || activeTab === 'monitoramento-sonar' || activeTab === 'monitoramento-coverage' || activeTab === 'ia-hktech' || activeTab === 'ia-tasks') {
      loadSonarData();
    }
    if (activeTab === 'monitoramento-overview' || activeTab === 'monitoramento-ci') {
      loadCiStatus();
    }
    if (activeTab === 'monitoramento-overview') {
      loadHealthStatus();
    }
    if (activeTab === 'documentacao-api') {
      checkDocUrl('api', swaggerUrl);
    }
    if (activeTab === 'documentacao-ui') {
      checkDocUrl('ui', storybookUrl);
    }
    if (activeTab === 'documentacao-architecture') {
      checkDocUrl('architecture', architectureUrl);
    }
    if (activeTab === 'ia-hktech' || activeTab === 'ia-tasks' || activeTab === 'ia-reports') {
      loadAiReports();
    }
    if (activeTab === 'ia-tasks') {
      loadAiTasks();
    }
    if (activeTab === 'ia-hktech') {
      loadIaConfig();
      loadIaConversations();
      loadIaAgents();
      loadActiveOrchestrator();
      if (selectedConversationId) {
        loadIaMessages(selectedConversationId);
      }
    }
    if (activeTab === 'ia-tasks') {
      loadIaAgents();
    }
    if (activeTab === 'ia-agents') {
      loadIaAgents();
    }
    if (activeTab === 'ia-orchestrator') {
      loadIaOrchestrators();
      loadActiveOrchestrator();
      loadOrchestratorSummary();
      loadOrchestratorExecutions();
    }
    if (activeTab === 'ia-context') {
      loadIaContexts();
      loadIaAgents();
      loadIaPrompts();
    }
    if (activeTab === 'ia-memory') {
      loadIaMemoryStats();
    }
  }, [activeTab, selectedConversationId]);

  useEffect(() => {
    if (activeTab === 'mybots' && mybotsSubTab === 'battles') {
      loadMyBotBattles();
    }
  }, [activeTab, mybotsSubTab]);

  useEffect(() => {
    setIaTasksPage(1);
  }, [iaTasksStatusFilter]);

  useEffect(() => {
    if (activeTab === 'ia-context') {
      loadIaPrompts();
    }
  }, [iaPromptsCategory]);

  const normalizeIaStatus = (status?: string) => (status || '').toUpperCase();
  const filteredIaTasks = useMemo(() => {
    const domainTasks = aiTasks.filter((task) => (task.domain ?? 'IA') === 'IA');
    if (iaTasksStatusFilter === 'all') return domainTasks;
    const target = iaTasksStatusFilter.toUpperCase();
    return domainTasks.filter((task) => normalizeIaStatus(task.status) === target);
  }, [aiTasks, iaTasksStatusFilter]);

  const iaTasksPageSize = 20;
  const iaTasksTotalPages = Math.max(1, Math.ceil(filteredIaTasks.length / iaTasksPageSize));
  const pagedIaTasks = useMemo(() => {
    const start = (iaTasksPage - 1) * iaTasksPageSize;
    return filteredIaTasks.slice(start, start + iaTasksPageSize);
  }, [filteredIaTasks, iaTasksPage]);

  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/governanca/relatorios', { replace: true });
      return;
    }

    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'admin') return;

    const section = parts[1] || 'governanca';
    const page = parts[2] || 'relatorios';

    if (section === 'financeiro') {
      if (!canViewFinance) {
        navigate('/admin/governanca/relatorios', { replace: true });
        return;
      }
      const allowed = ['vendas', 'resgates', 'custos'] as const;
      const resolved = allowed.includes(page as typeof allowed[number]) ? page : 'vendas';
      setActiveTab('financeiro');
      setFinanceSubTab(resolved as 'vendas' | 'resgates' | 'custos');
      setExpandedSectionIds(['financeiro']);
      if (page !== resolved) {
        navigate(`/admin/financeiro/${resolved}`, { replace: true });
      }
      return;
    }

    if (section === 'mybots') {
      const allowed = ['overview', 'battles', 'ecosystem'] as const;
      const resolved = allowed.includes(page as typeof allowed[number]) ? page : 'overview';
      setActiveTab('mybots');
      setMybotsSubTab(resolved as 'overview' | 'battles' | 'ecosystem');
      setExpandedSectionIds(['mybots']);
      if (page !== resolved) {
        navigate(`/admin/mybots/${resolved}`, { replace: true });
      }
      return;
    }

    if (section === 'dao') {
      const allowed = ['propostas', 'votacoes', 'tesouraria', 'membros'] as const;
      const resolved = allowed.includes(page as typeof allowed[number]) ? page : 'propostas';
      setActiveTab('dao');
      setDaoSubTab(resolved as 'propostas' | 'votacoes' | 'tesouraria' | 'membros');
      setExpandedSectionIds(['dao']);
      if (page !== resolved) {
        navigate(`/admin/dao/${resolved}`, { replace: true });
      }
      return;
    }

    if (section === 'operacoes') {
      const map: Record<string, string> = {
        usuarios: 'users',
        produtos: 'products',
      };
      if (page === 'ai-reports') {
        navigate('/admin/ia/reports', { replace: true });
        return;
      }
      const resolved = map[page] ?? 'users';
      setActiveTab(resolved);
      setExpandedSectionIds(['operacoes']);
      if (!map[page]) {
        const fallback = resolved === 'users' ? 'usuarios' : page;
        navigate(`/admin/operacoes/${fallback}`, { replace: true });
      }
      return;
    }

    if (section === 'projetos') {
      const map: Record<string, string> = {
        templates: 'templates',
        clonados: 'clonados',
      };
      const resolved = map[page] ?? 'templates';
      setActiveTab('projetos');
      setProjectsSubTab(resolved as 'templates' | 'clonados');
      setExpandedSectionIds(['projetos']);
      if (!map[page]) {
        navigate('/admin/projetos/templates', { replace: true });
      }
      return;
    }

    if (section === 'ia') {
      const map: Record<string, string> = {
        hktech: 'ia-hktech',
        tasks: 'ia-tasks',
        agents: 'ia-agents',
        orchestrator: 'ia-orchestrator',
        context: 'ia-context',
        memory: 'ia-memory',
        reports: 'ia-reports',
      };
      const resolved = map[page] ?? 'ia-hktech';
      setActiveTab(resolved);
      setExpandedSectionIds(['ia']);
      if (!map[page]) {
        navigate('/admin/ia/hktech', { replace: true });
      }
      return;
    }

    if (section === 'monitoramento') {
      const map: Record<string, string> = {
        overview: 'monitoramento-overview',
        sonar: 'monitoramento-sonar',
        coverage: 'monitoramento-coverage',
        ci: 'monitoramento-ci',
      };
      const resolved = map[page] ?? 'monitoramento-overview';
      setActiveTab(resolved);
      setExpandedSectionIds(['monitoramento']);
      if (!map[page]) {
        navigate('/admin/monitoramento/overview', { replace: true });
      }
      return;
    }

    if (section === 'documentacao') {
      const map: Record<string, string> = {
        api: 'documentacao-api',
        ui: 'documentacao-ui',
        architecture: 'documentacao-architecture',
      };
      const resolved = map[page] ?? 'documentacao-api';
      setActiveTab(resolved);
      setExpandedSectionIds(['documentacao']);
      if (!map[page]) {
        navigate('/admin/documentacao/api', { replace: true });
      }
      return;
    }

    if (section === 'sistema') {
      if (page === 'sonarcloud') {
        navigate('/admin/monitoramento/sonar', { replace: true });
        return;
      }
      if (page === 'hktech-ia') {
        navigate('/admin/ia/hktech', { replace: true });
        return;
      }
      if (page === 'ai-reports') {
        navigate('/admin/ia/reports', { replace: true });
        return;
      }
      const map: Record<string, string> = {
        tools: 'admin-tools',
      };
      const resolved = map[page] ?? 'admin-tools';
      setActiveTab(resolved);
      setExpandedSectionIds(['sistema']);
      if (!map[page]) {
        navigate('/admin/sistema/tools', { replace: true });
      }
      return;
    }

    if (section === 'governanca') {
      const map: Record<string, string> = {
        relatorios: 'reports',
      };
      const resolved = map[page] ?? 'reports';
      setActiveTab(resolved);
      setExpandedSectionIds(['governanca']);
      if (!map[page]) {
        navigate('/admin/governanca/relatorios', { replace: true });
      }
      return;
    }

    navigate('/admin/governanca/relatorios', { replace: true });
  }, [location.pathname, canViewFinance, navigate]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (window.innerWidth >= 768) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setExpandedSectionIds([]);
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
        templateId: newProduct.templateId.trim() || undefined,
        showOnHome: newProduct.showOnHome,
        showOnMarketplace: newProduct.showOnMarketplace,
        purchasePrice: newProduct.purchasePrice.trim(),
        salePrice: newProduct.salePrice.trim() || newProduct.price.trim()
      });
      setNewProduct({ name: '', price: '', description: '', productType: 'digital', templateId: '', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
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
      templateId: product.templateId ?? '',
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
        templateId: editProductData.templateId.trim() || undefined,
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
        templateId: product.templateId ?? '',
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
        templateId: product.templateId ?? '',
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
        isTemplate: newProject.isTemplate,
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
        isTemplate: false,
      });
      setIsProjectModalOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      setProjectsError('Não foi possível criar o projeto.');
    }
  };

  const handleCreateTemplateFromRoute = async () => {
    setTemplateCreateError(null);
    if (!templateCreateData.name.trim()) {
      setTemplateCreateError('Preencha o nome do template.');
      return;
    }
    try {
      const created = await createProject({
        name: templateCreateData.name.trim(),
        description: templateCreateData.description.trim(),
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
        isTemplate: true,
        ownerUserId: effectiveAdminId,
      });
      await updateTemplate(created.id, {
        name: templateCreateData.name.trim(),
        description: templateCreateData.description.trim(),
        blogContent: templateCreateData.blogContent ?? '',
        level: templateCreateData.level ?? '',
        category: templateCreateData.category ?? '',
        adminId: effectiveAdminId,
      });
      setTemplateCreateData({ name: '', description: '', level: '', category: '', blogContent: '' });
      await loadProjects();
      navigate(`/admin/projetos/templates/${created.id}`);
    } catch (error) {
      console.error('Erro ao criar template:', error);
      setTemplateCreateError('Não foi possível criar o template.');
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
      isTemplate: project.isTemplate ?? false,
    });
    setIsProjectEditModalOpen(true);
  };

  const handleCloneTemplate = async (templateId: string) => {
    setProjectsError(null);
    try {
      await cloneTemplate(templateId, effectiveAdminId);
      await loadProjects();
    } catch (error) {
      console.error('Erro ao clonar template:', error);
      setProjectsError('Não foi possível clonar o template.');
    }
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
        isTemplate: editProjectData.isTemplate,
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
  const latestCiRun = ciStatus?.runs?.[0] ?? null;
  const jestRun = ciStatus?.runs?.find((run) => /jest/i.test(run.name))
    ?? ciStatus?.runs?.find((run) => /test/i.test(run.name))
    ?? null;
  const activeChildByMenuId: Record<string, string | undefined> = {
    mybots: mybotsSubTab,
    dao: daoSubTab,
    financeiro: financeSubTab,
    projetos: projectsSubTab,
  };
  const activeOrchestratorRecord = orchestratorSummary?.activeOrchestrator ?? activeOrchestrator ?? iaOrchestrators.find((item) => item.is_active) ?? null;
  const executionFlowList = useMemo(
    () => (Array.isArray(activeOrchestratorRecord?.execution_flow) ? (activeOrchestratorRecord?.execution_flow as string[]) : []),
    [activeOrchestratorRecord]
  );
  const latestOrchestratorExecution = orchestratorSummary?.lastExecution ?? orchestratorExecutions[0] ?? null;

  return (
    <LayoutPrivate
      crumbs={adminCrumbs}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
    >
      <div className={`admin-container ${adminCrumbs.length > 0 ? 'has-breadcrumb' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="admin-sidebar" ref={sidebarRef}>
          <h2 className="admin-sidebar__brand">Admin</h2>
          <div className="admin-table-wrapper" style={{ margin: '0 16px 16px', padding: 12 }}>
            <h4 style={{ marginBottom: 6 }}>Orquestrador Ativo</h4>
            {activeOrchestrator ? (
              <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                <strong>{activeOrchestrator.name}</strong>
                <span>v{activeOrchestrator.version ?? 1}</span>
              </div>
            ) : (
              <span style={{ fontSize: 12 }}>Nenhum ativo</span>
            )}
          </div>
          <AdminSidebarMenu
            groups={menuGroups}
            activeTab={activeTab}
            activeChildByMenuId={activeChildByMenuId}
            expandedSectionIds={expandedSectionIds}
            onToggleSection={toggleSection}
            onSelectMenu={handleSelectMenu}
            isAdmin={isAdmin}
            hasPermission={hasPermission}
          />
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

        {activeTab === 'financeiro' && !canViewFinance && (
          <section>
            <h2>Financeiro</h2>
            <p>Você não possui permissão para acessar este domínio.</p>
          </section>
        )}

        {activeTab === 'financeiro' && canViewFinance && financeSubTab === 'vendas' && (
          <FinanceiroVendas
            paidSales={paidSales}
            loading={paidSalesLoading}
            error={paidSalesError}
            onViewProject={(projectId) => navigate(`/manager?projectId=${encodeURIComponent(projectId)}`)}
          />
        )}

        {activeTab === 'financeiro' && canViewFinance && financeSubTab === 'resgates' && (
          <FinanceiroResgates
            redeems={redeems}
            loading={redeemsLoading}
            error={redeemsError}
            onViewProject={(projectId) => navigate(`/manager?projectId=${encodeURIComponent(projectId)}`)}
          />
        )}

        {activeTab === 'financeiro' && canViewFinance && financeSubTab === 'custos' && (
          <FinanceiroCustos
            costs={costs}
            loading={costsLoading}
            error={costsError}
            totalCostsMonthly={totalCostsMonthly}
            totalCostsAnnual={totalCostsAnnual}
            newCost={newCost}
            setNewCost={setNewCost}
            onCreateCost={handleCreateCost}
            onEditCost={handleEditCost}
            onDeleteCost={handleDeleteCost}
            getMonthlyCost={getMonthlyCost}
            isEditCostModalOpen={isEditCostModalOpen}
            setIsEditCostModalOpen={setIsEditCostModalOpen}
            editCostData={editCostData}
            setEditCostData={setEditCostData}
            onSaveCostEdit={handleSaveCostEdit}
          />
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
                className="admin-btn"
                onClick={handleAdminPromptUpdate}
              >
                Atualizar Prompts
              </button>
              <button
                className="admin-btn admin-btn--ghost"
                onClick={handleAdminPromptBackup}
              >
                Gerar Backup
              </button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('reset-ia-tasks', resetIaTasks)}
              >
                Reset IA Tasks
              </button>
              <button
                className="admin-btn"
                disabled={adminToolsLoading !== null}
                onClick={() => runAdminTool('migrate-ia-tasks', migrateIaTasks)}
              >
                Migrar IA Tasks (HKTECH)
              </button>
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

        {activeTab === 'monitoramento-overview' && (
          <section>
            <h2>Monitoramento</h2>
            <p>Resumo dos serviços críticos para análise do admin.</p>
            <div className="report-summary">
              <div className="report-card">
                <span>SonarCloud</span>
                <strong>
                  {sonarLoading
                    ? 'Carregando...'
                    : sonarError
                      ? 'Indisponível'
                      : sonarSummary?.qualityGateStatus ?? '—'}
                </strong>
                <em>
                  {!sonarLoading && !sonarError && sonarSummary
                    ? `Coverage ${sonarSummary.metrics.coverage}%`
                    : '—'}
                </em>
              </div>
              <div className="report-card">
                <span>Jest</span>
                <strong>
                  {ciLoading
                    ? 'Carregando...'
                    : ciError
                      ? 'Indisponível'
                      : jestRun?.conclusion ?? jestRun?.status ?? '—'}
                </strong>
                <em>{jestRun?.headBranch ?? '—'}</em>
              </div>
              <div className="report-card">
                <span>CI</span>
                <strong>
                  {ciLoading
                    ? 'Carregando...'
                    : ciError
                      ? 'Indisponível'
                      : latestCiRun?.conclusion ?? latestCiRun?.status ?? '—'}
                </strong>
                <em>{latestCiRun?.name ?? '—'}</em>
              </div>
              <div className="report-card">
                <span>Health</span>
                <strong>
                  {healthLoading
                    ? 'Carregando...'
                    : healthError
                      ? 'Indisponível'
                      : healthStatus?.status ?? '—'}
                </strong>
                <em>
                  {!healthLoading && !healthError && healthStatus
                    ? `DB ${healthStatus.database}`
                    : '—'}
                </em>
              </div>
            </div>
            <div className="admin-table-wrapper" style={{ marginTop: 16 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>SonarCloud</td>
                    <td>
                      {sonarLoading
                        ? 'Carregando...'
                        : sonarError
                          ? 'Indisponível'
                          : sonarSummary?.qualityGateStatus ?? '—'}
                    </td>
                    <td>
                      {!sonarLoading && !sonarError && sonarSummary
                        ? `Coverage ${sonarSummary.metrics.coverage}% • Bugs ${sonarSummary.metrics.bugs}`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>Jest</td>
                    <td>
                      {ciLoading
                        ? 'Carregando...'
                        : ciError
                          ? 'Indisponível'
                          : jestRun?.conclusion ?? jestRun?.status ?? '—'}
                    </td>
                    <td>
                      {jestRun
                        ? `Branch ${jestRun.headBranch} • Run #${jestRun.runNumber}`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>GitHub Actions</td>
                    <td>
                      {ciLoading
                        ? 'Carregando...'
                        : ciError
                          ? 'Indisponível'
                          : latestCiRun?.conclusion ?? latestCiRun?.status ?? '—'}
                    </td>
                    <td>
                      {latestCiRun
                        ? `${latestCiRun.name} • ${latestCiRun.updatedAt ? new Date(latestCiRun.updatedAt).toLocaleString('pt-BR') : '—'}`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>API/DB Health</td>
                    <td>
                      {healthLoading
                        ? 'Carregando...'
                        : healthError
                          ? 'Indisponível'
                          : healthStatus?.status ?? '—'}
                    </td>
                    <td>
                      {!healthLoading && !healthError && healthStatus
                        ? `DB ${healthStatus.database} • Version ${healthStatus.version ?? '—'}`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'monitoramento-sonar' && (
          <section>
            <h2>SonarCloud</h2>
            {sonarLoading && <p>Carregando dados do SonarCloud...</p>}
            {sonarError && <p>{sonarError}</p>}
            {!sonarLoading && !sonarError && sonarSummary && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Technical Health Score</th>
                      <th>Total Bugs</th>
                      <th>Major/Critical</th>
                      <th>Quality Gate</th>
                      <th>Último Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{Math.max(0, 100 - (sonarSummary.metrics.bugs * 5 + sonarSummary.metrics.vulnerabilities * 8 + sonarSummary.metrics.codeSmells * 1 + Number(sonarSummary.metrics.duplicatedLinesDensity || 0) * 2))}</td>
                      <td>{sonarSummary.metrics.bugs}</td>
                      <td>{sonarIssues.filter((issue) => issue.severity === 'MAJOR' || issue.severity === 'CRITICAL').length}</td>
                      <td>{sonarSummary.qualityGateStatus}</td>
                      <td>{sonarSummary.qualityGateStatus}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <h4>Issues (Major/Critical)</h4>
              <div className="admin-actions" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <button className="admin-btn" onClick={handleResolveBatch} disabled={hktechAiLoading}>
                  Resolve {maxIssuesPerRun} Major Issues
                </button>
              </div>
              {!sonarLoading && sonarIssues.length === 0 && <p>Nenhuma issue crítica encontrada.</p>}
              {sonarIssues.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Severidade</th>
                        <th>Tipo</th>
                        <th>Mensagem</th>
                        <th>Risk Level</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sonarIssues.map((issue) => (
                        <tr key={issue.key}>
                          <td>{issue.severity}</td>
                          <td>{issue.type}</td>
                          <td>{issue.message}</td>
                          <td>
                            <span className={`sonar-risk sonar-risk--${issue.riskLevel?.toLowerCase() || 'medium'}`}>
                              {issue.riskLevel ?? 'MEDIUM'}
                            </span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button className="admin-btn admin-btn--ghost" onClick={() => handleSimulateIssue(issue)}>
                                Simulate
                              </button>
                              <button className="admin-btn" disabled={issue.riskLevel === 'HIGH'} onClick={() => handleResolveIssue(issue)}>
                                Resolve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'monitoramento-coverage' && (
          <section>
            <h2>Test Coverage</h2>
            {sonarLoading && <p>Carregando métricas...</p>}
            {sonarError && <p>{sonarError}</p>}
            {!sonarLoading && !sonarError && sonarSummary && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Coverage</th>
                      <th>Bugs</th>
                      <th>Code Smells</th>
                      <th>Duplicated Lines</th>
                      <th>Quality Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{sonarSummary.metrics.coverage}%</td>
                      <td>{sonarSummary.metrics.bugs}</td>
                      <td>{sonarSummary.metrics.codeSmells}</td>
                      <td>{sonarSummary.metrics.duplicatedLinesDensity}%</td>
                      <td>{sonarSummary.qualityGateStatus}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'monitoramento-ci' && (
          <section>
            <h2>CI Status</h2>
            {ciLoading && <p>Carregando status do CI...</p>}
            {ciError && <p>{ciError}</p>}
            {!ciLoading && !ciError && ciStatus && ciStatus.runs.length > 0 && (
              <div className="report-summary">
                <div className="report-card">
                  <span>Último build</span>
                  <strong>{ciStatus.runs[0].conclusion ?? ciStatus.runs[0].status}</strong>
                </div>
                <div className="report-card">
                  <span>Status</span>
                  <strong>{ciStatus.runs[0].status}</strong>
                </div>
                <div className="report-card">
                  <span>Branch</span>
                  <strong>{ciStatus.runs[0].headBranch}</strong>
                </div>
              </div>
            )}
            {!ciLoading && !ciError && ciStatus && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Conclusion</th>
                      <th>Branch</th>
                      <th>Atualizado</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciStatus.runs.map((run) => (
                      <tr key={run.id}>
                        <td>{run.name}</td>
                        <td>{run.status}</td>
                        <td>{run.conclusion ?? '—'}</td>
                        <td>{run.headBranch}</td>
                        <td>{run.updatedAt ? new Date(run.updatedAt).toLocaleString('pt-BR') : '—'}</td>
                        <td>
                          <a href={run.htmlUrl} target="_blank" rel="noreferrer">Abrir</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!ciLoading && !ciError && (!ciStatus || ciStatus.runs.length === 0) && (
              <p>Nenhuma execução recente encontrada.</p>
            )}
          </section>
        )}

        {activeTab === 'ia-hktech' && isAdmin && (
          <section>
            <h2>HKTECH IA</h2>
            <p>Controle de desenvolvimento autônomo e logs de execução.</p>
            {hktechAiError && <p>{hktechAiError}</p>}
            {iaConfigError && <p>{iaConfigError}</p>}
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 12 }}>
              <h4>Orquestrador Ativo</h4>
              {activeOrchestrator ? (
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>{activeOrchestrator.name}</strong>
                  <span>Versão: v{activeOrchestrator.version ?? 1}</span>
                  <span>Atualizado: {activeOrchestrator.updated_at ? new Date(activeOrchestrator.updated_at).toLocaleString('pt-BR') : '—'}</span>
                </div>
              ) : (
                <p>Nenhum orquestrador ativo.</p>
              )}
            </div>
            <div className="report-summary" style={{ marginTop: 12 }}>
              <div className="report-card">
                <span>Tasks IA (total)</span>
                <strong>{aiTasks.length}</strong>
              </div>
              <div className="report-card">
                <span>Em progresso</span>
                <strong>{aiTasks.filter((task) => normalizeIaStatus(task.status) === 'IN_PROGRESS').length}</strong>
              </div>
              <div className="report-card">
                <span>Bloqueadas</span>
                <strong>{aiTasks.filter((task) => normalizeIaStatus(task.status) === 'BLOCKED').length}</strong>
              </div>
              <div className="report-card">
                <span>Última execução</span>
                <strong>{aiReports[0]?.createdAt ? new Date(aiReports[0].createdAt).toLocaleString('pt-BR') : '—'}</strong>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
              <div className="admin-table-wrapper" style={{ padding: 16 }}>
                <h4>Conversas IA</h4>
                <div className="admin-actions" style={{ gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Título da conversa"
                    value={newConversationTitle}
                    onChange={(e) => setNewConversationTitle(e.target.value)}
                  />
                  <button className="admin-btn" onClick={handleCreateConversation}>
                    Nova conversa
                  </button>
                </div>
                {iaConversationsLoading && <p>Carregando conversas...</p>}
                {iaConversationsError && <p>{iaConversationsError}</p>}
                <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gap: 8 }}>
                  {iaConversations.map((conv) => (
                    <button
                      key={conv.id}
                      className={`admin-btn ${selectedConversationId === conv.id ? '' : 'admin-btn--ghost'}`}
                      onClick={() => setSelectedConversationId(conv.id)}
                    >
                      {conv.title || 'Conversa'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-table-wrapper" style={{ padding: 16 }}>
                <h4>Chat HK IA</h4>
                {iaMessagesLoading && <p>Carregando mensagens...</p>}
                {iaMessagesError && <p>{iaMessagesError}</p>}
                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 12 }}>
                  {iaMessages.map((msg) => (
                    <div key={msg.id} style={{ padding: 8, borderRadius: 8, background: msg.role === 'assistant' ? '#f5f7ff' : '#f3f4f6' }}>
                      <strong style={{ marginRight: 6 }}>{msg.role}</strong>
                      <span>{msg.content}</span>
                    </div>
                  ))}
                </div>
                <div className="admin-actions" style={{ gap: 8 }}>
                  <textarea
                    rows={3}
                    placeholder="Digite sua mensagem"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="admin-btn" onClick={handleSendChat} disabled={chatSending}>
                    {chatSending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h4>Trigger de Agentes</h4>
              <div className="admin-actions" style={{ gap: 8, flexWrap: 'wrap' }}>
                <select value={selectedAgentToExecute} onChange={(e) => setSelectedAgentToExecute(e.target.value)}>
                  <option value="">Selecione um agente</option>
                  {iaAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
                <button className="admin-btn" disabled={!selectedAgentToExecute} onClick={() => handleExecuteAgent(selectedAgentToExecute)}>
                  Executar agente
                </button>
              </div>
              {agentExecutionResult && (
                <p style={{ marginTop: 8 }}>Task criada: {agentExecutionResult.task?.id}</p>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ marginBottom: 16 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Modo</th>
                    <th>Max Issues/Run</th>
                    <th>Max Execuções/Hora</th>
                    <th>Cooldown (min)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <select value={automationMode} onChange={(e) => setAutomationMode(e.target.value as typeof automationMode)}>
                        <option value="manual">Manual</option>
                        <option value="semi">Semi-Automatic</option>
                        <option value="controlled">Controlled Automatic</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" min={1} max={20} value={maxIssuesPerRun} onChange={(e) => setMaxIssuesPerRun(Number(e.target.value || 1))} />
                    </td>
                    <td>
                      <input type="number" min={1} max={10} value={maxExecutionsPerHour} onChange={(e) => setMaxExecutionsPerHour(Number(e.target.value || 1))} />
                    </td>
                    <td>
                      <input type="number" min={5} max={120} value={cooldownMinutes} onChange={(e) => setCooldownMinutes(Number(e.target.value || 5))} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="admin-actions" style={{ flexWrap: 'wrap', gap: 12 }}>
              <button className="admin-btn admin-btn--ghost" onClick={handleSaveIaConfig} disabled={iaConfigLoading}>
                {iaConfigLoading ? 'Salvando...' : 'Salvar Config IA'}
              </button>
              <button className="admin-btn" onClick={handleRunHKTechFix} disabled={hktechAiLoading}>
                {hktechAiLoading ? 'Executando...' : 'Run Autonomous Fix'}
              </button>
            </div>
            {iaConfig && (
              <p style={{ marginTop: 8 }}>Config carregada: {iaConfig.managedByAI ? 'Managed by AI' : 'Manual'}</p>
            )}

            {hktechAiResult && (
              <div style={{ marginTop: 16 }}>
                <h4>Status</h4>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Resultado</th>
                        <th>Quality Gate</th>
                        <th>Branch</th>
                        <th>PR</th>
                        <th>Risco</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{hktechAiResult.status.toUpperCase()} {hktechAiResult.reason ? `- ${hktechAiResult.reason}` : ''}</td>
                        <td>{hktechAiResult.qualityGate ?? '—'}</td>
                        <td>{hktechAiResult.branchName ?? '—'}</td>
                        <td>{hktechAiResult.prLink ?? '—'}</td>
                        <td>{hktechAiResult.plan?.risk ?? '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {hktechAiResult.plan && (
                  <>
                    <h4>Plano de Correção</h4>
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Etapas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hktechAiResult.plan.steps.map((step) => (
                            <tr key={step}>
                              <td>{step}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <h4>Sonar Issues Atuais</h4>
              {!sonarLoading && sonarIssues.length === 0 && <p>Sem issues críticas no momento.</p>}
              {sonarIssues.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Severidade</th>
                        <th>Tipo</th>
                        <th>Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sonarIssues.map((issue) => (
                        <tr key={issue.key}>
                          <td>{issue.severity}</td>
                          <td>{issue.type}</td>
                          <td>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Autonomous Tasks</h4>
              {aiReports.length === 0 && <p>Sem tarefas registradas.</p>}
              {aiReports.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Task ID</th>
                        <th>Origem</th>
                        <th>Issue Key</th>
                        <th>Risk Level</th>
                        <th>Branch</th>
                        <th>PR</th>
                        <th>Status</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiReports.slice(0, 10).map((report) => (
                        <tr key={report.id}>
                          <td>{report.id}</td>
                          <td>Sonar</td>
                          <td>{report.issueKeys?.[0] ?? '—'}</td>
                          <td>{report.riskClassification ?? '—'}</td>
                          <td>{report.prLink ? report.prLink.split('/').slice(-2, -1)[0] : '—'}</td>
                          <td>{report.prLink ?? '—'}</td>
                          <td>{report.status ?? '—'}</td>
                          <td>{report.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Última execução</h4>
              {aiReportsLoading && <p>Carregando logs...</p>}
              {!aiReportsLoading && aiReports.length === 0 && <p>Sem logs recentes.</p>}
              {aiReports.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Resumo</th>
                        <th>Issues</th>
                        <th>Arquivos</th>
                        <th>PR</th>
                        <th>Quality Gate</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>{aiReports[0].summary}</strong></td>
                        <td>{aiReports[0].issueKeys?.join(', ') ?? '—'}</td>
                        <td>{aiReports[0].filesModified?.join(', ') ?? '—'}</td>
                        <td>{aiReports[0].prLink ?? '—'}</td>
                        <td>{aiReports[0].qualityGate ?? '—'}</td>
                        <td>{aiReports[0].confidenceScore ?? '—'}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Execution History</h4>
              {aiReports.length === 0 && <p>Sem histórico.</p>}
              {aiReports.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Issues</th>
                        <th>Build</th>
                        <th>Quality Gate</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiReports.slice(0, 10).map((report) => (
                        <tr key={report.id}>
                          <td>{report.createdAt ?? '—'}</td>
                          <td>{report.issueKeys?.join(', ') ?? '—'}</td>
                          <td>{report.buildResult ?? '—'}</td>
                          <td>{report.qualityGate ?? '—'}</td>
                          <td>{report.confidenceScore ?? '—'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'ia-tasks' && isAdmin && (
          <section>
            <h2>Tasks IA</h2>
            <div className="admin-table-wrapper" style={{ padding: 16, marginBottom: 16 }}>
              <h4>Criar Task IA</h4>
              <div className="admin-modal__form">
                <label>
                  <span>Título</span>
                  <input
                    type="text"
                    value={iaTaskForm.title}
                    onChange={(e) => setIaTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Descrição</span>
                  <textarea
                    rows={3}
                    value={iaTaskForm.description}
                    onChange={(e) => setIaTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select value={iaTaskForm.status} onChange={(e) => setIaTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="DONE">DONE</option>
                  </select>
                </label>
                <label>
                  <span>Agente</span>
                  <select value={iaTaskForm.linkedAgentId} onChange={(e) => setIaTaskForm((prev) => ({ ...prev, linkedAgentId: e.target.value }))}>
                    <option value="">Sem agente</option>
                    {iaAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Especialidade</span>
                  <input
                    type="text"
                    value={iaTaskForm.specialistType}
                    onChange={(e) => setIaTaskForm((prev) => ({ ...prev, specialistType: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Contexto</span>
                  <input
                    type="text"
                    value={iaTaskForm.contextReference}
                    onChange={(e) => setIaTaskForm((prev) => ({ ...prev, contextReference: e.target.value }))}
                  />
                </label>
              </div>
              <div className="admin-actions" style={{ marginTop: 12 }}>
                <button className="admin-btn" onClick={handleCreateIaTask}>Criar Task</button>
              </div>
            </div>
            <div className="admin-actions" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <label>
                <span>Status</span>
                <select value={iaTasksStatusFilter} onChange={(e) => setIaTasksStatusFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="REVIEW">REVIEW</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="DONE">DONE</option>
                </select>
              </label>
              <div style={{ alignSelf: 'flex-end' }}>
                {filteredIaTasks.length} tasks
              </div>
            </div>
            {aiTasksLoading && <p>Carregando tarefas...</p>}
            {aiTasksError && <p>{aiTasksError}</p>}
            {!aiTasksLoading && !aiTasksError && filteredIaTasks.length === 0 && <p>Sem tarefas de IA no momento.</p>}
            {filteredIaTasks.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Origem</th>
                      <th>Agente</th>
                      <th>Especialista</th>
                      <th>Risco</th>
                      <th>Status</th>
                      <th>PR</th>
                      <th>Confiança</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedIaTasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.title || '—'}</td>
                        <td>{task.origin || (task.generatedByAI ? 'Automation' : 'Manual') || '—'}</td>
                        <td>{iaAgents.find((agent) => agent.id === task.linkedAgentId)?.name || '—'}</td>
                        <td>{task.specialistType || '—'}</td>
                        <td>
                          {task.riskLevel ? (
                            <span className={`sonar-risk sonar-risk--${String(task.riskLevel).toLowerCase()}`}>
                              {task.riskLevel}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{normalizeIaStatus(task.status) || '—'}</td>
                        <td>
                          {task.prLink ? (
                            <a href={task.prLink} target="_blank" rel="noreferrer">{task.prLink}</a>
                          ) : '—'}
                        </td>
                        <td>{typeof task.confidenceScore === 'number' ? `${task.confidenceScore}%` : '—'}</td>
                        <td>{task.executionResult ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="admin-actions" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    className="admin-btn admin-btn--ghost"
                    disabled={iaTasksPage <= 1}
                    onClick={() => setIaTasksPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </button>
                  <span>{iaTasksPage} / {iaTasksTotalPages}</span>
                  <button
                    className="admin-btn admin-btn--ghost"
                    disabled={iaTasksPage >= iaTasksTotalPages}
                    onClick={() => setIaTasksPage((prev) => Math.min(iaTasksTotalPages, prev + 1))}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'ia-agents' && isAdmin && (
          <section>
            <h2>Agentes IA</h2>
            {iaAgentsError && <p>{iaAgentsError}</p>}
            <div className="admin-table-wrapper" style={{ padding: 16, marginBottom: 16 }}>
              <h4>{editingAgentId ? 'Editar agente' : 'Criar agente'}</h4>
              <div className="admin-modal__form">
                <label>
                  <span>Nome</span>
                  <input type="text" value={agentForm.name} onChange={(e) => setAgentForm((prev) => ({ ...prev, name: e.target.value }))} />
                </label>
                <label>
                  <span>Descrição</span>
                  <textarea rows={3} value={agentForm.description} onChange={(e) => setAgentForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <label>
                  <span>Especialidade</span>
                  <input type="text" value={agentForm.specialty} onChange={(e) => setAgentForm((prev) => ({ ...prev, specialty: e.target.value }))} />
                </label>
                <label>
                  <span>System Prompt</span>
                  <textarea rows={3} value={agentForm.system_prompt} onChange={(e) => setAgentForm((prev) => ({ ...prev, system_prompt: e.target.value }))} />
                </label>
                <label>
                  <span>Autonomia</span>
                  <input type="text" value={agentForm.autonomy_level} onChange={(e) => setAgentForm((prev) => ({ ...prev, autonomy_level: e.target.value }))} />
                </label>
                <label>
                  <span>Ativo</span>
                  <select value={agentForm.is_active ? 'true' : 'false'} onChange={(e) => setAgentForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </label>
              </div>
              <div className="admin-actions" style={{ marginTop: 12 }}>
                <button className="admin-btn" onClick={handleSaveAgent}>{editingAgentId ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
            {iaAgentsLoading && <p>Carregando agentes...</p>}
            {!iaAgentsLoading && iaAgents.length === 0 && <p>Sem agentes cadastrados.</p>}
            {iaAgents.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Especialidade</th>
                      <th>Autonomia</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iaAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td>{agent.name}</td>
                        <td>{agent.specialty || '—'}</td>
                        <td>{agent.autonomy_level || '—'}</td>
                        <td>{agent.is_active ? 'Ativo' : 'Inativo'}</td>
                        <td>
                          <div className="admin-actions">
                            <button className="admin-btn admin-btn--ghost" onClick={() => {
                              setEditingAgentId(agent.id);
                              setAgentForm({
                                name: agent.name,
                                description: agent.description || '',
                                specialty: agent.specialty || '',
                                system_prompt: agent.system_prompt || '',
                                autonomy_level: agent.autonomy_level || 'manual',
                                is_active: agent.is_active ?? true,
                              });
                            }}>
                              Editar
                            </button>
                            <button className="admin-btn" onClick={() => handleExecuteAgent(agent.id)}>
                              Executar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'ia-orchestrator' && isAdmin && (
          <section>
            <h2>Orquestrador IA</h2>
            {iaOrchestratorsError && <p>{iaOrchestratorsError}</p>}
            <div className="report-summary" style={{ marginTop: 12 }}>
              <div className="report-card">
                <span>Contextos ativos</span>
                <strong>{orchestratorSummary?.activeContextsCount ?? 0}</strong>
              </div>
              <div className="report-card">
                <span>Agentes ativos</span>
                <strong>{orchestratorSummary?.activeAgentsCount ?? 0}</strong>
              </div>
              <div className="report-card">
                <span>Versão ativa</span>
                <strong>{activeOrchestratorRecord ? `v${activeOrchestratorRecord.version ?? 1}` : '—'}</strong>
              </div>
              <div className="report-card">
                <span>Última execução</span>
                <strong>{latestOrchestratorExecution?.created_at ? new Date(latestOrchestratorExecution.created_at).toLocaleString('pt-BR') : '—'}</strong>
              </div>
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>SystemConfig Flags</h4>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Flag</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>managedByAI</td>
                    <td>{String(orchestratorSummary?.systemFlags?.managedByAI ?? false)}</td>
                  </tr>
                  <tr>
                    <td>taskCreationPolicy</td>
                    <td>{orchestratorSummary?.systemFlags?.taskCreationPolicy ?? '—'}</td>
                  </tr>
                  <tr>
                    <td>allowAutoBacklogIfEmpty</td>
                    <td>{String(orchestratorSummary?.systemFlags?.allowAutoBacklogIfEmpty ?? false)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>Agentes ativos</h4>
              {!orchestratorSummary?.activeAgents || orchestratorSummary.activeAgents.length === 0 ? (
                <p>Sem agentes ativos.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Especialidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orchestratorSummary.activeAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td>{agent.name}</td>
                        <td>{agent.specialty || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <div className="admin-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Supreme Prompt</h4>
                <button
                  className="admin-btn admin-btn--ghost"
                  onClick={async () => {
                    if (!activeOrchestratorRecord) return;
                    setSupremePromptModal(activeOrchestratorRecord);
                    await loadOrchestratorContent(activeOrchestratorRecord.id);
                  }}
                  disabled={!activeOrchestratorRecord?.storage_url}
                >
                  Ver Supreme Prompt
                </button>
              </div>
              {!activeOrchestratorRecord && <p>Nenhum orquestrador ativo.</p>}
              {activeOrchestratorRecord && (
                <div style={{ marginTop: 8 }}>
                  <strong>{activeOrchestratorRecord.name}</strong>
                </div>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>Execution Flow</h4>
              {executionFlowList.length === 0 && <p>Sem etapas configuradas.</p>}
              {executionFlowList.length > 0 && (
                <ol style={{ paddingLeft: 20, display: 'grid', gap: 4 }}>
                  {executionFlowList.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>Última execução - Steps</h4>
              {!latestOrchestratorExecution && <p>Sem execuções registradas.</p>}
              {latestOrchestratorExecution && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Status</th>
                      <th>Tempo (ms)</th>
                      <th>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrchestratorExecution.steps_executed?.map((step) => (
                      <tr key={step.step}>
                        <td>{step.step}</td>
                        <td>{step.status}</td>
                        <td>{step.execution_time_ms ?? 0}</td>
                        <td>{step.token_usage ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>Execuções</h4>
              {orchestratorExecutionsError && <p>{orchestratorExecutionsError}</p>}
              {orchestratorExecutionsLoading && <p>Carregando execuções...</p>}
              {!orchestratorExecutionsLoading && orchestratorExecutions.length === 0 && <p>Sem execuções registradas.</p>}
              {orchestratorExecutions.length > 0 && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Versão</th>
                      <th>Tokens</th>
                      <th>Tempo (ms)</th>
                      <th>Memória</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orchestratorExecutions.map((exec) => (
                      <tr key={exec.id}>
                        <td>{exec.created_at ? new Date(exec.created_at).toLocaleString('pt-BR') : '—'}</td>
                        <td>{exec.status ?? '—'}</td>
                        <td>v{exec.version ?? 1}</td>
                        <td>{exec.token_usage ?? 0}</td>
                        <td>{exec.execution_time ?? 0}</td>
                        <td>{exec.memory_retrieved_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginBottom: 16 }}>
              <h4>{editingOrchestratorId ? 'Editar orquestrador' : 'Criar orquestrador'}</h4>
              <div className="admin-modal__form">
                <label>
                  <span>Nome</span>
                  <input
                    type="text"
                    value={orchestratorForm.name}
                    onChange={(e) => setOrchestratorForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Supreme Prompt</span>
                  <textarea
                    rows={6}
                    value={orchestratorForm.supreme_prompt}
                    onChange={(e) => setOrchestratorForm((prev) => ({ ...prev, supreme_prompt: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Execution Flow (JSON)</span>
                  <textarea
                    rows={6}
                    value={orchestratorForm.execution_flow}
                    onChange={(e) => setOrchestratorForm((prev) => ({ ...prev, execution_flow: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Ativo</span>
                  <select
                    value={orchestratorForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setOrchestratorForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </label>
              </div>
              <div className="admin-actions" style={{ marginTop: 12 }}>
                <button className="admin-btn" onClick={handleSaveOrchestrator}>
                  {editingOrchestratorId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
            {iaOrchestratorsLoading && <p>Carregando orquestradores...</p>}
            {!iaOrchestratorsLoading && iaOrchestrators.length === 0 && <p>Sem orquestradores cadastrados.</p>}
            {iaOrchestrators.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Versão</th>
                      <th>Status</th>
                      <th>Atualizado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iaOrchestrators.map((orchestrator) => (
                      <tr key={orchestrator.id}>
                        <td>{orchestrator.name}</td>
                        <td>v{orchestrator.version ?? 1}</td>
                        <td>{orchestrator.is_active ? 'Ativo' : 'Inativo'}</td>
                        <td>{orchestrator.updated_at ? new Date(orchestrator.updated_at).toLocaleString() : '—'}</td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="admin-btn admin-btn--ghost"
                              onClick={async () => {
                                setEditingOrchestratorId(orchestrator.id);
                                setOrchestratorForm({
                                  name: orchestrator.name,
                                  supreme_prompt: '',
                                  execution_flow: JSON.stringify(orchestrator.execution_flow || [], null, 2),
                                  is_active: orchestrator.is_active ?? true,
                                });
                                await loadOrchestratorContent(orchestrator.id);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="admin-btn"
                              onClick={() => handleActivateOrchestrator(orchestrator.id)}
                              disabled={orchestrator.is_active}
                            >
                              Ativar
                            </button>
                            <button
                              className="admin-btn admin-btn--ghost"
                              onClick={() => {
                                if (!orchestrator.id) return;
                                loadOrchestratorContent(orchestrator.id).then((data) => {
                                  if (!data?.content) return;
                                  navigator.clipboard.writeText(data.content).catch((error) => {
                                    console.error('Erro ao copiar Supreme Prompt:', error);
                                    setIaOrchestratorsError('Não foi possível copiar o Supreme Prompt.');
                                  });
                                });
                              }}
                            >
                              Copiar Supreme Prompt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {supremePromptModal && (
              <div className="admin-modal-backdrop" onClick={() => {
                setSupremePromptModal(null);
                setSupremePromptContent(null);
              }}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Supreme Prompt</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => {
                      setSupremePromptModal(null);
                      setSupremePromptContent(null);
                    }}>Fechar</button>
                  </div>
                  <div className="admin-modal__form">
                    <label>
                      <span>Orquestrador</span>
                      <input type="text" value={supremePromptModal.name} readOnly />
                    </label>
                    <label>
                      <span>Prompt</span>
                      <textarea rows={16} value={supremePromptContent?.content || ''} readOnly />
                    </label>
                    {supremePromptLoading && <p>Carregando conteúdo...</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'ia-context' && isAdmin && (
          <section>
            <h2>Contextos IA</h2>
            {iaContextsError && <p>{iaContextsError}</p>}
            <div className="admin-table-wrapper" style={{ padding: 16, marginBottom: 16 }}>
              <h4>{editingContextId ? 'Editar contexto' : 'Criar contexto'}</h4>
              <div className="admin-modal__form">
                <label>
                  <span>Título</span>
                  <input type="text" value={contextForm.title} onChange={(e) => setContextForm((prev) => ({ ...prev, title: e.target.value }))} />
                </label>
                <label>
                  <span>Conteúdo</span>
                  <textarea rows={4} value={contextForm.content} onChange={(e) => setContextForm((prev) => ({ ...prev, content: e.target.value }))} />
                </label>
                <label>
                  <span>Tipo</span>
                  <input type="text" value={contextForm.context_type} onChange={(e) => setContextForm((prev) => ({ ...prev, context_type: e.target.value }))} />
                </label>
                <label>
                  <span>Agente relacionado</span>
                  <select value={contextForm.related_agent_id} onChange={(e) => setContextForm((prev) => ({ ...prev, related_agent_id: e.target.value }))}>
                    <option value="">Nenhum</option>
                    {iaAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-actions" style={{ marginTop: 12 }}>
                <button className="admin-btn" onClick={handleSaveContext}>{editingContextId ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
            {iaContextsLoading && <p>Carregando contextos...</p>}
            {!iaContextsLoading && iaContexts.length === 0 && <p>Sem contextos cadastrados.</p>}
            {iaContexts.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Agente</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iaContexts.map((ctx) => (
                      <tr key={ctx.id}>
                        <td>{ctx.title}</td>
                        <td>{ctx.context_type || '—'}</td>
                        <td>{iaAgents.find((agent) => agent.id === ctx.related_agent_id)?.name || '—'}</td>
                        <td>
                          <div className="admin-actions">
                            <button className="admin-btn admin-btn--ghost" onClick={() => setViewingContext(ctx)}>
                              Ver
                            </button>
                            <button className="admin-btn admin-btn--ghost" onClick={() => {
                              setEditingContextId(ctx.id);
                              setContextForm({
                                title: ctx.title,
                                content: ctx.content,
                                context_type: ctx.context_type || '',
                                related_agent_id: ctx.related_agent_id || '',
                              });
                            }}>
                              Editar
                            </button>
                            <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteContext(ctx.id)}>
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <h3>Prompt Library</h3>
              {iaPromptsError && <p>{iaPromptsError}</p>}
              <div className="admin-actions" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <label>
                  <span>Categoria</span>
                  <select value={iaPromptsCategory} onChange={(e) => setIaPromptsCategory(e.target.value)}>
                    <option value="">Todas</option>
                    <option value="orchestrator">orchestrator</option>
                    <option value="system">system</option>
                    <option value="architecture">architecture</option>
                    <option value="security">security</option>
                    <option value="workflow">workflow</option>
                    <option value="bootstrap">bootstrap</option>
                    <option value="mybot">mybot</option>
                    <option value="governance">governance</option>
                  </select>
                </label>
                <button className="admin-btn" onClick={loadIaPrompts} disabled={iaPromptsLoading}>
                  {iaPromptsLoading ? 'Carregando...' : 'Atualizar'}
                </button>
                <button className="admin-btn admin-btn--ghost" onClick={handleExportPrompts}>
                  Exportar Prompts
                </button>
              </div>
              {iaPrompts.length === 0 && !iaPromptsLoading && <p>Sem prompts cadastrados.</p>}
              {iaPrompts.length > 0 && (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Categoria</th>
                        <th>Versão</th>
                        <th>Memória</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iaPrompts.map((prompt) => (
                        <tr key={prompt.id}>
                          <td>{prompt.title}</td>
                          <td>{prompt.category}</td>
                          <td>v{prompt.version ?? 1}</td>
                          <td>{prompt.memory_count ?? 0}</td>
                          <td>
                            <div className="admin-actions">
                              <button className="admin-btn admin-btn--ghost" onClick={() => handleSelectPrompt(prompt.id)}>
                                Ver/Editar
                              </button>
                              <button className="admin-btn" onClick={() => handleReembedPrompt(prompt.id)}>
                                Re-embed
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {selectedPrompt && (
              <div className="admin-modal-backdrop" onClick={() => {
                setSelectedPrompt(null);
                setPromptVersions([]);
              }}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Editar Prompt</h3>
                    <button
                      className="admin-btn admin-btn--ghost"
                      onClick={() => {
                        setSelectedPrompt(null);
                        setPromptVersions([]);
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="admin-modal__form">
                    <label>
                      <span>Título</span>
                      <input type="text" value={promptForm.title} onChange={(e) => setPromptForm((prev) => ({ ...prev, title: e.target.value }))} />
                    </label>
                    <label>
                      <span>Categoria</span>
                      <input type="text" value={promptForm.category} onChange={(e) => setPromptForm((prev) => ({ ...prev, category: e.target.value }))} />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <input type="text" value={promptForm.description} onChange={(e) => setPromptForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </label>
                    <label>
                      <span>Conteúdo</span>
                      <textarea rows={10} value={promptForm.content} onChange={(e) => setPromptForm((prev) => ({ ...prev, content: e.target.value }))} />
                    </label>
                    <label>
                      <span>Ativo</span>
                      <select value={promptForm.is_active ? 'true' : 'false'} onChange={(e) => setPromptForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}>
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </label>
                    <label>
                      <span>Re-embed</span>
                      <select value={promptForm.reembed ? 'true' : 'false'} onChange={(e) => setPromptForm((prev) => ({ ...prev, reembed: e.target.value === 'true' }))}>
                        <option value="false">Não</option>
                        <option value="true">Sim</option>
                      </select>
                    </label>
                    <div>
                      <h4>Histórico de versões</h4>
                      {promptVersionsError && <p>{promptVersionsError}</p>}
                      {promptVersionsLoading && <p>Carregando versões...</p>}
                      {!promptVersionsLoading && promptVersions.length === 0 && <p>Sem versões registradas.</p>}
                      {promptVersions.length > 0 && (
                        <div className="admin-table-wrapper" style={{ marginTop: 8 }}>
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Versão</th>
                                <th>Storage</th>
                                <th>Criado em</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {promptVersions.map((version) => (
                                <tr key={version.id}>
                                  <td>v{version.version}</td>
                                  <td>
                                    {version.storage_url ? (
                                      <a href={version.storage_url} target="_blank" rel="noreferrer">Abrir</a>
                                    ) : '—'}
                                  </td>
                                  <td>{version.created_at ? new Date(version.created_at).toLocaleString() : '—'}</td>
                                  <td>
                                    <button
                                      className="admin-btn admin-btn--ghost"
                                      onClick={() => selectedPrompt && handleActivatePromptVersion(selectedPrompt.id, version.version)}
                                    >
                                      Ativar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-modal__footer">
                    <button
                      className="admin-btn admin-btn--ghost"
                      onClick={() => {
                        setSelectedPrompt(null);
                        setPromptVersions([]);
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="admin-btn" onClick={handleSavePrompt}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
            {viewingContext && (
              <div className="admin-modal-backdrop" onClick={() => setViewingContext(null)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>Visualizar contexto</h3>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setViewingContext(null)}>Fechar</button>
                  </div>
                  <div className="admin-modal__form">
                    <label>
                      <span>Título</span>
                      <input type="text" value={viewingContext.title} readOnly />
                    </label>
                    <label>
                      <span>Tipo</span>
                      <input type="text" value={viewingContext.context_type || ''} readOnly />
                    </label>
                    <label>
                      <span>Conteúdo</span>
                      <textarea rows={12} value={viewingContext.content} readOnly />
                    </label>
                  </div>
                  <div className="admin-modal__footer">
                    <button className="admin-btn" onClick={() => setViewingContext(null)}>Fechar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'ia-memory' && isAdmin && (
          <section>
            <h2>Memória IA</h2>
            {iaMemoryError && <p>{iaMemoryError}</p>}
            {iaMemoryLoading && <p>Carregando memória...</p>}
            <div className="report-summary" style={{ marginTop: 12 }}>
              <div className="report-card">
                <span>Total embeddings</span>
                <strong>{iaMemoryStats?.total ?? 0}</strong>
              </div>
              <div className="report-card">
                <span>Tokens estimados</span>
                <strong>{iaMemoryStats?.tokenEstimate ?? 0}</strong>
              </div>
            </div>
            <div className="admin-table-wrapper" style={{ padding: 16, marginTop: 16 }}>
              <h4>Buscar memória</h4>
              <div className="admin-actions" style={{ gap: 8 }}>
                <input
                  type="text"
                  placeholder="Pergunta ou contexto"
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                />
                <button className="admin-btn" onClick={handleMemorySearch} disabled={memorySearchLoading}>
                  {memorySearchLoading ? 'Buscando...' : 'Buscar'}
                </button>
                <button className="admin-btn admin-btn--ghost" onClick={handleCreateMemory}>
                  Salvar como memória
                </button>
              </div>
              {memorySearchResults.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4>Resultados</h4>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Conteúdo</th>
                          <th>Tipo</th>
                          <th>Distância</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memorySearchResults.map((item) => (
                          <tr key={item.id}>
                            <td>{item.content}</td>
                            <td>{item.context_type || '—'}</td>
                            <td>{typeof item.distance === 'number' ? item.distance.toFixed(4) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {iaMemoryStats?.byType && iaMemoryStats.byType.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4>Categorias</h4>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iaMemoryStats.byType.map((row: { context_type: string; count: number }) => (
                          <tr key={row.context_type || 'default'}>
                            <td>{row.context_type || '—'}</td>
                            <td>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'monitoramento-executions' && (
          <section>
            <h2>Execuções</h2>
            {aiReportsLoading && <p>Carregando execuções...</p>}
            {!aiReportsLoading && aiReports.length === 0 && <p>Sem execuções registradas.</p>}
            {aiReports.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Issues</th>
                      <th>Build</th>
                      <th>Quality Gate</th>
                      <th>Confidence</th>
                      <th>PR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiReports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.createdAt ?? '—'}</td>
                        <td>{report.issueKeys?.join(', ') ?? '—'}</td>
                        <td>{report.buildResult ?? '—'}</td>
                        <td>{report.qualityGate ?? '—'}</td>
                        <td>{report.confidenceScore ?? '—'}%</td>
                        <td>{report.prLink ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'monitoramento-health' && (
          <section>
            <h2>Saúde Técnica</h2>
            {sonarLoading && <p>Carregando métricas...</p>}
            {sonarError && <p>{sonarError}</p>}
            {!sonarLoading && !sonarError && sonarSummary && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Technical Health Score</th>
                      <th>Bugs</th>
                      <th>Major/Critical</th>
                      <th>Duplications %</th>
                      <th>Coverage %</th>
                      <th>Quality Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{Math.max(0, 100 - (sonarSummary.metrics.bugs * 5 + sonarSummary.metrics.vulnerabilities * 8 + sonarSummary.metrics.codeSmells * 1 + Number(sonarSummary.metrics.duplicatedLinesDensity || 0) * 2))}</td>
                      <td>{sonarSummary.metrics.bugs}</td>
                      <td>{sonarIssues.filter((issue) => issue.severity === 'MAJOR' || issue.severity === 'CRITICAL').length}</td>
                      <td>{sonarSummary.metrics.duplicatedLinesDensity}%</td>
                      <td>{sonarSummary.metrics.coverage}%</td>
                      <td>{sonarSummary.qualityGateStatus}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {simulateModalIssue && (
          <div className="admin-modal-backdrop" onClick={() => setSimulateModalIssue(null)}>
            <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal__header">
                <h3>Simulação – {simulateModalIssue.key}</h3>
                <button className="admin-btn admin-btn--ghost" onClick={() => setSimulateModalIssue(null)}>Fechar</button>
              </div>
              <div className="admin-modal__form">
                {simulateLoading && <p>Gerando simulação...</p>}
                {!simulateLoading && simulateResult && (
                  <>
                    <p><strong>Status:</strong> {simulateResult.status.toUpperCase()} {simulateResult.reason ? `- ${simulateResult.reason}` : ''}</p>
                    {simulateResult.plan && (
                      <div>
                        <p><strong>Risco:</strong> {simulateResult.plan.risk}</p>
                        <ul>
                          {simulateResult.plan.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {simulateResult.confidenceScore !== undefined && (
                      <p><strong>Confidence:</strong> {simulateResult.confidenceScore}%</p>
                    )}
                    <p><em>Simulação não aplica mudanças nem cria PR.</em></p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'projetos' && (
          <section>
            {isTemplateEditorRoute && templateEditorId && (
              <TemplateEditor
                templateId={templateEditorId}
                adminId={effectiveAdminId}
                onBack={() => navigate('/admin/projetos/templates')}
              />
            )}

            {isTemplateCreateRoute && (
              <div className="template-create">
                <div className="template-create__header">
                  <button className="admin-btn admin-btn--ghost" onClick={() => navigate('/admin/projetos/templates')}>Voltar</button>
                  <h2>Novo template</h2>
                  <button className="admin-btn" onClick={handleCreateTemplateFromRoute}>Criar</button>
                </div>
                {templateCreateError && <p className="admin-modal__error">{templateCreateError}</p>}
                <div className="template-create__form">
                  <label>
                    <span>Nome</span>
                    <input
                      value={templateCreateData.name}
                      onChange={(e) => setTemplateCreateData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Descrição</span>
                    <input
                      value={templateCreateData.description}
                      onChange={(e) => setTemplateCreateData((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Nível</span>
                    <select
                      value={templateCreateData.level}
                      onChange={(e) => setTemplateCreateData((prev) => ({ ...prev, level: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </label>
                  <label>
                    <span>Categoria</span>
                    <input
                      value={templateCreateData.category}
                      onChange={(e) => setTemplateCreateData((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Conteúdo</span>
                    <textarea
                      value={templateCreateData.blogContent}
                      onChange={(e) => setTemplateCreateData((prev) => ({ ...prev, blogContent: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            )}

            {!isTemplateEditorRoute && !isTemplateCreateRoute && (
              <>
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
                        isTemplate: projectsSubTab === 'templates',
                      });
                      setIsProjectModalOpen(true);
                    }}
                  >
                    {projectsSubTab === 'templates' ? 'Criar template' : 'Criar projeto'}
                  </button>
                  {projectsSubTab === 'templates' && (
                    <button className="admin-btn" onClick={() => navigate('/admin/projetos/templates/novo')}>Novo template (avançado)</button>
                  )}
                </div>

                {projectsSubTab === 'templates' && (
              <table className="admin-table admin-table--projects">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Versão</th>
                    <th>Status</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!projectsLoading && projects.filter((project) => project.isTemplate).length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhum template encontrado.</td>
                    </tr>
                  )}
                  {projects.filter((project) => project.isTemplate).map((project) => (
                    <tr key={project.id}>
                      <td><strong>{project.name}</strong></td>
                      <td>{project.version ?? 1}</td>
                      <td>{project.status}</td>
                      <td>{project.projectType || '-'}</td>
                      <td className="admin-actions">
                        <button className="admin-btn" onClick={() => navigate(`/admin/projetos/templates/${project.id}`)} aria-label="Gerenciar">
                          <span className="admin-action-icon">🧩</span>
                          <span className="admin-action-text">Gerenciar</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleEditProject(project)} aria-label="Editar">
                          <span className="admin-action-icon">✏️</span>
                          <span className="admin-action-text">Editar</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleCloneTemplate(project.id)} aria-label="Clonar">
                          <span className="admin-action-icon">📄</span>
                          <span className="admin-action-text">Clonar</span>
                        </button>
                        <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProject(project)} aria-label="Excluir">
                          <span className="admin-action-icon">🗑️</span>
                          <span className="admin-action-text">Excluir</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {projectsSubTab === 'clonados' && (
              <table className="admin-table admin-table--projects">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Template</th>
                    <th>Versão</th>
                    <th>Status</th>
                    <th>Criador</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!projectsLoading && projects.filter((project) => !project.isTemplate && (project.templateId || project.baseProjectId || project.createdFromPurchase)).length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhum projeto clonado encontrado.</td>
                    </tr>
                  )}
                  {projects
                    .filter((project) => !project.isTemplate && (project.templateId || project.baseProjectId || project.createdFromPurchase))
                    .map((project) => (
                      <tr key={project.id}>
                        <td><strong>{project.name}</strong></td>
                        <td>{project.templateId || project.baseProjectId || '—'}</td>
                        <td>{project.templateVersion ?? '—'}</td>
                        <td>{project.status}</td>
                        <td>{project.ownerUserId || '—'}</td>
                        <td className="admin-actions">
                          <button
                            className="admin-btn admin-btn--primary"
                            style={{ marginLeft: 8, background: '#38bdf8', color: '#fff', borderRadius: 8, fontWeight: 600 }}
                            onClick={() => navigate(`/manager?projectId=${encodeURIComponent(project.id)}`)}
                            aria-label={`Administrar ${project.name}`}
                          >
                            <span className="admin-action-icon">🛠️</span>
                            <span className="admin-action-text">Administrar</span>
                          </button>
                          <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProject(project)} aria-label="Excluir">
                            <span className="admin-action-icon">🗑️</span>
                            <span className="admin-action-text">Excluir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {isProjectModalOpen && (
              <div className="admin-modal-backdrop" onClick={() => setIsProjectModalOpen(false)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal__header">
                    <h3>{newProject.isTemplate ? 'Novo template' : 'Novo projeto'}</h3>
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
                        checked={newProject.isTemplate}
                        onChange={(e) => setNewProject({ ...newProject, isTemplate: e.target.checked })}
                      />
                      <span>Template</span>
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
                        checked={editProjectData.isTemplate}
                        onChange={(e) => setEditProjectData({ ...editProjectData, isTemplate: e.target.checked })}
                      />
                      <span>Template</span>
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
              </>
            )}
          </section>
        )}

        {activeTab === 'ia-reports' && (
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
                  setNewProduct({ name: '', price: '', description: '', productType: 'digital', templateId: '', showOnHome: false, showOnMarketplace: false, purchasePrice: '', salePrice: '' });
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
                      <span>Template ID</span>
                      <input
                        type="text"
                        placeholder="ID do template"
                        value={newProduct.templateId}
                        onChange={(e) => setNewProduct({ ...newProduct, templateId: e.target.value })}
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
                      <span>Template ID</span>
                      <input
                        type="text"
                        value={editProductData.templateId}
                        onChange={(e) => setEditProductData({ ...editProductData, templateId: e.target.value })}
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

        {activeTab === 'documentacao-api' && (
          <section>
            <h2>API Docs</h2>
            <p>Documentação OpenAPI gerada automaticamente.</p>
            {docsLoading.api && <p>Carregando documentação...</p>}
            {docsError.api && <p>{docsError.api}</p>}
            <div className="admin-actions" style={{ marginBottom: 12 }}>
              <a className="admin-btn" href={swaggerUrl} target="_blank" rel="noreferrer">Abrir Swagger UI</a>
            </div>
            {!docsLoading.api && !docsError.api && (
              <div className="admin-table-wrapper" style={{ padding: 0, height: 600 }}>
                <iframe title="Swagger UI" src={swaggerUrl} style={{ width: '100%', height: '600px', border: 'none' }} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'documentacao-ui' && (
          <section>
            <h2>UI Components</h2>
            <p>Storybook com os principais componentes de interface.</p>
            {docsLoading.ui && <p>Carregando documentação...</p>}
            {docsError.ui && <p>{docsError.ui}</p>}
            <div className="admin-actions" style={{ marginBottom: 12 }}>
              <a className="admin-btn" href={storybookUrl} target="_blank" rel="noreferrer">Abrir Storybook</a>
            </div>
            {!docsLoading.ui && !docsError.ui && (
              <div className="admin-table-wrapper" style={{ padding: 0, height: 600 }}>
                <iframe title="Storybook" src={storybookUrl} style={{ width: '100%', height: '600px', border: 'none' }} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'documentacao-architecture' && (
          <section>
            <h2>Architecture</h2>
            <p>Documentos de arquitetura e visão geral do sistema.</p>
            {docsLoading.architecture && <p>Carregando documentação...</p>}
            {docsError.architecture && <p>{docsError.architecture}</p>}
            <div className="admin-actions" style={{ marginBottom: 12 }}>
              <a className="admin-btn" href={architectureUrl} target="_blank" rel="noreferrer">Abrir documento</a>
            </div>
          </section>
        )}

        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Admin;
