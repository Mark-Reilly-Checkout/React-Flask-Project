/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const ApplePay = () => {
  const containerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
  const amount = 1.00; // Amount in dollars
  const currencyCode = 'GBP'; // Currency Code
  const acquirerCountry = 'GB'; // Acquirer Country
  const [paymentToken, setPaymentToken] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [viewRaw, setViewRaw] = useState(false); // For raw/pretty view toggle

  useEffect(() => {
    // Remove any existing button to avoid duplicates
    const existingButton = document.querySelector('apple-pay-button');
    if (existingButton) existingButton.remove();

    // Create new Apple Pay button
    const applePayButton = document.createElement('apple-pay-button');
    applePayButton.setAttribute('buttonstyle', 'black'); // Match Google Pay button color
    applePayButton.setAttribute('type', 'plain');
    applePayButton.setAttribute('locale', 'en-GB'); // Match Google Pay locale
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
      countryCode: acquirerCountry, // Use acquirerCountry
      currencyCode: currencyCode, // Use currencyCode
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
          setPaymentToken(JSON.stringify(token.paymentData)); // Store token for display
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

  const handleDownload = () => {
    if (!paymentToken) return;
    const blob = new Blob([paymentToken], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment-token.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Apple Pay</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <p>Apple Pay configurations are handled natively and are not configurable within this component.</p>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex justify-center items-center mb-6">
            {/* Apple Pay Button */}
            <div ref={containerRef} className="text-center" />
          </div>

          {/* Token Display + Download */}
          <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64 whitespace-pre-wrap break-words">
            {paymentToken
              ? viewRaw
                ? paymentToken
                : JSON.stringify(JSON.parse(paymentToken), null, 2)
              : 'Waiting for payment...'}
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center mt-4">
            {paymentToken && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Download Token as JSON
              </button>
            )}

            <button
              className={`px-3 py-1 text-sm rounded ${paymentToken ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={() => {
                if (paymentToken) setViewRaw(!viewRaw);
              }}
              disabled={!paymentToken}
            >
              {viewRaw ? 'Pretty View' : 'Raw View'}
            </button>
          </div>
        </div>
      </div>
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
    </div>
  );
};

export default ApplePay;