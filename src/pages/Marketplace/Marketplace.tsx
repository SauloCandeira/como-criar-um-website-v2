import { useState } from 'react';
import './Marketplace.css';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';


const MarketPlace = () => {
  const [filter] = useState([{ label: 'Marketplace' }]);

  return (
    <LayoutPrivate crumbs={filter}>
      <MarketPlaceCard />
    </LayoutPrivate>
  );
};

export default MarketPlace;
