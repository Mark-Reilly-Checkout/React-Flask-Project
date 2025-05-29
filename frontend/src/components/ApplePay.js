/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; // Ensure toast is imported if you haven't already

// Default configuration for Apple Pay
const defaultConfig = {
    amount: '1.00',
    currencyCode: 'GBP',
    countryCode: 'GB',
    supportedNetworks: ['masterCard', 'visa', 'amex'], // Default selected networks
    merchantCapabilities: ['supports3DS'], 
    initiativeContext: 'react-flask-project-kpyi.onrender.com',
    merchantIdentifier: 'merchant.com.reactFlask.sandbox',
    displayName: 'My Awesome Store', // Display name for the payment sheet
};

// All possible networks for selection
const allNetworks = ['masterCard', 'visa', 'amex', 'discover', 'cartesBancaires', 'jcb'];

// All optional merchant capabilities for selection
const allOptionalMerchantCapabilities = ['supportsCredit', 'supportsDebit', 'supportsEMV'];

const ApplePay = () => {
  const containerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

  const [config, setConfig] = useState(defaultConfig);
  const [paymentToken, setPaymentToken] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('applePayConfig');
    if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Save config to localStorage on change
  useEffect(() => {
    localStorage.setItem('applePayConfig', JSON.stringify(config));
  }, [config]);

  // Effect to create/re-create the Apple Pay button when config changes
  useEffect(() => {
    // Remove any existing button to avoid duplicates
    const existingButton = document.querySelector('apple-pay-button');
    if (existingButton) existingButton.remove();

    // Create new Apple Pay button
    const applePayButton = document.createElement('apple-pay-button');
    applePayButton.setAttribute('buttonstyle', 'black');
    applePayButton.setAttribute('type', 'plain');
    applePayButton.setAttribute('locale', 'en-GB'); // Consider making this dynamic based on config.countryCode
    containerRef.current?.appendChild(applePayButton);

    // Add click listener
    applePayButton.addEventListener('click', handleApplePay);

    return () => {
      applePayButton.removeEventListener('click', handleApplePay);
    };
  }, [config]); // Re-run effect whenever any part of the config object changes


  // Function to toggle selected card networks
  const toggleNetwork = (network) => {
    setConfig((prev) => ({
      ...prev,
      supportedNetworks: prev.supportedNetworks.includes(network)
        ? prev.supportedNetworks.filter((n) => n !== network)
        : [...prev.supportedNetworks, network],
    }));
  };

  // Function to toggle optional merchant capabilities
  const toggleMerchantCapability = (capability) => {
      setConfig((prev) => ({
          ...prev,
          merchantCapabilities: prev.merchantCapabilities.includes(capability)
              ? prev.merchantCapabilities.filter((c) => c !== capability)
              : [...prev.merchantCapabilities, capability],
      }));
  };

  // Reset function to revert to defaultConfig
  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('applePayConfig');
    setPaymentToken(null);
    setPaymentSuccess(false);
  };


  const handleApplePay = async () => {
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
      // Replaced alert with toast for better UI
      toast.error("Apple Pay is not available on this device/browser.");
      return;
    }

    // Construct the Apple Pay payment request using current config state
    const paymentRequest = {
      countryCode: config.countryCode,
      currencyCode: config.currencyCode,
      supportedNetworks: config.supportedNetworks,
      merchantCapabilities: config.merchantCapabilities, // Use selected capabilities
      merchantIdentifier: config.merchantIdentifier, // Pass merchantIdentifier
      total: {
        label: config.displayName, // Use displayName for the total label
        amount: parseFloat(config.amount).toFixed(2),
      },
      // You can add other fields like requiredBillingContactFields, requiredShippingContactFields etc.
    };

    // Create a new ApplePaySession
    const session = new window.ApplePaySession(3, paymentRequest);

    // Merchant Validation Callback
    session.onvalidatemerchant = async (event) => {
        const validationURL = event.validationURL;
        try {
          // Send validationURL and new custom fields to your backend
          const res = await axios.post(`${API_BASE_URL}api/apple-pay/validate-merchant`, {
            validationURL,
            initiativeContext: config.initiativeContext, // Send initiativeContext to backend
            merchantIdentifier: config.merchantIdentifier, // Send merchantIdentifier to backend
            displayName: config.displayName // Send displayName to backend
          });
          console.log("Validation URL", validationURL);
          console.log("Merchant validation response", res.data);
          session.completeMerchantValidation(res.data);
        } catch (err) {
          console.error("Merchant validation failed", err);
          toast.error("Merchant validation failed. Please try again."); // Toast on error
          session.abort();
        }
      };

    // Payment Authorization Callback
    session.onpaymentauthorized = async (event) => {
      const token = event.payment.token;

      try {
        // Send the Apple Pay token and amount to your backend for processing
        const res = await axios.post(`${API_BASE_URL}api/apple-pay-session`, {
          tokenData: token.paymentData,
          amount: Math.round(parseFloat(config.amount) * 100), // Convert to minor units (cents)
          currencyCode: config.currencyCode, // Send currencyCode to backend
          countryCode: config.countryCode, // Send countryCode to backend
        });

        if (res.data.approved) {
            setPaymentToken(JSON.stringify(token.paymentData)); // Store token for display
            setPaymentSuccess(true);
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            toast.success('Apple Pay payment successful!'); // Toast on success
          } else {
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            toast.error('Apple Pay payment failed.'); // Toast on failure
          }
        } catch (err) {
          console.error('Payment failed', err);
          toast.error('Apple Pay payment failed due to an error.'); // Toast on error
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

          {/* Merchant Identifier */}
          <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Merchant Identifier (e.g., merchant.com.yourdomain)</label>
              <input
                  type="text"
                  value={config.merchantIdentifier}
                  onChange={(e) => setConfig({ ...config, merchantIdentifier: e.target.value })}
                  className="w-full border rounded px-3 py-2"
              />
          </div>

          {/* Display Name */}
          <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Display Name (for Payment Sheet)</label>
              <input
                  type="text"
                  value={config.displayName}
                  onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
              />
          </div>

          {/* Initiative Context */}
          <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Initiative Context (for Backend Validation)</label>
              <input
                  type="text"
                  value={config.initiativeContext}
                  onChange={(e) => setConfig({ ...config, initiativeContext: e.target.value })}
                  className="w-full border rounded px-3 py-2"
              />
          </div>

          {/* Country, Currency, Amount inputs */}
          <div className="flex gap-4 mb-4">
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Country Code</label>
                  <input
                      type="text"
                      value={config.countryCode}
                      onChange={(e) => setConfig({ ...config, countryCode: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Currency Code</label>
                  <input
                      type="text"
                      value={config.currencyCode}
                      onChange={(e) => setConfig({ ...config, currencyCode: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                      type="text"
                      value={config.amount}
                      onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                  />
              </div>
          </div>

          {/* Supported Card Networks Section */}
          <div className="mb-6 text-center">
              <label className="block text-sm font-medium mb-2">Supported Card Networks</label>
              <div className="flex flex-wrap justify-center gap-2">
                  {allNetworks.map(network => (
                      <button
                          key={network}
                          onClick={() => toggleNetwork(network)}
                          className={`px-3 py-1 rounded border text-sm ${config.supportedNetworks.includes(network)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-800 border-gray-300'
                              }`}
                      >
                          {network}
                      </button>
                  ))}
              </div>
          </div>

          {/* Merchant Capabilities Section */}
          <div className="mb-6 text-center">
              <label className="block text-sm font-medium mb-2">Merchant Capabilities</label>
              <div className="flex flex-wrap justify-center gap-2">
                  {/* supports3DS - Always present and not clickable */}
                  <button
                      className="px-3 py-1 rounded border text-sm bg-blue-600 text-white border-blue-600 cursor-not-allowed"
                      onClick={() => toast.info("supports3DS is a required capability and is always enabled.")}
                  >
                      supports3DS (Required)
                  </button>
                  {/* Optional capabilities */}
                  {allOptionalMerchantCapabilities.map(capability => (
                      <button
                          key={capability}
                          onClick={() => toggleMerchantCapability(capability)}
                          className={`px-3 py-1 rounded border text-sm ${config.merchantCapabilities.includes(capability)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-800 border-gray-300'
                              }`}
                      >
                          {capability}
                      </button>
                  ))}
              </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
              Note: Ensure your Apple Merchant ID is correctly configured in the backend and matches the 'Merchant Identifier' here.
          </p>

          {/* Reset Button */}
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