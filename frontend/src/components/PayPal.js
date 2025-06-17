import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';


// Default configuration for PayPal JS SDK
const defaultConfig = {
    amount: '10.00', // Default transaction amount
    currency: 'EUR', // Default transaction currency
    buyerCountry: 'IE', // Customer country for funding eligibility
    commit: false, // true for "Pay Now", false for "Continue"
    ckoClientId: 'ASLqLf4pnWuBshW8Qh8z_DRUbIv2Cgs3Ft8aauLm9Z-MO9FZx1INSo38nW109o_Xvu88P3tly88XbJMR', // Checkout.com Test Client ID for PayPal
    paypalMerchantId: '56PFWHCCGEKWW', // *** REPLACE THIS WITH YOUR PAYPAL MERCHANT ID ***
    // disableFunding: 'credit,card,sepa,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sofort', // Default: disable many (as per CKO docs)
    disableFunding: 'credit,card,sepa,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sofort', // Start with no disabled funds, enable explicitly below if needed for testing
    enableFunding: '', // 'paylater' to enable PayPal Pay Later
    successUrl: 'https://react-flask-project-kpyi.onrender.com/success', // Your success redirect URL (adjust for deployment)
    failureUrl: 'https://react-flask-project-kpyi.onrender.com/failure',
    processingChannelId: 'pc_pxk25jk2hvuenon5nyv3p6nf2i',
    capture: true, // true for auto-capture, false for manual authorize (in Payment Context Request)
    userAction: 'pay_now'
};

// All possible commit types for dropdown
const commitOptions = [{ value: true, label: 'Pay Now (true)' }, { value: false, label: 'Continue (false)' }];

// User action options for context API
const userActionOptions = [{ value: 'pay_now', label: 'Pay Now' }, { value: 'continue', label: 'Continue' }];

const PayPal = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [config, setConfig] = useState(defaultConfig);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failure', 'cancelled'
    const [paymentDetails, setPaymentDetails] = useState(null); // To store PayPal order/capture details
    const [viewRaw, setViewRaw] = useState(false); // For raw/pretty view of paymentDetails
    const [checkoutContextId, setCheckoutContextId] = useState(null); // Stores the payment_context_id from CKO

    const buttonsRenderedRef = useRef(false);

    // Load config from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('paypalConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    // Save config to localStorage on change
    useEffect(() => {
        localStorage.setItem('paypalConfig', JSON.stringify(config));
    }, [config]);

    // Dynamic PayPal SDK Loader and Button Renderer
    useEffect(() => {
        const cleanup = () => {
            const existingScript = document.querySelector(`script[data-partner-attribution-id="CheckoutLtd_PSP"]`);
            if (existingScript) {
                existingScript.remove();
            }
            const buttonContainer = document.getElementById('paypal-button-container');
            if (buttonContainer) {
                buttonContainer.innerHTML = '';
            }
            buttonsRenderedRef.current = false;
        };
        cleanup(); // Perform cleanup on every config change or component re-mount

        if (buttonsRenderedRef.current) {
            return;
        }

        // Construct PayPal SDK script URL
        const scriptUrl = new URL("https://www.paypal.com/sdk/js");
        scriptUrl.searchParams.append('client-id', 'ASLqLf4pnWuBshW8Qh8z_DRUbIv2Cgs3Ft8aauLm9Z-MO9FZx1INSo38nW109o_Xvu88P3tly88XbJMR');
        scriptUrl.searchParams.append('merchant-id', "56PFWHCCGEKWW");
        scriptUrl.searchParams.append('disable-funding', config.disableFunding);
        scriptUrl.searchParams.append('commit', String(config.commit)); // Must be 'true' or 'false' string
        scriptUrl.searchParams.append('currency', config.currency);
        scriptUrl.searchParams.append('buyer-country', config.buyerCountry);

        // Add intent=authorize if commit=false (manual capture)
        if (!config.commit) {
            scriptUrl.searchParams.append('intent', 'authorize');
        }

        if (config.enableFunding) {
            scriptUrl.searchParams.append('enable-funding', config.enableFunding);
        }

        const script = document.createElement('script');
        script.src = scriptUrl.toString();
        script.setAttribute('data-partner-attribution-id', 'CheckoutLtd_PSP');
        script.async = true;

        script.onload = () => {
            if (window.paypal && window.paypal.Buttons && !buttonsRenderedRef.current) {
                try {
                    window.paypal.Buttons({
                        createOrder: async (data, actions) => {
                            setPaymentStatus(null);
                            setPaymentDetails(null);
                            setCheckoutContextId(null); // Clear previous context ID
                            toast.info("Requesting Checkout.com payment context...");
                            try {
                                // 1. Call backend to request Checkout.com payment context
                                const response = await axios.post(`${API_BASE_URL}api/payment-contexts`, {
                                    source: { type: "paypal" },
                                    currency: config.currency,
                                    amount: Math.round(parseFloat(config.amount) * 100),
                                    capture: config.capture, // Auto-capture or manual auth
                                    items: [ // Example item, adjust as needed or make configurable
                                        {
                                            "name": "Wireless Headphones",
                                            "unit_price": Math.round(parseFloat(config.amount) * 100),
                                            "quantity": 1
                                        }
                                    ],
                                    processing: {
                                        "invoice_id": `inv-${Date.now()}`,
                                        "user_action": config.userAction // 'pay_now' or 'continue'
                                    },
                                    processing_channel_id: config.processingChannelId,
                                    success_url: config.successUrl,
                                    failure_url: config.failureUrl,
                                    reference: `cko-paypal-ref-${Date.now()}` // Dynamic reference
                                });
                                toast.success("Checkout.com payment context created!");
                                setCheckoutContextId(response.data.id); // Store Checkout.com context ID
                                console.error("Payment context ID:" ,response.data.id )
                                console.error("Payment Order ID:" ,response.data.order_id )

                                // Return PayPal's order_id to the PayPal SDK
                                return response.data.order_id;
                            } catch (error) {
                                toast.error("Failed to create Checkout.com payment context. Check console for details.");
                                console.error("Create Payment Context Error:", error.response ? error.response.data : error.message);
                                throw new Error(error.response?.data?.error || "Failed to create payment context");
                            }
                        },
                        onApprove: async (data, actions) => {
                            toast.info("PayPal payment approved by user. Requesting payment capture/authorization...");
                            try {
                                // 2. Call backend to request payment (capture or authorize) using the context ID
                                const response = await axios.post(`${API_BASE_URL}api/paypal/request-payment`, {
                                    payment_context_id: checkoutContextId, // Use the stored Checkout.com context ID
                                    processing_channel_id: config.processingChannelId,
                                    // Optionally update amount/shipping here if user changed on PayPal side (for 'continue' flow)
                                });

                                if (response.data.status === 'Authorized' || response.data.status === 'Captured' || response.data.status === 'Pending') {
                                    setPaymentStatus('success');
                                    setPaymentDetails(response.data);
                                    toast.success(`PayPal payment ${response.data.status} by Checkout.com!`);
                                } else {
                                    setPaymentStatus('failure');
                                    setPaymentDetails(response.data);
                                    toast.error(`PayPal payment ${response.data.status} by Checkout.com.`);
                                }
                            } catch (error) {
                                setPaymentStatus('failure');
                                setPaymentDetails(error.response?.data || { error: error.message });
                                toast.error("Failed to request payment via Checkout.com. Check console.");
                                console.error("Request Payment Error:", error.response ? error.response.data : error.message);
                            }
                        },
                        onCancel: (data) => {
                            setPaymentStatus('cancelled');
                            setPaymentDetails(data);
                            toast.warn("PayPal payment cancelled by user.");
                            console.log("PayPal payment cancelled:", data);
                        },
                        onError: (err) => {
                            setPaymentStatus('failure');
                            setPaymentDetails({ error: err.message || 'Unknown PayPal error' });
                            toast.error("An error occurred with PayPal payment. Check console.");
                            console.error("PayPal onError:", err);
                        }
                    }).render('#paypal-button-container')
                    .catch(renderErr => {
                        console.error("PayPal Buttons failed to render:", renderErr);
                        toast.error("Failed to render PayPal buttons. Check your PayPal Merchant ID and client-id.");
                    });
                    buttonsRenderedRef.current = true;
                } catch {
                    console.warn("PayPal SDK not fully loaded or buttons already rendered.");
                }
            } else {
                console.warn("PayPal SDK script did not load correctly.");
            }
        };

        document.body.appendChild(script);

        return cleanup;
    }, [config, API_BASE_URL, checkoutContextId]); // Add checkoutContextId to dependencies


    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem('paypalConfig');
        setPaymentStatus(null);
        setPaymentDetails(null);
        setCheckoutContextId(null);
        buttonsRenderedRef.current = false;
    };

    const handleDownload = () => {
        if (!paymentDetails) return;
        const blob = new Blob([JSON.stringify(paymentDetails, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'paypal-payment-details.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Toggle for disable/enable funding sources (simplified) ---
    const toggleDisableFunding = (source) => {
        setConfig(prevConfig => {
            const currentDisabled = prevConfig.disableFunding.split(',').map(s => s.trim()).filter(s => s);
            const updatedDisabled = currentDisabled.includes(source)
                ? currentDisabled.filter(s => s !== source)
                : [...currentDisabled, source];
            return { ...prevConfig, disableFunding: updatedDisabled.join(',') };
        });
    };


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">PayPal Payments Test Suite</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                    {/* Client ID */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">CKO Client ID (PayPal Env)</label>
                        <input
                            type="text"
                            value={config.ckoClientId}
                            onChange={(e) => setConfig({ ...config, ckoClientId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                         <p className="text-xs text-gray-500 mt-1">Test: ASLqLf4pnWuBshW8Qh8z... | Live: ATbi1ysGm-jp4RmmAFz1EWH4dFpPd...</p>
                    </div>

                    {/* PayPal Merchant ID */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Your PayPal Merchant ID</label>
                        <input
                            type="text"
                            value={config.paypalMerchantId}
                            onChange={(e) => setConfig({ ...config, paypalMerchantId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="REPLACE_ME_WITH_YOUR_PAYPAL_MERCHANT_ID"
                        />
                         <p className="text-xs text-red-500 mt-1">**CRITICAL: Replace with your actual PayPal Merchant ID**</p>
                    </div>

                     {/* Processing Channel ID */}
                     <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Processing Channel ID</label>
                        <input
                            type="text"
                            value={config.processingChannelId}
                            onChange={(e) => setConfig({ ...config, processingChannelId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="pc_..."
                        />
                         <p className="text-xs text-red-500 mt-1">**CRITICAL: Replace with your PayPal Processing Channel ID**</p>
                    </div>

                    {/* Amount & Currency */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input
                                type="text"
                                value={config.amount}
                                onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <input
                                type="text"
                                value={config.currency}
                                onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Buyer Country & Commit */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Buyer Country</label>
                            <input
                                type="text"
                                value={config.buyerCountry}
                                onChange={(e) => setConfig({ ...config, buyerCountry: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">SDK `commit` Parameter</label>
                            <select
                                value={String(config.commit)} // Convert boolean to string for select value
                                onChange={(e) => setConfig({ ...config, commit: e.target.value === 'true' })}
                                className="w-full border rounded px-3 py-2"
                            >
                                {commitOptions.map(option => (
                                    <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* User Action for Payment Context API */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Context `user_action`</label>
                        <select
                            value={config.userAction}
                            onChange={(e) => setConfig({ ...config, userAction: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            {userActionOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                         <p className="text-xs text-gray-500 mt-1">Controls "Pay Now" vs "Continue" experience in PayPal pop-up.</p>
                    </div>

                    {/* Capture Type */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Auto Capture Payment</label>
                        <div className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={config.capture}
                                onChange={(e) => setConfig({ ...config, capture: e.target.checked })}
                                className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                            />
                            <span className="text-gray-700">{config.capture ? 'True (Auto-capture)' : 'False (Manual authorization)'}</span>
                        </div>
                         <p className="text-xs text-gray-500 mt-1">If False, SDK `intent=authorize` is used. You'll need a separate API call to capture manually.</p>
                    </div>

                    {/* Success/Failure URLs */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Success URL</label>
                            <input
                                type="text"
                                value={config.successUrl}
                                onChange={(e) => setConfig({ ...config, successUrl: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Failure URL</label>
                            <input
                                type="text"
                                value={config.failureUrl}
                                onChange={(e) => setConfig({ ...config, failureUrl: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Enable Funding Option */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1">Enable Funding Sources (e.g., paylater)</label>
                        <input
                            type="text"
                            value={config.enableFunding}
                            onChange={(e) => setConfig({ ...config, enableFunding: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="e.g., paylater"
                        />
                         <p className="text-xs text-gray-500 mt-1">Comma-separated. To enable Pay Later, type 'paylater'.</p>
                    </div>


                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        className="mt-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                        Reset to Defaults
                    </button>
                </div>

                {/* Right Panel: PayPal Buttons & Payment Details */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-center items-center mb-6 min-h-[50px]">
                        <div id="paypal-button-container" className="w-full flex justify-center" key={JSON.stringify(config)}>
                            {paymentStatus === null && <p className="text-gray-500">Loading PayPal buttons...</p>}
                        </div>
                    </div>

                    {/* Payment Status Display */}
                    {paymentStatus && (
                        <div className={`text-center py-2 px-4 rounded-lg mb-4 font-semibold
                            ${paymentStatus === 'success' ? 'bg-green-100 text-green-800' :
                              paymentStatus === 'failure' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}>
                            Payment Status: {paymentStatus.toUpperCase()}
                            {paymentDetails?.id && ` (ID: ${paymentDetails.id})`}
                        </div>
                    )}


                    {/* Payment Details Display */}
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64 whitespace-pre-wrap break-words">
                        {paymentDetails
                            ? viewRaw
                                ? JSON.stringify(paymentDetails)
                                : JSON.stringify(paymentDetails, null, 2)
                            : 'Waiting for payment details...'}
                    </div>

                    {/* Controls */}
                    <div className="flex justify-between items-center mt-4">
                        {paymentDetails && (
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                            >
                                Download Details as JSON
                            </button>
                        )}

                        <button
                            className={`px-3 py-1 text-sm rounded ${paymentDetails ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            onClick={() => {
                                if (paymentDetails) setViewRaw(!viewRaw);
                            }}
                            disabled={!paymentDetails}
                        >
                            {viewRaw ? 'Pretty View' : 'Raw View'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayPal;