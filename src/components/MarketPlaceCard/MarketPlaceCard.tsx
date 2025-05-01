import './MarketPlaceCard.css';
import { useState } from 'react';

interface Product {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  price: string | number;
  image: string;
}

const MarketPlaceCard = () => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const products: Product[] = [
    // CURSOS
    { id: 1, name: 'Curso de Python para Iniciantes', category: 'Cursos', subcategory: 'Linguagens de Programação - Python', price: 'R$ 200,00', image: 'https://via.placeholder.com/150?text=Curso+Python' },
    { id: 2, name: 'Curso de JavaScript Moderno', category: 'Cursos', subcategory: 'Linguagens de Programação - JavaScript', price: 'R$ 250,00', image: 'https://via.placeholder.com/150?text=Curso+JS' },
    { id: 3, name: 'Curso de Introdução à Programação', category: 'Cursos', subcategory: 'Fundamentos da Programação', price: 'R$ 180,00', image: 'https://via.placeholder.com/150?text=Curso+Intro+Programacao' },
    { id: 4, name: 'Curso de Desenvolvimento Web Completo', category: 'Cursos', subcategory: 'Desenvolvimento Web', price: 'R$ 300,00', image: 'https://via.placeholder.com/150?text=Curso+Web+Completo' },
    { id: 5, name: 'Curso de Arduino para Iniciantes', category: 'Cursos', subcategory: 'Robótica', price: 'R$ 220,00', image: 'https://via.placeholder.com/150?text=Curso+Arduino' },
    { id: 6, name: 'Curso de Eletrônica Básica', category: 'Cursos', subcategory: 'Eletrônica', price: 'R$ 190,00', image: 'https://via.placeholder.com/150?text=Curso+Eletronica' },

    // COMPONENTES ELETRÔNICOS E KITS
    { id: 7, name: 'Kit Arduino Braço Robótico', category: 'Componentes Eletrônicos', subcategory: 'Kits', price: 349.99, image: 'https://via.placeholder.com/150?text=Kit+Arduino+Braco+Robotico' },
    { id: 8, name: 'Kit ESP32 Carro com Câmera', category: 'Componentes Eletrônicos', subcategory: 'Kits', price: 499.99, image: 'https://via.placeholder.com/150?text=Kit+ESP32+Carro' },
    { id: 9, name: 'ESP32 WiFi Bluetooth', category: 'Componentes Eletrônicos', subcategory: 'Placas de Desenvolvimento', price: 149.99, image: 'https://via.placeholder.com/150?text=ESP32' },
    { id: 10, name: 'Resistores e LEDs 100 peças', category: 'Componentes Eletrônicos', subcategory: 'Componentes Eletrônicos', price: 59.99, image: 'https://via.placeholder.com/150?text=Resistores+LEDs' },
  ];

  const filters = {
    'Cursos': {
      'Linguagens de Programação': ['Python', 'JavaScript'],
      'Fundamentos da Programação': ['Introdução à Programação'],
      'Desenvolvimento Web': ['Desenvolvimento Web Completo'],
      'Robótica': ['Arduino para Iniciantes'],
      'Eletrônica': ['Eletrônica Básica'],
    },
    'Componentes Eletrônicos': {
      'Kits': ['Kit Arduino Braço Robótico', 'Kit ESP32 Carro com Câmera'],
      'Placas de Desenvolvimento': ['Arduino', 'ESP32'],
      'Componentes Eletrônicos': ['LED', 'Resistor'],
    }
  };

  const toggleFilter = (subcategory: string) => {
    setSelectedFilters((prev) =>
      prev.includes(subcategory) ? prev.filter((c) => c !== subcategory) : [...prev, subcategory]
    );
  };

  const filteredProducts = products.filter((product) =>
    selectedFilters.length > 0
      ? selectedFilters.some((filter) => product.subcategory.includes(filter))
      : true
  );

  return (
    <div className="marketplace-container">
      <aside className="sidebar">
        <h2>Filtrar por Categoria</h2>
        {Object.entries(filters).map(([category, subcategories]) => (
          <div key={category} className="filter-category">
            <h3>{category}</h3>
            {Object.entries(subcategories).map(([subcat, options]) => (
              <div key={subcat} className="filter-subcategory">
                <strong>{subcat}</strong>
                {options.length > 0 ? (
                  options.map((option) => (
                    <label key={option}>
                      <input type="checkbox" onChange={() => toggleFilter(option)} checked={selectedFilters.includes(option)} />
                      {option}
                    </label>
                  ))
                ) : (
                  <label>
                    <input type="checkbox" onChange={() => toggleFilter(subcat)} checked={selectedFilters.includes(subcat)} />
                    {subcat}
                  </label>
                )}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div className="products-container">
        {filteredProducts.map((product) => (
          <div className="product-card" key={product.id}>
            <img src={product.image} alt={product.name} className="product-image" />
            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="product-category">{product.category} - {product.subcategory}</p>
              <p className="product-price">
                {typeof product.price === 'number' ? `R$ ${product.price.toFixed(2)}` : product.price}
              </p>
              <button className="view-product-btn">Ver Produto</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketPlaceCard;
