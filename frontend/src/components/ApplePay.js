/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';

// --- Config for Standalone Apple Pay ---
const defaultConfig = {
    amount: '1.00',
    currencyCode: 'GBP',
    countryCode: 'GB',
    supportedNetworks: ['masterCard', 'visa', 'amex'],
    merchantCapabilities: ['supports3DS'],
    initiativeContext: 'react-flask-project-kpyi.onrender.com',
    merchantIdentifier: 'merchant.com.reactFlask.sandbox',
    displayName: 'My Awesome Store',
    paymentMode: 'processPayment', // 'processPayment' or 'generateTokenOnly'
};

// --- Config for Flow Component Test ---
const defaultFlowSessionPayload = {
    amount: 1000,
    currency: "GBP",
    reference: "Flow-ApplePay-Conflict-Test",
    billing: {
      address: {
        country: "GB"
      }
    },
    customer: {
      name: "John Doe",
      email: "john.doe@example.com"
    }
};

const allNetworks = ['masterCard', 'visa', 'amex', 'discover', 'cartesBancaires', 'jcb'];
const allOptionalMerchantCapabilities = ['supportsCredit', 'supportsDebit', 'supportsEMV'];

const ApplePay = () => {
  const containerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
  const navigate = useNavigate();

  // --- State for Standalone Apple Pay ---
  const [config, setConfig] = useState(defaultConfig);
  const [paymentToken, setPaymentToken] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);
  const [initialPaymentMode, setInitialPaymentMode] = useState(defaultConfig.paymentMode);

  // --- NEW: State for Flow Component Test ---
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [paymentSessionFlow, setPaymentSessionFlow] = useState(null);
  const [paymentResponseFlow, setPaymentResponseFlow] = useState(null);
  const [jsonInputFlow, setJsonInputFlow] = useState(JSON.stringify(defaultFlowSessionPayload, null, 2));
  const [jsonErrorFlow, setJsonErrorFlow] = useState(null);
  const flowContainerRef = useRef(null);


  // --- Logic for Standalone Apple Pay ---

  useEffect(() => {
    const savedConfig = localStorage.getItem('applePayConfig');
    if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('applePayConfig', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const scriptId = 'risk-js';
    if (document.getElementById(scriptId)) {
        return; 
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://risk.sandbox.checkout.com/cdn/risk/2.3/risk.js";
    script.defer = true;
    script.integrity = "sha384-ZGdiIppkJzwran7Bjk0sUZy5z1mZGpR/MJx7LC0xCTyFE2sBpPFeLu4r15yGVei6";
    script.crossOrigin = "anonymous";
    script.onload = () => console.log("Risk.js SDK script has been loaded.");
    document.body.appendChild(script);
    return () => {
        const riskScript = document.getElementById(scriptId);
        if (riskScript) riskScript.remove();
    };
  }, []);

  useEffect(() => {
    if (!showMainContent) return;
    const existingButton = document.querySelector('apple-pay-button');
    if (existingButton) existingButton.remove();

    const applePayButton = document.createElement('apple-pay-button');
    applePayButton.setAttribute('buttonstyle', 'black');
    applePayButton.setAttribute('type', 'plain');
    applePayButton.setAttribute('locale', 'en-GB');
    containerRef.current?.appendChild(applePayButton);
    applePayButton.addEventListener('click', handleApplePay);

    return () => {
      applePayButton.removeEventListener('click', handleApplePay);
    };
  }, [config, showMainContent]); 

  const toggleNetwork = (network) => {
    setConfig((prev) => ({
      ...prev,
      supportedNetworks: prev.supportedNetworks.includes(network)
        ? prev.supportedNetworks.filter((n) => n !== network)
        : [...prev.supportedNetworks, network],
    }));
  };

  const toggleMerchantCapability = (capability) => {
      setConfig((prev) => ({
          ...prev,
          merchantCapabilities: prev.merchantCapabilities.includes(capability)
              ? prev.merchantCapabilities.filter((c) => c !== capability)
              : [...prev.merchantCapabilities, capability],
      }));
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('applePayConfig');
    setPaymentToken(null);
    setPaymentSuccess(false);
  };

  const handleApplePay = () => {
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
      toast.error("Apple Pay is not available on this device/browser.");
      return;
    }
    if (typeof window.Risk === 'undefined') {
        toast.error("Fraud detection script is still loading. Please try again in a moment.");
        return;
    }
    setLoading(true);
    let deviceSessionId = null;

    const paymentRequest = {
      countryCode: config.countryCode,
      currencyCode: config.currencyCode,
      supportedNetworks: config.supportedNetworks,
      merchantCapabilities: config.merchantCapabilities,
      merchantIdentifier: config.merchantIdentifier,
      total: {
        label: config.displayName,
        amount: parseFloat(config.amount).toFixed(2),
      },
    };

    const session = new window.ApplePaySession(3, paymentRequest);

    session.onvalidatemerchant = async (event) => {
        try {
            toast.info("Starting security check...");
            const risk = await window.Risk.create("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");
            const dsid = await risk.publishRiskData();
            deviceSessionId = "dsid"; // Store the ID for the payment step
            toast.success(`Security check complete.`);
            console.log("Risk.js Device Session ID:", dsid);

            const validationURL = event.validationURL;
            const res = await axios.post(`${API_BASE_URL}/api/apple-pay/validate-merchant`, {
                validationURL,
                initiativeContext: config.initiativeContext,
                merchantIdentifier: config.merchantIdentifier,
                displayName: config.displayName
            });
            session.completeMerchantValidation(res.data);

        } catch (err) {
            console.error("Risk assessment or Merchant validation failed", err);
            toast.error("Security check or merchant validation failed. Please try again.");
            session.abort();
        }
    };

    session.onpaymentauthorized = async (event) => {
      const token = event.payment.token;

      if (config.paymentMode === 'processPayment') {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/apple-pay-session`, {
            tokenData: token.paymentData,
            amount: Math.round(parseFloat(config.amount) * 100),
            currencyCode: config.currencyCode,
            countryCode: config.countryCode,
            deviceSessionId: deviceSessionId
          });

          if (res.data.approved) {
              setPaymentToken(JSON.stringify(token.paymentData));
              setPaymentSuccess(true);
              session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
              toast.success('Apple Pay payment successful!');
            } else {
              setPaymentToken(JSON.stringify(token.paymentData));
              setPaymentSuccess(false);
              session.completePayment(window.ApplePaySession.STATUS_FAILURE);
              toast.error('Apple Pay payment failed.');
            }
          } catch (err) {
            console.error('Payment failed', err);
            setPaymentToken(JSON.stringify(token.paymentData));
            setPaymentSuccess(false);
            toast.error('Apple Pay payment failed due to an error.');
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          }
      } else { 
          setPaymentToken(JSON.stringify(token.paymentData));
          setPaymentSuccess(true);
          session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
          toast.info('Apple Pay token generated successfully on frontend!');
      }
      setLoading(false);
    };
    
    session.oncancel = () => {
        setLoading(false);
        toast.warn("Payment cancelled by user.");
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

  const handleInitialModeSelection = () => {
      setConfig(prevConfig => ({
          ...prevConfig,
          paymentMode: initialPaymentMode
      }));
      setShowMainContent(true);
  };

  // --- NEW: Logic for Flow Component Test ---

  const handleJsonInputChangeFlow = (e) => {
    const value = e.target.value;
    setJsonInputFlow(value); 
    try {
        JSON.parse(value);
        setJsonErrorFlow(null); 
    } catch (error) {
        setJsonErrorFlow('Invalid JSON format.'); 
    }
  };

  const createPaymentSessionForFlow = async () => {
    setLoadingFlow(true);
    setPaymentSessionFlow(null);
    setPaymentResponseFlow(null);

    if (jsonErrorFlow) {
        toast.error("Cannot create session. Please fix the invalid JSON.");
        setLoadingFlow(false);
        return;
    }

    try {
        const parsedPayload = JSON.parse(jsonInputFlow);
        const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, parsedPayload);
        setPaymentSessionFlow(response.data);
        toast.success("Flow Payment session created. Component will now load.");
    } catch (error) {
        console.error("Flow Payment Session Error:", error.response ? error.response.data : error.message);
        toast.error('Error creating Flow payment session.');
    } finally {
        setLoadingFlow(false);
    }
  };

  useEffect(() => {
    if (!paymentSessionFlow?.id) {
        if (flowContainerRef.current) {
            flowContainerRef.current.innerHTML = '';
        }
        return;
    }

    const initializeFlowComponent = async (session) => {
        try {
            const checkout = await loadCheckoutWebComponents({
                paymentSession: session,
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                environment: 'sandbox',
                onPaymentCompleted: (_component, paymentResponse) => {
                    setPaymentResponseFlow(paymentResponse);
                    toast.success('Flow Payment completed successfully!');
                },
                onError: (component, error) => {
                    setPaymentResponseFlow(error);
                    toast.error('Flow Payment failed.');
                    console.error("Flow Payment Error:", error);
                }
            });
            const flowComponent = checkout.create('flow');
            if (await flowComponent.isAvailable()) {
                flowComponent.mount(flowContainerRef.current);
            } else {
                toast.error("Flow component is not available.");
            }
        } catch (err) {
            console.error("Error loading Flow:", err);
            toast.error("Failed to load Flow component.");
        }
    };

    initializeFlowComponent(paymentSessionFlow);

  }, [paymentSessionFlow, navigate]);


  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-4">Apple Pay Integration Lab</h1>
      {!showMainContent ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Choose your Apple Pay flow</h2>
                <div className="mb-6">
                    <select
                        id="paymentModeSelect"
                        value={initialPaymentMode}
                        onChange={(e) => setInitialPaymentMode(e.target.value)}
                        className="w-full border rounded-lg px-4 py-3 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="processPayment">End-to-End Payment</option>
                        <option value="generateTokenOnly">Token Generation</option>
                    </select>
                </div>
                <button
                    onClick={handleInitialModeSelection}
                    className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out"
                >
                    Continue
                </button>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Configuration Panel */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Standalone Button Config</h2>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Payment Action</label>
                <div className="flex flex-col space-y-2">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="paymentAction"
                            value="processPayment"
                            checked={config.paymentMode === 'processPayment'}
                            onChange={() => setConfig({...config, paymentMode: 'processPayment'})}
                            className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-gray-700">End-to-End Payment</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="paymentAction"
                            value="generateTokenOnly"
                            checked={config.paymentMode === 'generateTokenOnly'}
                            onChange={() => setConfig({...config, paymentMode: 'generateTokenOnly'})}
                            className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-gray-700">Token Generation</span>
                    </label>
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Merchant Identifier</label>
                <input
                    type="text"
                    value={config.merchantIdentifier}
                    onChange={(e) => setConfig({ ...config, merchantIdentifier: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                    type="text"
                    value={config.displayName}
                    onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Initiative Context</label>
                <input
                    type="text"
                    value={config.initiativeContext}
                    onChange={(e) => setConfig({ ...config, initiativeContext: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
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
            <div className="mb-6 text-center">
                <label className="block text-sm font-medium mb-2">Merchant Capabilities</label>
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        className="px-3 py-1 rounded border text-sm bg-blue-600 text-white border-blue-600 cursor-not-allowed"
                        onClick={() => toast.info("supports3DS is a required capability and is always enabled.")}
                    >
                        supports3DS (Required)
                    </button>
                    {allOptionalMerchantCapabilities.map(capability => (
                        <button
                            key={capability}
                            onClick={() => toggleMerchantCapability(capability)}
                            className={`px-3 py-1 rounded border text-sm ${(config.merchantCapabilities || []).includes(capability)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-800 border-gray-300'
                                }`}
                        >
                            {capability}
                        </button>
                    ))}
                </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Right Column: Payment Elements & Responses */}
          <div className="flex flex-col h-full gap-6">
            {/* --- STANDALONE APPLE PAY CARD --- */}
            <Card className="p-6 rounded-xl shadow-md bg-white">
                <Card.Title className="text-xl font-semibold mb-4 text-center">Standalone Apple Pay Button</Card.Title>
                <div className="flex justify-center items-center mb-6">
                    <div ref={containerRef} className="text-center" />
                </div>
                <Card.Title className="text-md font-semibold mt-4">Standalone Response</Card.Title>
                <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64 whitespace-pre-wrap break-words">
                {paymentToken
                    ? viewRaw
                    ? paymentToken
                    : JSON.stringify(JSON.parse(paymentToken), null, 2)
                    : config.paymentMode === 'generateTokenOnly' ? 'Apple Pay token will appear here after generation (Frontend Only).' : 'Waiting for payment...'}
                </div>
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
            </Card>

            {/* --- NEW: FLOW COMPONENT TEST CARD --- */}
            <Card className="p-6 rounded-xl shadow-md bg-white">
                <Card.Title className="text-xl font-semibold mb-4">Flow Component Test</Card.Title>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Payment Session Request</label>
                    <textarea
                        value={jsonInputFlow}
                        onChange={handleJsonInputChangeFlow}
                        className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonErrorFlow ? 'border-red-500' : 'border-gray-300'}`}
                        rows={10}
                    />
                    {jsonErrorFlow && <p className="text-red-500 text-xs mt-1">{jsonErrorFlow}</p>}
                </div>
                <button
                    onClick={createPaymentSessionForFlow}
                    disabled={loadingFlow || !!jsonErrorFlow}
                    className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loadingFlow ? "Creating..." : "Create Session for Flow"}
                </button>
                
                <hr className="my-4" />
                
                {paymentSessionFlow ? (
                    <div ref={flowContainerRef} id="flow-container" className="min-h-[200px]">
                        {/* Flow component mounts here */}
                    </div>
                ) : (
                    <div className="min-h-[200px] flex items-center justify-center">
                        <p className="text-center text-gray-500">Create session to load Flow.</p>
                    </div>
                )}
                <Card.Title className="text-md font-semibold mt-4">Flow Response</Card.Title>
                <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64 whitespace-pre-wrap break-words">
                    {paymentResponseFlow ? JSON.stringify(paymentResponseFlow, null, 2) : 'Waiting for Flow payment...'}
                </div>
            </Card>

          </div>
        </div>
      )}
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