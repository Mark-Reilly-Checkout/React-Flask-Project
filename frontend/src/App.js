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
import FlowHandleSubmit from './components/FlowCallbacks/FlowHandleSubmit'
import FlowHandleClick from './components/FlowCallbacks/FlowHandleClick';
import RememberMe from './components/FlowCallbacks/RememberMe';
import Tokenization from './components/FlowCallbacks/Tokenization';
import HostedPaymentPages from './components/HostedPaymentPages';
import OnAuthorized from './components/FlowCallbacks/OnAuthorized';
import FlowSavedCard from './components/FlowCallbacks/FlowSavedCard';
import Home from './components/Home';



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
        <Route path="/" element={<Home/>} />
        <Route path="/googlePay" element={<GooglePay />} />
        <Route path="/test" element={<Test />} />
        <Route path="/success" element={<Success />} />
        <Route path="/failure" element={<Failure />} />
        <Route path="/paypal" element={<PayPal />} />
        <Route path="/flowHandleSubmit" element={<FlowHandleSubmit />} />
        <Route path="/flowHandleClick" element={<FlowHandleClick />} />
        <Route path="/onAuthorized" element={<OnAuthorized />} />
        <Route path="/rememberMe" element={<RememberMe/>} />
        <Route path='/tokenization' element={<Tokenization/>}/>
        <Route path="/hosted-payment-pages" element={<HostedPaymentPages />}/>
        <Route path="/checkout-demo/*" element={<CheckoutDemoApp />} />
        <Route path="/flowSavedCard" element={<FlowSavedCard />} />

      </Routes>
    </>
  );
}

export default App;
