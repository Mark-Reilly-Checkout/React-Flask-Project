import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BasketPage from './CheckoutDemo/BasketPage';
import DeliveryPage from './CheckoutDemo/DeliveryPage';

const CheckoutDemoApp = () => {
  return (
    <Routes>
      <Route path="/" element={<BasketPage />} />
      <Route path="/delivery" element={<DeliveryPage />} />
    </Routes>
  );
};

export default CheckoutDemoApp;