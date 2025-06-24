import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate } from "react-router-dom";

// Country to Currency Mapping (essential for session creation)
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
];

// --- Simplified Default Configuration for this specific demo ---
const demoDefaultConfig = {
    demoAmount: '50.00',
    demoEmail: 'test@example.com',
    demoCountry: 'GB',
    demoCurrency: 'GBP',
    demoBillingAddress: {
        address_line1: '123 Main St',
        address_line2: '',
        city: 'London',
        zip: 'SW1A 0AA',
        country: 'GB'
    }
};

const FlowHandleSubmit = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false); // For session creation button
    const [flowPaymentSession, setFlowPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");

    const [demoConfig, setDemoConfig] = useState(demoDefaultConfig);

    // Ref to hold the `triggerValidation` function passed by the Flow component
    const triggerValidationRef = useRef(null);
    // New state for loading during the handleSubmit API call
    const [submissionLoading, setSubmissionLoading] = useState(false);


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


    const handleDemoAmountChange = (e) => setDemoConfig(prev => ({ ...prev, demoAmount: e.target.value }));
    const handleDemoEmailChange = (e) => setDemoConfig(prev => ({ ...prev, demoEmail: e.target.value }));

    const handleDemoCountryChange = (e) => {
        const selectedCountryCode = e.target.value;
        const selectedCountry = countries.find(c => c.code === selectedCountryCode);
        setDemoConfig(prev => ({
            ...prev,
            demoCountry: selectedCountryCode,
            demoCurrency: selectedCountry ? prev.demoCurrency : prev.demoCurrency, // Only set currency if country found
            demoBillingAddress: {
                ...(prev.demoBillingAddress || {}),
                country: selectedCountryCode
            }
        }));
    };

    const handleDemoBillingAddressChange = (e) => {
        const { name, value } = e.target;
        setDemoConfig(prev => ({
            ...prev,
            demoBillingAddress: {
                ...(prev.demoBillingAddress || {}),
                [name]: value
            }
        }));
    };


    const createPaymentSession = async () => {
        setLoading(true);
        setFlowPaymentSession(null);
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
                email: demoConfig.demoEmail,
                country: demoConfig.demoCountry,
                currency: demoConfig.demoCurrency,
                billing_address: demoConfig.demoBillingAddress,
            });

            setFlowPaymentSession(response.data);
            setLastUpdatedSession(new Date());
            toast.success("Payment session created successfully! Flow component loading...");

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session: ' + (error.response?.data?.error || error.message));
            setFlowPaymentSession(null);
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Custom Submit Button Handler (triggers Flow's internal validation) ---
    const handleCustomSubmit = useCallback(() => {
        if (triggerValidationRef.current) {
            toast.info("Custom submit button clicked! Triggering Flow validation...");
            triggerValidationRef.current(); // Calls the stored triggerValidation function
        } else {
            toast.error("Flow component not initialized or triggerValidation not available.");
        }
    }, []); // No dependencies needed as triggerValidationRef is stable


    // --- Core useEffect for Initializing and Mounting Flow Component ---
    useEffect(() => {
        if (!flowPaymentSession?.id) {
            // Clear any old component if session disappears
            const flowContainer = document.getElementById('flow-container');
            if (flowContainer) {
                flowContainer.innerHTML = '';
            }
            // Clear triggerValidationRef if no session is active
            triggerValidationRef.current = null;
            return;
        }

        const initializeFlowComponent = async (sessionObject) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: sessionObject,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4', // Hardcoded public key for this demo
                    environment: 'sandbox', // Hardcoded environment
                    locale: 'en', // Hardcoded locale
                    componentOptions: {
                        flow: {
                          expandFirstPaymentMethod: false, // Hardcoded
                          // --- IMPORTANT: Modified handleSubmit callback ---
                          handleSubmit: async (flowComponent, submitData) => {
                              setSubmissionLoading(true); // Start loading for submission API call
                              toast.info("`handleSubmit` invoked! Submitting customized payment...");
                              try {
                                  // --- Call your backend to submit customized payment ---
                                  // This backend endpoint should then call Checkout.com's
                                  // "Submit a Payment Session Payment" endpoint.
                                  const response = await axios.post(`${API_BASE_URL}api/submit-flow-session-payment`, {
                                      session_data: submitData.session_data, // The token from Flow
                                      payment_session_id: flowPaymentSession.id, // The ID of the session we created earlier
                                      amount: Math.round(parseFloat(demoConfig.demoAmount) * 100), // Current amount
                                      currency: demoConfig.demoCurrency, // Current currency
                                      country: demoConfig.demoCountry, // Current country
                                      email: demoConfig.demoEmail, // Current email
                                      billing_address: demoConfig.demoBillingAddress, // Current billing address
                                      // ... any other custom data you need to pass for payment submission
                                  });

                                  // --- Based on backend's response, complete the Flow component ---
                                  if (response.data.status === 'Succeeded' || response.data.status === 'Authorized' || response.data.status === 'Captured') {
                                      flowComponent.completePayment(window.Checkout.ApplePaySession.STATUS_SUCCESS); // Assuming STATUS_SUCCESS from CKO Web Components SDK
                                      toast.success("Payment submitted successfully!");
                                      navigate(`/success?cko-payment-id=${response.data.payment_id}&status=succeeded`);
                                  } else {
                                      flowComponent.completePayment(window.Checkout.ApplePaySession.STATUS_FAILURE);
                                      toast.error(`Payment failed: ${response.data.status}`);
                                      navigate(`/failure?cko-payment-id=${response.data.payment_id || 'N/A'}&status=failed`);
                                  }
                              } catch (error) {
                                  flowComponent.completePayment(window.Checkout.ApplePaySession.STATUS_FAILURE);
                                  toast.error("Error submitting payment via backend. See console.");
                                  console.error("Custom Submit Error:", error.response ? error.response.data : error.message);
                              } finally {
                                  setSubmissionLoading(false); // Stop loading regardless of outcome
                              }
                          },
                        },
                        card: { // Hardcoded card options for this demo
                          displayCardholderName: 'bottom',
                          data: {
                            email: demoConfig.demoEmail,
                            country: demoConfig.demoCountry,
                            currency: demoConfig.demoCurrency,
                            billing_address: demoConfig.demoBillingAddress,
                          },
                        },
                    },
                    // onPaymentCompleted and onError callbacks will NOT be called if handleSubmit takes control.
                    // However, it's good practice to keep them for fallback or other non-handleSubmit paths.
                    onPaymentCompleted: (_component, paymentResponse) => {
                        toast.success('Payment completed (standard)!');
                        console.log("Standard Payment Completed:", paymentResponse);
                    },
                    onError: (component, error) => {
                        toast.error('Payment failed (standard)!');
                        console.error("Standard Payment Error:", error);
                    }
                });
                const flowComponent = checkout.create('flow');
                
                if (await flowComponent.isAvailable()) {
                    flowComponent.mount('#flow-container');
                    setLastUpdatedFlow(new Date());
                } else {
                    toast.error("Flow component is not available for mounting.");
                }

                // Klarna component (if needed)
                const klarnaComponent = checkout.create("klarna");
                const klarnaElement = document.getElementById('klarna-container');
                if (klarnaElement && await klarnaComponent.isAvailable()) {
                    klarnaComponent.mount(klarnaElement);
                }

            } catch (err) {
                console.error("Checkout Web Components Error:", err);
                toast.error("Error loading Flow component: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        initializeFlowComponent(flowPaymentSession);

    }, [flowPaymentSession, API_BASE_URL, navigate, demoConfig]);


    // For URL parameters (kept for success/failure redirects)
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


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Checkout.com Flow `handleSubmit` Demo</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT COLUMN: Information Box + Session Request */}
                <div className="flex flex-col gap-6">
                    {/* TOP LEFT CARD: Information about handleSubmit */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">About `handleSubmit`</Card.Title>
                            <Card.Text>
                                <p className="text-gray-700">
                                    The <code>handleSubmit()</code> callback in Checkout.com Flow component is used when you want to control the payment submission process with your **own custom submit button**.
                                </p>
                                <p className="text-gray-700 mt-2">
                                    Instead of the Flow component having its own "Pay" button, this demo provides a custom "Submit Payment" button. When clicked, it calls a function (`triggerValidation`) exposed by the Flow component to initiate validation and payment processing.
                                </p>
                                <p className="text-gray-700 mt-2">
                                    The `handleSubmit` callback then receives a <code>session_data</code> token, which this demo uses to submit the payment to your backend (<code>/api/submit-flow-session-payment</code>) for **customized processing**.
                                </p>
                            </Card.Text>
                        </Card.Body>
                    </Card>

                    {/* BOTTOM LEFT CARD: Session Request */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Request a new payment session</Card.Title>
                            <Card.Text>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Amount ($)</label>
                                    <input
                                        type="text"
                                        value={demoConfig.demoAmount}
                                        onChange={handleDemoAmountChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Customer Email</label>
                                    <input
                                        type="email"
                                        value={demoConfig.demoEmail}
                                        onChange={handleDemoEmailChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Country</label>
                                    <select
                                        value={demoConfig.demoCountry}
                                        onChange={handleDemoCountryChange}
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
                                    <label className="block text-sm font-medium mb-1">Currency (Auto-selected)</label>
                                    <input
                                        type="text"
                                        value={demoConfig.demoCurrency}
                                        readOnly
                                        className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <h3 className="text-lg font-semibold mb-3 mt-4">Billing Address</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Address Line 1</label>
                                        <input
                                            type="text"
                                            name="address_line1"
                                            value={demoConfig.demoBillingAddress?.address_line1 || ''} 
                                            onChange={handleDemoBillingAddressChange}
                                            className="w-full border rounded px-3 py-2"
                                            placeholder="123 Main St"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                                        <input
                                            type="text"
                                            name="address_line2"
                                            value={demoConfig.demoBillingAddress?.address_line2 || ''} 
                                            onChange={handleDemoBillingAddressChange}
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
                                                value={demoConfig.demoBillingAddress?.city || ''}
                                                onChange={handleDemoBillingAddressChange}
                                                className="w-full border rounded px-3 py-2"
                                                placeholder="London"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Zip Code</label>
                                            <input
                                                type="text"
                                                name="zip"
                                                value={demoConfig.demoBillingAddress?.zip || ''} 
                                                onChange={handleDemoBillingAddressChange}
                                                className="w-full border rounded px-3 py-2"
                                                placeholder="SW1A 0AA"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-4">
                                    <button onClick={createPaymentSession} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50">
                                        {loading ? "Processing..." : "Create Session"}
                                    </button>
                                    <br />
                                    {flowPaymentSession && <p className="mt-2 text-sm text-gray-600">Session ID: {flowPaymentSession.id}</p>}
                                </div>
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoSession}</small>
                        </Card.Footer>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Flow Component Display and Custom Submit Button */}
                <Card>
                    <Card.Body className="flex flex-col h-full p-0">
                        <Card.Title className="text-center p-4">Flow Component Display</Card.Title>
                        {/* Render Flow component only if a session is available */}
                        {flowPaymentSession?.id ? (
                            <>
                                <div
                                    id="flow-container"
                                    className="mt-4 flex-grow w-full"
                                    style={{ minHeight: '500px', height: 'auto', minWidth: '350px', width: 'auto' }}
                                ></div>
                                <div
                                    id='klarna-container'
                                    className="mt-4 flex-grow w-full"
                                    style={{ minHeight: '100px', height: 'auto', minWidth: '350px', width: 'auto' }}
                                ></div>
                                {/* --- Custom Submit Button for handleSubmit --- */}
                                <div className="text-center mt-4 p-4">
                                    <button
                                        onClick={handleCustomSubmit}
                                        disabled={!triggerValidationRef.current || submissionLoading} // Disable if Flow not ready or submitting
                                        className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out disabled:opacity-50"
                                    >
                                        {submissionLoading ? 'Submitting Payment...' : 'Submit Payment (via `handleSubmit`)'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-gray-500 mt-4">
                                Click 'Create Session' to load the payment component.
                            </p>
                        )}
                    </Card.Body>
                    <Card.Footer>
                        <small className="text-muted">{timeAgoFlow}</small>
                    </Card.Footer>
                </Card>
            </div>
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

export default FlowHandleSubmit;