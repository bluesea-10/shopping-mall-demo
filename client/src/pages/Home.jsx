import Navbar from '../components/Navbar';
import { HomeMain, HomePageFooter } from '../components/home/HomeSections';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <Navbar />
      <main>
        <HomeMain />
      </main>
      <HomePageFooter />
    </div>
  );
}

export default Home;
