import React, { useState, useEffect } from 'react';
import NavigationBar from './components/NavigationBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Route, Routes } from 'react-router-dom';
import Flow from './components/Flow';
import RequestPayment from './components/RequestPayment'
import PaymentLink from './components/PaymentLink';
import ApplePay from './components/ApplePay';
import { ToastContainer } from 'react-toastify';
import ToastHandler from './components/ToastHandler';
import 'react-toastify/dist/ReactToastify.css';





function App() {
  const [data, setData] = useState('');
  const apiUrl = process.env.REACT_APP_BACKEND_URL;
  

/*   useEffect(() => {
    console.log(apiUrl)
    axios.get(apiUrl+'api/data')
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []); */

  return (
    <>
      <NavigationBar />
      <ToastHandler />
      <ToastContainer />
      <Routes>
        <Route path="/flow" element={<Flow />} />
        <Route path="/requestPayment" element={<RequestPayment />} />
        <Route path="/paymentLink" element={<PaymentLink />} />
        <Route path="/applePay" element={<ApplePay />} />
        <Route path="/" element={<div>Welcome to the Payment App</div>} />
      </Routes>
    </>
  );
}

export default App;
