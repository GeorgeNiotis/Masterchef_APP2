import { useEffect, useState } from 'react';
import ActivePoolsComp from './components/ActivePools.jsx'
import SymbolsArrayComp from './components/SymbolsArray.jsx'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import loadBlockchainData from './Funcs';

function App() {
  const [pools, set_pools] = useState()
  const callfunc_loadBlockchainData = async () => set_pools(await loadBlockchainData())

  useEffect(() => {
    callfunc_loadBlockchainData()
  }, [])

  return (
    <div className='App'>
      <AppBar position='static'>
        <Toolbar>
          <Typography letiant='h6' component='div' >
            MasterChef App
          </Typography>
        </Toolbar>
      </AppBar>
      <ActivePoolsComp array={pools} />
      <SymbolsArrayComp array={pools} />
    </div>
  );
}

export default App;
