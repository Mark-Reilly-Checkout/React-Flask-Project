import React, { useState, useEffect } from 'react';
import NavigationBar from './components/NavigationBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route } from 'react-router-dom';
import Flow from './components/Flow';
import RequestPayment from './components/RequestPayment'
import PaymentLink from './components/PaymentLink';
import ApplePay from './components/ApplePay';
import { ToastContainer } from 'react-toastify';
import ToastHandler from './components/ToastHandler';
import 'react-toastify/dist/ReactToastify.css';
import Success from './components/Redirects/Success';
import GooglePay from './components/GooglePay';
import Failure from './components/Redirects/Failure';
import Test from './components/Test';
import CheckoutDemoApp from './components/CheckoutDemoApp';
import PayPal from './components/PayPal';

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
        <Route path="/success" element={<Success />} />
        <Route path="/failure" element={<Failure />} />
        <Route path="/googlePay" element={<GooglePay />} />
        <Route path="/test" element={<Test />} />
        <Route path="/success" element={<Success />} />
        <Route path="/failure" element={<Failure />} />
         <Route path="/paypal" element={<PayPal />} />

        {/* --- NEW ROUTE FOR CHECKOUT DEMO --- */}
        {/* CheckoutDemoApp handles its own nested routes for /checkout-demo and /checkout-demo/delivery */}
        <Route path="/checkout-demo/*" element={<CheckoutDemoApp />} />
        {/* --- END NEW ROUTE --- */}

      </Routes>
    </>
  );
}

export default App;
