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
    threeDsEnabled: false,
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


    const SessionRequest = async () => {
        setLoading(true);
        setInternalPaymentSessionDetails(null);
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(parseFloat(config.initialAmount) * 100),
                email: config.initialEmail,
                country: config.country,
                currency: config.currency,
                billing_address: config.billingAddress,
                paymentType: config.paymentType,
                threeDsEnabled: config.threeDsEnabled
            });

            console.log("Billing Address:", config.billingAddress);

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
          'pay_button.pay': 'Pay now',
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

        const initializeFlowComponent = async (sessionObject) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: sessionObject,
                    publicKey: config.publicKey,
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
                        },
                    },

                onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    //avigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
                    
                },
                onError: (_component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                    //navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                }
            });
            const flowComponent = checkout.create('flow',{
                // --- IMPORTANT: handleClick callback implementation ---
                                          handleClick: (_self) => {
                                              
                                                  toast.warn("Please accept the terms and conditions to proceed!");
                                                  return { continue: false }; // Prevent the payment flow from starting
                        
                                          },
                                          showPayButton: false,
                                          
            });
            flowComponent.mount('#flow-container');
            flowComponentRef.current = flowComponent;
            
            setLastUpdatedFlow(new Date());

            (async () => {
                // const klarnaComponent = checkout.create("klarna");
                // const klarnaElement = document.getElementById('klarna-container');
                if (await flowComponent.isAvailable()) {
                    flowComponent.mount('#flow-container');
                }
            })();

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
            <h1 className="text-3xl font-bold text-center mb-8">Checkout.com Flow Test Suite</h1>

            {!showMainContent && passedPaymentSession === null ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Ready to test the Flow Component?</h2>
                        <p className="mb-6 text-gray-700">Click below to create a new payment session and load the Flow UI.</p>
                        <button
                            onClick={handleInitialModeSelection}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out"
                        >
                            Start New Session
                        </button>
                        <button
                            onClick={() => navigate('/flowHandleSubmit')}
                            className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to handleSubmit Demo
                        </button>
                        <button
                            onClick={() => navigate('/flowHandleClick')}
                            className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out mt-4"
                        >
                            Go to handleClick Demo
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
                                        <div className="mb-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={config.threeDsEnabled}
                                                    onChange={(e) => setConfig({ ...config, threeDsEnabled: e.target.checked })}
                                                    className="form-checkbox h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-gray-700">Enable 3D Secure (on payment)</span>
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
                                    <Card.Title className="text-center">Request a new payment session</Card.Title>
                                    <Card.Text>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Amount ($)</label>
                                            <input
                                                type="text"
                                                value={config.initialAmount}
                                                onChange={(e) => setConfig({ ...config, initialAmount: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Customer Email</label>
                                            <input
                                                type="email"
                                                value={config.initialEmail}
                                                onChange={(e) => setConfig({ ...config, initialEmail: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Country</label>
                                            <select
                                                value={config.country}
                                                onChange={handleCountryChange}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                {countries.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Payment Type</label>
                                            <select
                                                value={config.paymentType}
                                                onChange={(e) => setConfig({ ...config, paymentType: e.target.value })}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                {paymentTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Currency (Auto-selected)</label>
                                            <input
                                                type="text"
                                                value={config.currency}
                                                readOnly
                                                className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                                            />
                                        </div>
                                        {/* --- NEW: Billing Address Fields --- */}
                                        <h3 className="text-lg font-semibold mb-3 mt-4">Billing Address</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    name="address_line1"
                                                    value={config.billingAddress?.address_line1 || ''} 
                                                    onChange={handleBillingAddressChange}
                                                    className="w-full border rounded px-3 py-2"
                                                    placeholder="123 Main St"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="address_line2"
                                                    value={config.billingAddress?.address_line2 || ''} 
                                                    onChange={handleBillingAddressChange}
                                                    className="w-full border rounded px-3 py-2"
                                                    placeholder="Apt 4B"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium mb-1">City</label>
                                                    <input
                                                        type="text"
                                                        name="city"
                                                        value={config.billingAddress?.city || ''}
                                                        onChange={handleBillingAddressChange}
                                                        className="w-full border rounded px-3 py-2"
                                                        placeholder="London"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium mb-1">Zip Code</label>
                                                    <input
                                                        type="text"
                                                        name="zip"
                                                        value={config.billingAddress?.zip || ''} 
                                                        onChange={handleBillingAddressChange}
                                                        className="w-full border rounded px-3 py-2"
                                                        placeholder="SW1A 0AA"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center mt-4">
                                            <button onClick={SessionRequest} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
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