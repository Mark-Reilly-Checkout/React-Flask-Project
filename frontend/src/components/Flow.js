import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams } from "react-router-dom";

// Default configuration for Flow.js
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
    // --- Removed flowMode and existingSessionId as options ---
    // flowMode: 'createNewSession',
    // existingSessionId: ''
};

const Flow = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSessionDetails, setPaymentSessionDetails] = useState(null); // Holds the FULL session object
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");

    const [config, setConfig] = useState(defaultConfig);
    const acceptedTermsRef = useRef(false);

    // --- Simplified initial selection state ---
    const [showMainContent, setShowMainContent] = useState(false);
    // Removed initialFlowMode and tempExistingSessionId as they are no longer options
    // const [initialFlowMode, setInitialFlowMode] = useState(defaultConfig.flowMode);
    // const [tempExistingSessionId, setTempExistingSessionId] = useState(defaultConfig.existingSessionId);


    const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
    const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);

    const [timeAgoSession, setTimeAgoSession] = useState('');
    const [timeAgoFlow, setTimeAgoFlow] = useState('');


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
        }, 60000);

        return () => clearInterval(interval);
    }, [lastUpdatedSession, lastUpdatedFlow]);


    useEffect(() => {
        const savedConfig = localStorage.getItem('flowConfig');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                setConfig(parsedConfig);
                // No need to sync initialFlowMode or tempExistingSessionId anymore
            } catch (e) {
                console.error("Failed to parse flowConfig from localStorage", e);
                localStorage.removeItem('flowConfig');
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('flowConfig', JSON.stringify(config));
    }, [config]);


    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem('flowConfig');
        setPaymentSessionDetails(null);
        setLastUpdatedSession(null);
        setLastUpdatedFlow(null);
        acceptedTermsRef.current = false;
        setShowMainContent(false); // Reset to initial screen
        // No need to reset initialFlowMode or tempExistingSessionId
    };

    const handleTermsAcceptance = (e) => {
        acceptedTermsRef.current = e.target.checked;
        setConfig(prevConfig => ({ ...prevConfig, forceTermsAcceptance: e.target.checked }));
    };


    const SessionRequest = async () => {
        setLoading(true);
        setPaymentSessionDetails(null);
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(parseFloat(config.initialAmount) * 100),
                email: config.initialEmail
            });

            setPaymentSessionDetails(response.data);
            setLastUpdatedSession(new Date());
            toast.success("Payment session created successfully!");

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session: ' + (error.response?.data?.error || error.message));
            setPaymentSessionDetails(null);
        } finally {
            setLoading(false);
        }
    };

    // Removed loadExistingFlowComponent as the option is no longer available
    // const loadExistingFlowComponent = async () => { /* ... */ };


    const translations = {
        en: {
          'form.required': 'Please provide this field',
          'form.full_name.placeholder': 'Mark Reilly',
          'pay_button.pay': 'Pay now',
          'pay_button.payment_failed': 'Payment failed, please try again',
        },
      };

    useEffect(() => {
        if (!showMainContent) return; // Only initialize if main content is visible

        const flowContainer = document.getElementById('flow-container');
        if (flowContainer) {
            flowContainer.innerHTML = ''; // Clear previous component if any
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
                          handleClick: (_self) => {
                              if (config.forceTermsAcceptance && !acceptedTermsRef.current) {
                                  toast.warn("Please accept the terms and conditions before paying.");
                                  return { continue: false };
                              } else {
                                  toast.info("Proceeding with payment...");
                                  return { continue: true };
                              }
                          },
                        },
                        card: {
                          displayCardholderName: config.cardDisplayCardholderName,
                          data: {
                            email: config.cardDataEmail,
                          },
                        },
                      },

                onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    console.log("Payment ID:", paymentResponse.id);
                },
                onError: (component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                }
            });
            const flowComponent = checkout.create('flow');
            flowComponent.mount('#flow-container');
            setLastUpdatedFlow(new Date());

            (async () => {
                const klarnaComponent = checkout.create("klarna");
                const klarnaElement = document.getElementById('klarna-container');
                if (await klarnaComponent.isAvailable()) {
                    klarnaComponent.mount(klarnaElement);
                }
            })();

            } catch (err) {
                console.error("Checkout Web Components Error:", err);
                toast.error("Error loading Flow component: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        // Simplified logic: Only initialize if paymentSessionDetails is available
        if (paymentSessionDetails?.id) {
            initializeFlowComponent(paymentSessionDetails);
        } else {
            console.log("Waiting for payment session details to load Flow component.");
        }
    }, [paymentSessionDetails, config, showMainContent]); // Dependencies


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

    // Simplified handleInitialModeSelection
    const handleInitialModeSelection = () => {
        // No more dropdown selection, just proceed to show main content
        setShowMainContent(true);
    };


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Checkout.com Flow Test Suite</h1>

            {!showMainContent ? (
                // Initial screen: Simplified to only show "Create New Session"
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
                    </div>
                </div>
            ) : (
                // Main content: Grid layout
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Session Request (Always shown and only option) */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Request a new payment session</Card.Title>
                            <Card.Text>
                                <>
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
                                    <div className="text-center">
                                        <button onClick={SessionRequest} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                            {loading ? "Processing..." : "Create Session"}
                                        </button>
                                        <br />
                                        {paymentSessionDetails && <p className="mt-2 text-sm text-gray-600">Session ID: {paymentSessionDetails.id}</p>}
                                    </div>
                                </>
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoSession}</small>
                        </Card.Footer>
                    </Card>


                    {/* Card 2: Flow Module and General Configuration Panel (Always full width if only one option) */}
                    <Card className="md:col-span-1"> {/* Always span 1 column, as Card 1 is always present */}
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

                            <div id="flow-container" className="mt-4"></div>
                            <div id='klarna-container' className="mt-4"></div>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoFlow}</small>
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