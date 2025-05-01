import React, { useState } from 'react';
import './Marketplace.css'; 
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';
import Footer from '../../components/Footer/Footer';
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';

interface Product {
  id: number;
  name: string;
  category: string;
  price: string | number;
  image: string;
}

const MarketPlace = () => {
  const [filter, setFilter] = useState<string[]>([]);

  const products: Product[] = [
    { id: 1, name: 'Starter Kit Arduino Uno', category: 'Componentes Eletrônicos - Kits', price: 299.99, image: 'https://via.placeholder.com/150?text=Arduino+RFID+Kit' },
    { id: 2, name: 'Curso de Programação em Python', category: 'Cursos - Programação', price: 'R$ 200,00', image: 'https://via.placeholder.com/150?text=Curso+Python' },
    { id: 3, name: 'Kit Arduino Braço Robótico', category: 'Componentes Eletrônicos - Kits', price: 499.99, image: 'https://via.placeholder.com/150?text=Arduino+Robotic+Hand+Kit' },
    { id: 4, name: 'Curso de Eletrônica Básica', category: 'Cursos - Eletrônica', price: 'R$ 250,00', image: 'https://via.placeholder.com/150?text=Curso+Eletronica' },
  ];

  const toggleFilter = (category: string) => {
    setFilter((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const filteredProducts = products.filter((product) =>
    filter.length > 0 ? filter.some((category) => product.category.includes(category)) : true
  );

  return (
    <div className="marketplace">
      <HeaderTwo />
      <Breadcrumble crumbs={filter} />
      <MarketPlaceCard />
      <Footer />
    </div>
  );
};

export default MarketPlace;
