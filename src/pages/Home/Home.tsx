import { Layout, Main } from '../../components/ui/layout';
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';
import Intro from '../../components/Intro/Intro';
import ProductCard from '../../components/ProductCard/ProductCard';
import Footer from '../../components/Footer/Footer';
import Services from '../../components/Services/Services';
import AboutCard from '../../components/AboutCard/AboutCard';
import PlatformAccess from '../../components/PlatformAccess/PlatformAccess'; // Renamed for clarity if possible, checking import

const Home = () => {
  return (
    <Layout>
      <HeaderTwo />
      <main className="flex-1 w-full">
        <Intro />
        <AboutCard />
        <Services />
        <PlatformAccess />
        <ProductCard />
      </main>
      <Footer />
    </Layout>
  );
};

export default Home;
