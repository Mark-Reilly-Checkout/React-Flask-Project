import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NavigationBar from './components/NavigationBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Flow from './components/Flow';
import RequestPayment from './components/RequestPayment'
import PaymentLink from './components/PaymentLink';




function App() {
  const [data, setData] = useState('');

  useEffect(() => {
    axios.get('/api/data')
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <Router>
            <NavigationBar />
            <Routes>
                <Route path="/flow" element={<Flow />} />
                <Route path="/requestPayment" element={<RequestPayment />} />
                <Route path="/paymentLink" element={<PaymentLink />} />
            </Routes>
    </Router>
  );
}

export default App;
