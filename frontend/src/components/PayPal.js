import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';


// Default configuration for PayPal JS SDK
const defaultConfig = {
    amount: '10.00', // Default transaction amount
    currency: 'USD', // Default transaction currency
    buyerCountry: 'US', // Customer country for funding eligibility
    commit: true, // true for "Pay Now", false for "Continue" (SDK parameter)
    capture: true, // true for auto-capture, false for manual authorize (in Payment Context Request)
    userAction: 'pay_now', // 'pay_now' for "Pay Now" experience, 'continue' for "Continue" (Context API parameter)
    ckoClientId: 'ASLqLf4pnWuBshW8Qh8z_DRUbIv2Cgs3Ft8aauLm9Z-MO9FZx1INSo38nW109o_Xvu88P3tly88XbJMR', // Checkout.com Test Client ID for PayPal
    paypalMerchantId: '56PFWHCCGEKWW', // *** REPLACE THIS WITH YOUR PAYPAL MERCHANT ID ***
    processingChannelId: 'pc_pxk25jk2hvuenon5nyv3p6nf2i', // *** REPLACE with your PayPal processing channel ID ***
    successUrl: 'https://react-flask-project-kpyi.onrender.com/success', // Your success redirect URL (adjust for deployment)
    failureUrl: 'https://react-flask-project-kpyi.onrender.com/failure', // Your failure redirect URL (adjust for deployment)
    disableFunding: 'credit,card,sepa,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sofort',
    enableFunding: '', // 'paylater' to enable PayPal Pay Later
    payment_type: 'Regular', // Default payment type for context creation
    type: 'digital', // Default item type for context creation
    shippingPreference: 'get_from_file', // Default shipping preference for context creation
};

const paymentTypes = [
    { value: 'Regular', label: 'Regular Payment' },
    { value: 'Recurring', label: 'Subscription Payment' },
    { value: 'Installment', label: 'Installment Payment' },
    { value: 'PayLater', label: 'Pay Later' },
    { value: 'MOTO', label: 'MOTO Payment' },
    { value:'Unscheduled', label: 'Unscheduled Payment' },
];

// All possible commit types for dropdown
const commitOptions = [{ value: true, label: 'Pay Now (true)' }, { value: false, label: 'Continue (false)' }];

// User action options for context API
const userActionOptions = [{ value: 'pay_now', label: 'Pay Now' }, { value: 'continue', label: 'Continue' }];

const typeOptions = [{value: 'digital', label: 'Digital' }, { value: 'physical', label: 'Physical' }];

const shippingPreferenceOptions = [{value: 'no_shipping', label: 'No Shipping' }, { value: 'set_provided_address', label: 'Provide Address' }, { value: 'get_from_file', label: 'Use Paypal Shipping Address' }];

const PayPal = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [config, setConfig] = useState(defaultConfig);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failure', 'cancelled'
    const [paymentDetails, setPaymentDetails] = useState(null); // To store PayPal order/capture details
    const [viewRaw, setViewRaw] = useState(false); // For raw/pretty view of paymentDetails

    // --- NEW STATES FOR CONTEXT CREATION ---
    const [ckoPaymentContextId, setCkoPaymentContextId] = useState(null); // Stores the context ID from CKO
    const [paypalOrderId, setPaypalOrderId] = useState(null); // Stores PayPal's order_id (from partner_metadata)
    const [contextCreationLoading, setContextCreationLoading] = useState(false); // Loading state for context creation

    const buttonsRenderedRef = useRef(false); // Ref to track if PayPal buttons are already rendered

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

    // --- UPDATED: Function to create Payment Context ---
    const handleCreatePaymentContext = async () => {
        setContextCreationLoading(true); // Start loading
        setPaymentStatus(null); // Clear previous payment status
        setPaymentDetails(null); // Clear previous payment details
        setCkoPaymentContextId(null); // Clear previous context ID
        setPaypalOrderId(null); // Clear previous PayPal Order ID

        const buttonContainer = document.getElementById('paypal-button-container');
        if (buttonContainer) {
            buttonContainer.innerHTML = ''; // Clear existing buttons
        }
        buttonsRenderedRef.current = false; // Reset flag for re-rendering

        try {
            // --- ADDED LOGIC: Force authorize for subscription payment types ---
            const isSubscription = config.payment_type === 'Recurring' || config.payment_type === 'Unscheduled';
            const finalCaptureValue = isSubscription ? false : config.capture;

            if (isSubscription && config.capture) {
                toast.warn("'Capture' is not applicable for Subscription/Unscheduled payments. Forcing 'Authorize'.");
            }

            // Construct the payload with the correct nested structure
            const payload = {
                source: { type: "paypal" },
                currency: config.currency,
                amount: Math.round(parseFloat(config.amount) * 100),
                capture: finalCaptureValue, // Use the determined capture value
                payment_type: config.payment_type,
                processing_channel_id: config.processingChannelId,
                success_url: config.successUrl,
                failure_url: config.failureUrl,
                reference: `cko-paypal-ref-${Date.now()}`,
                items: [{
                    "type": config.type,
                    "name": "Wireless Headphones",
                    "unit_price": Math.round(parseFloat(config.amount) * 100),
                    "quantity": 1
                }],
                processing: {
                    "invoice_id": `inv-${Date.now()}`,
                    "user_action": config.userAction,
                    "shipping_preference": config.shippingPreference,
                },
            };
            
            const response = await axios.post(`${API_BASE_URL}/api/payment-contexts`, payload);

            toast.success("Checkout.com payment context created successfully!");
            setCkoPaymentContextId(response.data.id);
            setPaypalOrderId(response.data.order_id);

        } catch (error) {
            toast.error("Failed to create Checkout.com payment context. Check console for details.");
            console.error("Create Payment Context Error:", error.response ? error.response.data : error.message);
        } finally {
            setContextCreationLoading(false); // Stop loading
        }
    };


    // Dynamic PayPal SDK Loader and Button Renderer
    useEffect(() => {
        if (!paypalOrderId) {
            const buttonContainer = document.getElementById('paypal-button-container');
            if (buttonContainer) { buttonContainer.innerHTML = '<p class="text-gray-500">Create Payment Context to render PayPal buttons.</p>'; }
            buttonsRenderedRef.current = false;
            return;
        }

        const cleanup = () => {
            const existingScript = document.querySelector(`script[data-partner-attribution-id="CheckoutLtd_PSP"]`);
            if (existingScript) { existingScript.remove(); }
            const buttonContainer = document.getElementById('paypal-button-container');
            if (buttonContainer) { buttonContainer.innerHTML = ''; }
            buttonsRenderedRef.current = false;
        };
        cleanup();

        if (buttonsRenderedRef.current) {
            return;
        }

        const scriptUrl = new URL("https://www.paypal.com/sdk/js");
        scriptUrl.searchParams.append('client-id', config.ckoClientId);
        scriptUrl.searchParams.append('merchant-id', config.paypalMerchantId);
        scriptUrl.searchParams.append('disable-funding', config.disableFunding);
        scriptUrl.searchParams.append('commit', String(config.commit));
        //scriptUrl.searchParams.append('currency', config.currency);
       // scriptUrl.searchParams.append('buyer-country', config.buyerCountry);

        // --- CORRECTED & ENHANCED LOGIC ---
        const isSubscription = config.payment_type === 'Recurring' || config.payment_type === 'Unscheduled';
        // The intent must be 'authorize' for subscriptions or when capture is manually set to false.
        if (isSubscription || !config.capture) {
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
                            toast.info("PayPal button clicked. Using pre-fetched Order ID.");
                            return paypalOrderId;
                        },
                        onApprove: async (data, actions) => {
                            toast.info("PayPal payment approved by user. Requesting payment capture/authorization...");
                            try {
                                const response = await axios.post(`${API_BASE_URL}api/payments`, {
                                    payment_context_id: ckoPaymentContextId,
                                    processing_channel_id: config.processingChannelId,
                                    capture: config.capture,
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
                } catch (renderErr) {
                    console.error("Error rendering PayPal buttons:", renderErr);
                    toast.error("An error occurred while rendering PayPal buttons.");
                }
            } else {
                console.warn("PayPal SDK script did not load correctly or buttons were already rendered.");
            }
        };

        document.body.appendChild(script);

        return cleanup;
    }, [config, API_BASE_URL, paypalOrderId, ckoPaymentContextId]);


    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem('paypalConfig');
        setPaymentStatus(null);
        setPaymentDetails(null);
        setCkoPaymentContextId(null);
        setPaypalOrderId(null);
        setContextCreationLoading(false);
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
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Item Type</label>
                        <select
                            value={config.type}
                            onChange={(e) => setConfig({ ...config, type: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            {typeOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Shipping Preference</label>
                        <select
                            value={config.shippingPreference}
                            onChange={(e) => setConfig({ ...config, shippingPreference: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            {shippingPreferenceOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Payment Type</label>
                                            <select
                                                value={config.payment_type}
                                                onChange={(e) => setConfig({ ...config, payment_type: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                {paymentTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
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
                    {/* --- NEW: Context Creation Button & Status --- */}
                    <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4">Payment Context</h2>
                        <button
                            onClick={handleCreatePaymentContext}
                            disabled={contextCreationLoading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50"
                        >
                            {contextCreationLoading ? 'Creating Context...' : 'Create Payment Context'}
                        </button>
                        {ckoPaymentContextId && paypalOrderId && (
                            <div className="mt-4 text-left text-sm text-gray-700 break-all">
                                <p><strong>Context ID:</strong> <code className="break-all">{ckoPaymentContextId}</code></p>
                                <p><strong>PayPal Order ID:</strong> <code className="break-all">{paypalOrderId}</code></p>
                            </div>
                        )}
                        {(contextCreationLoading || (!ckoPaymentContextId && !contextCreationLoading && paymentStatus === null)) && (
                             <p className="text-gray-500 mt-2 text-sm">Create context to load PayPal buttons.</p>
                        )}
                    </div>

                    {/* PayPal Buttons (Conditional Rendering) */}
                    {paypalOrderId && ( // Only render buttons if paypalOrderId is available
                        <div className="flex justify-center items-center mb-6 min-h-[50px]">
                            <div id="paypal-button-container" className="w-full flex justify-center" key={paypalOrderId}> {/* Key now depends on paypalOrderId */}
                                {/* PayPal buttons will render here */}
                            </div>
                        </div>
                    )}

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

