import React from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Championships from './pages/Championships';
import Categories from './pages/Categories';
import Inscriptions from './pages/Inscriptions';
import PublicInscription from './pages/PublicInscription';
import AthleteClassifications from './pages/KyorugiClassifications';
import Brackets from './pages/Brackets';

function App() {
  const currentPath = window.location.pathname;

  if (currentPath === '/') {
    return <Login />;
  } else if (currentPath === '/dashboard') {
    return <Dashboard />;
  } else if (currentPath === '/organizations') {
    return <Organizations />;
  } else if (currentPath === '/championships') {
    return <Championships />;
  } else if (currentPath === '/categories') {
    return <Categories />;
  } else if (currentPath === '/inscriptions') {
    return <Inscriptions />;
  } else if (currentPath === '/kyorugi-classifications') {
    return <AthleteClassifications />;
  } else if (currentPath === '/brackets') {
    return <Brackets />;
  } else if (currentPath === '/inscrever-fetmg') {
    return <PublicInscription />;
  } else {
    return <Login />;
  }
}

export default App;
