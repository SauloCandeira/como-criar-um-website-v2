import { useState } from 'react';
import './Marketplace.css'; 
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';
import Footer from '../../components/Footer/Footer';
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';


const MarketPlace = () => {
  const [filter] = useState<string[]>([]);

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
