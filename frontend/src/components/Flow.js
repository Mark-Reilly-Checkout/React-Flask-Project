import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate} from "react-router-dom";

// Country to Currency Mapping
const countries = [
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'AT', name: 'Austria', currency: 'EUR' },
    { code: 'BE', name: 'Belgium', currency: 'EUR' },
    { code: 'CN', name: 'China', currency: 'CNY' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
    { code: 'FR', name: 'France', currency: 'EUR' },
    { code: 'IT', name: 'Italy', currency: 'EUR' },
    { code: 'KW', name: 'Kuwait', currency: 'KWD' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR' },
    { code: 'PT', name: 'Portugal', currency: 'EUR' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
    { code: 'ES', name: 'Spain', currency: 'EUR' },
    { code: 'IE', name: 'Ireland', currency: 'EUR' },
    { code: 'NO', name: 'Norway', currency: 'NOK' },
];

const paymentTypes = [
    { value: 'Regular', label: 'Regular Payment' },
    { value: 'Recurring', label: 'Subscription Payment' },
    { value: 'Installment', label: 'Installment Payment' },
    { value: 'PayLater', label: 'Pay Later' },
    { value: 'MOTO', label: 'MOTO Payment' },
    { value:'Unscheduled', label: 'Unscheduled Payment' },
];

// Default configuration for Flow.js (used when standalone)
const defaultConfig = {
    initialAmount: '50.00',
    initialEmail: 'testfry@example.com',
    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
    environment: 'sandbox',
    locale: 'en',
    flowExpandFirstPaymentMethod: false,
    cardDisplayCardholderName: 'bottom',
    cardDataEmail: 'mark.reilly1234@checkot.com',
    forceTermsAcceptance: true,
    country: 'GB',
    currency: 'GBP',
    billingAddress: { // Ensure this is always an object by default
        address_line1: '123 Main St',
        address_line2: '',
        city: 'London',
        zip: 'SW1A 0AA',
        country: 'GB'
    },
    paymentType:'Regular',
    capture: true,
    threeDsEnabled: false,
};

const defaultSessionPayload = {
  "amount": 4700,
  "currency": "GBP",
  "reference": "ORD-123A",
  "billing": {
    "address": {
      "country": "GB"
    }
  },
  "3ds": {
    "enabled": true
  },
  "customer": {
    "name": "Mark Reilly",
    "email": "mark.reilly@hotmail.com"
  },
  "shipping": {
    "address": {
      "address_line1": "123 High St.",
      "address_line2": "Flat 456",
      "city": "London",
      "state": "str",
      "zip": "SW1A 1AA",
      "country": "GB"
    }
  },
  "items": [
    {
      "name": "Tie-Dye Printed Skirt 40",
      "unit_price": 2700,
      "quantity": 1
    },
    {
      "name": "Printed Jersey T-Shirt M",
      "unit_price": 2000,
      "quantity": 1
    }
  ]
};

const Flow = ({ passedPaymentSession = null }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [internalPaymentSessionDetails, setInternalPaymentSessionDetails] = useState(passedPaymentSession);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");

    const [config, setConfig] = useState(defaultConfig);
    const acceptedTermsRef = useRef(false);

    // --- MODIFIED: Initialize state from localStorage or fall back to default ---
    const [jsonInput, setJsonInput] = useState(() => {
        const savedJson = localStorage.getItem('flowJsonPayload');
        return savedJson || JSON.stringify(defaultSessionPayload, null, 2);
    });
    const [sessionPayload, setSessionPayload] = useState(() => {
        const savedJson = localStorage.getItem('flowJsonPayload');
        try {
            return savedJson ? JSON.parse(savedJson) : defaultSessionPayload;
        } catch (e) {
            return defaultSessionPayload;
        }
    });
    const [jsonError, setJsonError] = useState(null);

    const [showMainContent, setShowMainContent] = useState(passedPaymentSession !== null);

    const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
    const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);
    const [lastUpdatedConfig, setLastUpdatedConfig] = useState(null);

    const [timeAgoSession, setTimeAgoSession] = useState('');
    const [timeAgoFlow, setTimeAgoFlow] = useState('');
    const [timeAgoConfig, setTimeAgoConfig] = useState('');
    const flowComponentRef = useRef(null);



    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Never updated";
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Last updated just now";
        if (diffMins < 60) {
            return `Last updated ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            return `Last updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeAgoSession(getTimeAgo(lastUpdatedSession));
            setTimeAgoFlow(getTimeAgo(lastUpdatedFlow));
            setTimeAgoConfig(getTimeAgo(lastUpdatedConfig));
        }, 60000);

        return () => clearInterval(interval);
    }, [lastUpdatedSession, lastUpdatedFlow, lastUpdatedConfig]);


    useEffect(() => {
        if (passedPaymentSession === null) {
            const savedConfig = localStorage.getItem('flowConfig');
            if (savedConfig) {
                try {
                    const parsedConfig = JSON.parse(savedConfig);
                    const loadedConfig = {
                        ...defaultConfig, // Start with all defaults
                        ...parsedConfig, // Overlay saved top-level properties
                        // Ensure billingAddress is an object, even if parsedConfig.billingAddress was null/undefined
                        billingAddress: {
                            ...defaultConfig.billingAddress,
                            ...(parsedConfig.billingAddress || {})
                        }
                    };
                    setConfig(loadedConfig);
                    setLastUpdatedConfig(new Date());
                } catch (e) {
                    console.error("Failed to parse flowConfig from localStorage", e);
                    localStorage.removeItem('flowConfig');
                }
            }
        }
    }, [passedPaymentSession]);

    useEffect(() => {
        if (passedPaymentSession === null) {
            localStorage.setItem('flowConfig', JSON.stringify(config));
            setLastUpdatedConfig(new Date());
        }
    }, [config, passedPaymentSession]);


    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem('flowConfig');
        // --- Also clear the saved JSON payload on reset ---
        localStorage.removeItem('flowJsonPayload');
        setJsonInput(JSON.stringify(defaultSessionPayload, null, 2));
        setSessionPayload(defaultSessionPayload);
        setInternalPaymentSessionDetails(null);
        setLastUpdatedSession(null);
        setLastUpdatedFlow(null);
        setLastUpdatedConfig(null);
        acceptedTermsRef.current = false;
        setShowMainContent(passedPaymentSession !== null);
    };

    const handleTermsAcceptance = (e) => {
        acceptedTermsRef.current = e.target.checked;
        setConfig(prevConfig => ({ ...prevConfig, forceTermsAcceptance: e.target.checked }));
    };

    const handleCountryChange = (e) => {
        const selectedCountryCode = e.target.value;
        const selectedCountry = countries.find(c => c.code === selectedCountryCode);

        setConfig(prevConfig => ({
            ...prevConfig,
            country: selectedCountryCode,
            currency: selectedCountry ? selectedCountry.currency : prevConfig.currency,
            // --- FIX: Ensure billingAddress.country is updated from here too ---
            billingAddress: {
                ...(prevConfig.billingAddress || {}), // Ensure prevConfig.billingAddress is an object
                country: selectedCountryCode
            }
        }));
    };
    

    // --- FIX: handleBillingAddressChange function to ensure prevConfig.billingAddress is object ---
    const handleBillingAddressChange = (e) => {
        const { name, value } = e.target;
        setConfig(prevConfig => {
            const currentBillingAddress = prevConfig.billingAddress || {}; // Ensure it's an object
            return {
                ...prevConfig,
                billingAddress: {
                    ...currentBillingAddress, // Spread the current (or defaulted) billing address
                    [name]: value
                }
            };
        });
    };

    // --- MODIFIED: Saves JSON to localStorage on every change ---
    const handleJsonInputChange = (e) => {
        const value = e.target.value;
        setJsonInput(value); // Keep the raw string in sync with the textarea
        localStorage.setItem('flowJsonPayload', value); // Save to localStorage
        try {
            const parsedJson = JSON.parse(value);
            setSessionPayload(parsedJson); // Update the actual data object
            setJsonError(null); // Clear any previous error
        } catch (error) {
            setJsonError('Invalid JSON format.'); // Set an error message to give user feedback
        }
    };


    const SessionRequest = async () => {
        setLoading(true);
        setInternalPaymentSessionDetails(null);

        if (jsonError) {
            toast.error("Cannot create session. Please fix the invalid JSON.");
            setLoading(false);
            return;
        }

        try {
            // The payload is now the validated sessionPayload state
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, sessionPayload);

            setInternalPaymentSessionDetails(response.data);
            setLastUpdatedSession(new Date());
            toast.success("Payment session created successfully!");

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session: ' + (error.response?.data?.error || error.message));
            setInternalPaymentSessionDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const translations = {
        en: {
          'form.required': 'Please provide this field',
          'form.full_name.placeholder': 'Mark Reilly',
          'pay_button.pay': 'Pay',
          'pay_button.payment_failed': 'Payment failed, please try again',
        },
      };

    useEffect(() => {
        const sessionToUse = passedPaymentSession || internalPaymentSessionDetails;

        if (!showMainContent || !sessionToUse?.id) {
            if (showMainContent && !sessionToUse?.id && passedPaymentSession === null) {
                 console.log("Waiting for payment session details to load Flow component.");
            }
            return;
        }

        const flowContainer = document.getElementById('flow-container');
        if (flowContainer) {
            flowContainer.innerHTML = '';
        }

        const publicKey = config.publicKey;

        const initializeFlowComponent = async (sessionObject) => {
            try {
                console.log('Public Key:', publicKey);

                const checkout = await loadCheckoutWebComponents({
                    paymentSession: sessionObject,
                    publicKey,
                    onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    //avigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);fdfd
                    
                },
                    environment: config.environment,
                    locale: config.locale,
                    translations,
                    componentOptions: {
                        flow: {
                          expandFirstPaymentMethod: config.flowExpandFirstPaymentMethod,
                        },
                        card: {
                            data: {
                                displayCardholderName: config.cardDisplayCardholderName,
                            },
                            acceptedCardTypes: ['credit', 'charge', 'deferred_debit', 'prepaid'],
                        },
                    },

                
                onError: (_component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                    //navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                }
            });
            const flowComponent = checkout.create('flow');
            flowComponent.mount('#flow-container');
            flowComponentRef.current = flowComponent;
            
            setLastUpdatedFlow(new Date());

           /*  (async () => {
                // const klarnaComponent = checkout.create("klarna");
                // const klarnaElement = document.getElementById('klarna-container');
                if (await flowComponent.isAvailable()) {
                    flowComponent.mount('#flow-container');
                }
            })(); */
             flowComponent.mount('#flow-container');

            } catch (err) {
                console.error("Checkout Web Components Error:", err);
                toast.error("Error loading Flow component: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        initializeFlowComponent(sessionToUse);

    }, [internalPaymentSessionDetails, passedPaymentSession, config, showMainContent, API_BASE_URL]);


    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('status');
        const paymentId = urlParams.get('cko-payment-id');

        if (paymentStatus === 'succeeded') {
            toast.success('Payment succeeded!');
        } else if (paymentStatus === 'failed') {
            toast.error('Payment failed. Please try again.');
        }

        if (paymentId) {
            console.log('Payment ID from URL:', paymentId);
        }
    }, []);

    const handleInitialModeSelection = () => {
        setShowMainContent(true);
    };


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Flow Test Suite</h1>

            {!showMainContent && passedPaymentSession === null ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Choose your Flow scenario</h2>
                        <button
                            onClick={handleInitialModeSelection}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out"
                        >
                            Flow Demo
                        </button>
                        <button
                            onClick={() => navigate('/flowHandleSubmit')}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to handleSubmit Demo
                        </button>
                        <button
                            onClick={() => navigate('/flowHandleClick')}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to handleClick Demo
                        </button>
                        <button
                            onClick={() => navigate('/rememberMe')}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-teal-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to Remember Me Demo
                        </button>
                        <button
                            onClick={() => navigate('/tokenization')}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-teal-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to Tokenization Demo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Contains two stacked cards */}
                    <div className="flex flex-col gap-6">
                        {/* TOP LEFT CARD: Flow Configuration Panel */}
                        {passedPaymentSession === null && (
                            <Card>
                                <Card.Body>
                                    <Card.Title className="text-center">Flow Component & Configuration</Card.Title>
                                    <div className="p-4 bg-gray-50 rounded-lg shadow-inner mb-4">
                                        <h3 className="text-lg font-semibold mb-3">Core Flow Settings</h3>

                                        <div className="flex gap-4 mb-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-1">Public Key</label>
                                                <input
                                                    type="text"
                                                    value={config.publicKey}
                                                    onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                                                    className="w-full border rounded px-3 py-2"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-1">Environment</label>
                                                <select
                                                    value={config.environment}
                                                    onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                                                    className="w-full border rounded px-3 py-2"
                                                >
                                                    <option value="sandbox">Sandbox</option>
                                                    <option value="production">Production</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Locale (e.g., en, es, fr)</label>
                                            <input
                                                type="text"
                                                value={config.locale}
                                                onChange={(e) => setConfig({ ...config, locale: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>

                                        <h3 className="text-lg font-semibold mb-3 mt-4">Flow Component Options</h3>
                                        <div className="mb-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={config.flowExpandFirstPaymentMethod}
                                                    onChange={(e) => setConfig({ ...config, flowExpandFirstPaymentMethod: e.target.checked })}
                                                    className="form-checkbox h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-gray-700">Expand First Payment Method (on load)</span>
                                            </label>
                                        </div>

                                        <h3 className="text-lg font-semibold mb-3 mt-4">Card Component Options (within Flow)</h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Display Cardholder Name</label>
                                            <select
                                                value={config.cardDisplayCardholderName}
                                                onChange={(e) => setConfig({ ...config, cardDisplayCardholderName: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                <option value="top">Top</option>
                                                <option value="bottom">Bottom</option>
                                                <option value="hide">Hide</option>
                                            </select>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Card Data Email (pre-fill)</label>
                                            <input
                                                type="email"
                                                value={config.cardDataEmail}
                                                onChange={(e) => setConfig({ ...config, cardDataEmail: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>

                                        <h3 className="text-lg font-semibold mb-3 mt-4">`handleClick` Logic</h3>
                                        <div className="mb-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={config.forceTermsAcceptance}
                                                    onChange={handleTermsAcceptance}
                                                    className="form-checkbox h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-gray-700">Require Terms Acceptance (controls `handleClick`)</span>
                                            </label>
                                        </div>

                                        <button
                                            onClick={handleReset}
                                            className="mt-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                        >
                                            Reset to Defaults
                                        </button>
                                    </div>
                                </Card.Body>
                                <Card.Footer>
                                    <small className="text-muted">{timeAgoConfig}</small>
                                </Card.Footer>
                            </Card>
                        )}

                        {/* BOTTOM LEFT CARD: Session Request - Now includes Country & Currency selection */}
                        {passedPaymentSession === null && (
                             <Card>
                                <Card.Body>
                                    <Card.Title className="text-center">Request a New Payment Session (JSON)</Card.Title>
                                    <Card.Text>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Session Request Payload</label>
                                            <label className="block text-sm font-medium mb-1">Do not add processing channel, successURL & failureURL </label>
                                            <textarea
                                                value={jsonInput}
                                                onChange={handleJsonInputChange}
                                                className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                                                rows={15}
                                                placeholder="Enter session request JSON here..."
                                            />
                                            {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                                        </div>
                                        <div className="text-center mt-4">
                                            <button 
                                                onClick={SessionRequest} 
                                                disabled={loading || !!jsonError} 
                                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? "Processing..." : "Create Session"}
                                            </button>
                                            <br />
                                            {internalPaymentSessionDetails && <p className="mt-2 text-sm text-gray-600">Session ID: {internalPaymentSessionDetails.id}</p>}
                                        </div>
                                    </Card.Text>
                                </Card.Body>
                                <Card.Footer>
                                    <small className="text-muted">{timeAgoSession}</small>
                                </Card.Footer>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Flow Component Display */}
                    <Card>
                        <Card.Body className="flex flex-col h-full">
                            <Card.Title className="text-center">Flow Component Display</Card.Title>
                            {/* Render Flow component only if a session is available */}
                            {internalPaymentSessionDetails?.id && (
                                <>
                                    <div id="flow-container" className="mt-4" flex-grow w-full></div>
                                </>
                            )}
                            {!internalPaymentSessionDetails?.id && (
                                <p className="text-center text-gray-500 mt-4">
                                    {passedPaymentSession ? "Loading payment component..." : "Click 'Create Session' to load the payment component."}
                                </p>
                            )}
                        </Card.Body>
                        <Card.Footer>
                            <button onClick={() => flowComponentRef.current && flowComponentRef.current.submit()} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                Submit Payment
                            </button>
                        </Card.Footer>
                    </Card>
                    
                </div>
            )}
            {paymentIdFromUrl && (
                <div className="text-center my-3">
                    <p className="text-success">Payment completed!</p>
                    <p>
                        <strong>Payment ID:</strong> <code>{paymentIdFromUrl}</code>
                    </p>
                </div>
            )}
        </div>
    );
};

export default Flow;
