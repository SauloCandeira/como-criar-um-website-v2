import React, { useState } from 'react';
import './Admin.css';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Registrar os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [items] = useState([
    { id: 1, name: 'Kit Arduino Uno', price: 'R$ 299,99', description: 'Kit completo para sistemas RFID' },
    { id: 2, name: 'ESP32 Starter Kit', price: 'R$ 349,99', description: 'Kit para robôs móveis e automação' },
  ]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '' });
  const [selectedPeriod, setSelectedPeriod] = useState('day'); // day, month, year


  const users = [
    { id: 1, name: 'João Silva', email: 'joao@email.com' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com' },
    { id: 3, name: 'Carlos Oliveira', email: 'carlos@email.com' },
  ];

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

  // Função para agrupar vendas
  const groupSalesByPeriod = (sales: any[], period: string) => {
    return sales.reduce((acc, sale) => {
      const date = formatDate(sale.date);
      let key;

      if (period === 'day') {
        key = date.toLocaleDateString();
      } else if (period === 'month') {
        key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      } else {
        key = date.getFullYear();
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
    <div className="admin-container">
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
          <li className={activeTab === 'items' ? 'active' : ''} onClick={() => setActiveTab('items')}>
            Itens
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
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {activeTab === 'items' && (
          <section>
            <h2>Itens Disponíveis para Venda</h2>
            <div className="item-form">
              <input
                type="text"
                placeholder="Nome do Item"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Preço"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
              <input
                type="text"
                placeholder="Descrição"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <button >Adicionar Item</button>
            </div>

            {/* Lista de Itens */}
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.price}</td>
                    <td>{item.description}</td>
                    <td>
                      <button>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
};

export default Admin;
