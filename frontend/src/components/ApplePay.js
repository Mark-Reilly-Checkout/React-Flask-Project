/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const ApplePay = () => {
  const containerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
  const amount = 50.00; // Amount in dollars
  const [paymentId, setPaymentId] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // Remove any existing button to avoid duplicates
    const existingButton = document.querySelector('apple-pay-button');
    if (existingButton) existingButton.remove();

    // Create new Apple Pay button
    const applePayButton = document.createElement('apple-pay-button');
    applePayButton.setAttribute('buttonstyle', 'black');
    applePayButton.setAttribute('type', 'plain');
    applePayButton.setAttribute('locale', 'en-US');
    containerRef.current?.appendChild(applePayButton);

    // Add click listener
    applePayButton.addEventListener('click', handleApplePay);

    return () => {
      applePayButton.removeEventListener('click', handleApplePay);
    };
  }, []);

  const handleApplePay = async () => {
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
      alert("Apple Pay is not available on this device/browser.");
      return;
    }

    const paymentRequest = {
      countryCode: 'IE',
      currencyCode: 'EUR',
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      total: {
        label: 'Test Purchase',
        amount: amount.toFixed(2), // Format to 2 decimal places
      },
    };

    const session = new window.ApplePaySession(3, paymentRequest);

    session.onvalidatemerchant = async (event) => {
        const validationURL = event.validationURL;
        try {
          const res = await axios.post(`${API_BASE_URL}api/apple-pay/validate-merchant`, {
            validationURL
          });
          console.log("Validation URL", validationURL);
          console.log("Merchant validation response", res.data);
          session.completeMerchantValidation(res.data);
        } catch (err) {
          console.error("Merchant validation failed", err);
          session.abort();
        }
      };

    session.onpaymentauthorized = async (event) => {
      const token = event.payment.token;

      try {
        const res = await axios.post(`${API_BASE_URL}api/apple-pay-session`, {
          tokenData: token.paymentData,
          amount: amount,
        });

        if (res.data.approved) {
            setPaymentId(res.data.payment_id);      // Store the payment ID
            setPaymentSuccess(true);  // Set payment success state
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
          } else {
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          }
        } catch (err) {
          console.error('Payment failed', err);
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
        }
    };

    session.begin();
  };

  return (
    <div>
      <style>
        {`
          apple-pay-button {
            --apple-pay-button-width: 200px;
            --apple-pay-button-height: 40px;
            --apple-pay-button-border-radius: 8px;
            display: block;
            margin: 2rem auto;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.6s ease-out forwards;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          apple-pay-button:hover {
            transform: translateY(15px) scale(1.05);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          }

          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <h1 className="text-center">Apple Pay</h1>
    
    {/* Conditional Rendering */}
    {!paymentSuccess ? (
      // Show Apple Pay button container if payment hasn't succeeded
      <div ref={containerRef} className="text-center" />
    ) : (
      // Show success message and payment ID after successful payment
      <div className="text-center mt-4">
        <p className="text-success">✅ Payment successful!</p>
        {paymentId && (
          <p className="text-muted">
            Payment ID: <code>{paymentId}</code>
          </p>
        )}
      </div>
    )}
  </div>
);
};

export default ApplePay;
