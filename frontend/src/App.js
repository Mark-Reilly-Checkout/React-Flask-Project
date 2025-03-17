import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NavigationBar from './pages/NavigationBar';
import 'bootstrap/dist/css/bootstrap.min.css';



function App() {
  const [data, setData] = useState('');

  useEffect(() => {
    axios.get('/api/data')
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="App">
      <NavigationBar />
      <p>{data}</p>
    </div>
  );
}

export default App;
