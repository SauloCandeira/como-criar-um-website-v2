import React, { useEffect, useState } from 'react';
import './Admin.css';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/init-firebase';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../../services/productsApi';
import { createProject, deleteProject, fetchProjects, updateProject } from '../../services/projectsApi';

// Registrar os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface Sale {
  id: number;
  user: string;
  value: string;
  date: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  repository: string;
  domain: string;
  hosting: string;
  status: string;
  paid: boolean;
  isPublic: boolean;
}

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
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '' });
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState({ id: '', name: '', price: '', description: '' });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
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
    repository: '',
    domain: '',
    hosting: 'Vercel',
    status: 'Ativo',
    paid: false,
    isPublic: true,
  });
  const [selectedPeriod, setSelectedPeriod] = useState('day'); // day, month, year


  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data() as {
          name?: string;
          email?: string;
          authProvider?: string;
          status?: 'Ativo' | 'Inativo';
          cpf?: string;
          address?: string;
          paymentMethods?: string[];
          permissionLevel?: 'A' | 'B' | 'C';
        };
        return {
          id: doc.id,
          name: docData.name || 'Sem nome',
          email: docData.email || 'Sem email',
          authProvider: docData.authProvider || 'N/D',
          status: docData.status || 'Ativo',
          cpf: docData.cpf,
          address: docData.address,
          paymentMethods: docData.paymentMethods,
          permissionLevel: docData.permissionLevel || 'A'
        };
      });
      setUsers(data);
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

  useEffect(() => {
    loadUsers();
    loadProducts();
    loadProjects();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setUsersError('Preencha nome e email.');
      return;
    }
    try {
      await addDoc(collection(db, 'users'), {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        authProvider: 'Manual',
        status: 'Ativo',
        permissionLevel: newUser.permissionLevel,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
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
      await updateDoc(doc(db, 'users', editUserData.id), {
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
      await updateDoc(doc(db, 'users', user.id), { status: 'Inativo' });
      loadUsers();
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      setUsersError('Não foi possível desativar o usuário.');
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`Excluir o usuário ${user.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', user.id));
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
        description: newProduct.description.trim()
      });
      setNewProduct({ name: '', price: '', description: '' });
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
      description: product.description
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
        description: editProductData.description.trim()
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

  const sales = [
    { id: 101, user: 'João Silva', value: 'R$ 149,90', date: '01/03/2025' },
    { id: 102, user: 'Maria Santos', value: 'R$ 149,90', date: '02/03/2025' },
    { id: 103, user: 'Carlos Oliveira', value: 'R$ 199,99', date: '01/04/2025' },
    { id: 104, user: 'João Silva', value: 'R$ 250,00', date: '15/04/2025' },
    { id: 105, user: 'Maria Santos', value: 'R$ 300,00', date: '25/04/2025' },
  ];

  // Função para formatar a data
  const formatDate = (date: string) => {
    const [day, month, year] = date.split('/');
    return new Date(+year, +month - 1, +day);
  };

  const groupSalesByPeriod = (sales: Sale[], period: string) => {
    return sales.reduce((acc: Record<string, number>, sale) => {
      const date = formatDate(sale.date);
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

  // Agrupar as vendas por período
  const salesGrouped = groupSalesByPeriod(sales, selectedPeriod);
  const chartLabels = Object.keys(salesGrouped);
  const chartData = Object.values(salesGrouped);

  const chartDataLine = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Vendas',
        data: chartData,
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      },
    ],
  };

  const chartDataBar = {
    labels: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio'],
    datasets: [
      {
        label: 'Volume de Vendas por Mês',
        data: [10, 15, 20, 30, 25], // Dados fictícios de volume por mês
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderColor: 'rgba(255,99,132,1)',
        borderWidth: 1,
      },
    ],
  };

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
          </ul>
        </aside>

        <main className="admin-content">
        {activeTab === 'reports' && (
          <section>
            <h2>Relatórios</h2>
            <p>Total de usuários cadastrados: <strong>{users.length}</strong></p>
            <p>Total de vendas: <strong>{sales.length}</strong></p>
            <p>Faturamento total: <strong>R$ {sales.reduce((acc, sale) => acc + parseFloat(sale.value.replace('R$', '').replace(',', '.')), 0).toFixed(2)}</strong></p>

            <div>
              <h3>Filtro por Período</h3>
              <select onChange={(e) => setSelectedPeriod(e.target.value)} value={selectedPeriod}>
                <option value="day">Diário</option>
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>

            {/* Gráfico de Vendas por Período */}
            <div className="chart-container">
              <h3>Vendas por Período</h3>
              <Line data={chartDataLine} />
            </div>

            {/* Gráfico de Volume de Vendas por Mês */}
            <div className="chart-container">
              <h3>Volume de Vendas por Mês</h3>
              <Bar data={chartDataBar} />
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
                    repository: '',
                    domain: '',
                    hosting: 'Vercel',
                    status: 'Ativo',
                    paid: false,
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
                    <td colSpan={9}>Nenhum projeto encontrado.</td>
                  </tr>
                )}
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.id}</td>
                    <td>{project.name}</td>
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
                  setNewProduct({ name: '', price: '', description: '' });
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
                  <th>Preço</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!productsLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum produto encontrado.</td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.price}</td>
                    <td>{product.description}</td>
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
                      <span>Preço</span>
                      <input
                        type="text"
                        placeholder="Preço"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
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
                      <span>Preço</span>
                      <input
                        type="text"
                        value={editProductData.price}
                        onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <textarea
                        value={editProductData.description}
                        onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                      />
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
        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Admin;
