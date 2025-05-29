/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const defaultConfig = {
    amount: '1.00',
    currencyCode: 'GBP',
    countryCode: 'GB',
    supportedNetworks: ['masterCard', 'visa', 'amex'], // Default networks for Apple Pay
};

const allNetworks = ['masterCard', 'visa', 'amex', 'discover', 'cartesBancaires', 'jcb']; // All possible networks

const ApplePay = () => {
  const containerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

  // Use defaultConfig for initial state
  const [config, setConfig] = useState(defaultConfig);

  const [paymentToken, setPaymentToken] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);

  // --- NEW: Load config from localStorage on mount ---
  useEffect(() => {
    const savedConfig = localStorage.getItem('applePayConfig');
    if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // --- NEW: Save config to localStorage on change ---
  useEffect(() => {
    localStorage.setItem('applePayConfig', JSON.stringify(config));
  }, [config]);

  // Update the useEffect dependencies to use config properties
  useEffect(() => {
    // Remove any existing button to avoid duplicates
    const existingButton = document.querySelector('apple-pay-button');
    if (existingButton) existingButton.remove();

    // Create new Apple Pay button
    const applePayButton = document.createElement('apple-pay-button');
    applePayButton.setAttribute('buttonstyle', 'black');
    applePayButton.setAttribute('type', 'plain');
    applePayButton.setAttribute('locale', 'en-GB'); // Or dynamically set based on config.countryCode
    containerRef.current?.appendChild(applePayButton);

    // Add click listener
    applePayButton.addEventListener('click', handleApplePay);

    return () => {
      applePayButton.removeEventListener('click', handleApplePay);
    };
  }, [config.amount, config.currencyCode, config.countryCode, config.supportedNetworks]); // Dependencies changed to config properties


  const toggleNetwork = (network) => {
    setConfig((prev) => ({
      ...prev,
      supportedNetworks: prev.supportedNetworks.includes(network)
        ? prev.supportedNetworks.filter((n) => n !== network)
        : [...prev.supportedNetworks, network],
    }));
  };

  // --- NEW: Reset function ---
  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('applePayConfig');
    setPaymentToken(null);
    setPaymentSuccess(false); // Reset success state too
  };


  const handleApplePay = async () => {
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
      alert("Apple Pay is not available on this device/browser.");
      return;
    }

    amount: Math.round(parseFloat(config.amount) * 100)

    const paymentRequest = {
      countryCode: config.countryCode, // Use config
      currencyCode: config.currencyCode, // Use config
      supportedNetworks: config.supportedNetworks, // Use config
      merchantCapabilities: ['supports3DS'],
      total: {
        label: 'Test Purchase',
        amount: parseFloat(config.amount).toFixed(2), // Use config
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
      console.log("Payment token received", token);
      console.log("Payment amount", config.amount); // Log the amount being used

      try {
        const res = await axios.post(`${API_BASE_URL}api/apple-pay-session`, {
          tokenData: token.paymentData,
          amount: parseFloat(config.amount), // Use config amount here too
          currencyCode: config.currencyCode,   // <--- ADD THIS
          countryCode: config.countryCode,
        });

        if (res.data.approved) {
            setPaymentToken(JSON.stringify(token.paymentData));
            setPaymentSuccess(true);
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
        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>

          {/* Country, Currency, Amount inputs */}
          <div className="flex gap-4 mb-4">
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Country Code</label>
                  <input
                      type="text"
                      value={config.countryCode} // Use config.countryCode
                      onChange={(e) => setConfig({ ...config, countryCode: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Currency Code</label>
                  <input
                      type="text"
                      value={config.currencyCode} // Use config.currencyCode
                      onChange={(e) => setConfig({ ...config, currencyCode: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                      type="text"
                      value={config.amount} // Use config.amount
                      onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
          </div>

          {/* Card Networks Section */}
          <div className="mb-6 text-center">
              <label className="block text-sm font-medium mb-2">Supported Card Networks</label>
              <div className="flex flex-wrap justify-center gap-2">
                  {allNetworks.map(network => (
                      <button
                          key={network}
                          onClick={() => toggleNetwork(network)}
                          className={`px-3 py-1 rounded border text-sm ${config.supportedNetworks.includes(network) // Use config.supportedNetworks
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-800 border-gray-300'
                              }`}
                      >
                          {network}
                      </button>
                  ))}
              </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
              Note: Other Apple Pay configurations like merchant capabilities are typically fixed or derived by your backend.
          </p>

          {/* --- NEW: Reset Button --- */}
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Right Panel (Button and Token Display) */}
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