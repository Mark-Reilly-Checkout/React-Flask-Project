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

// Simplified Default Configuration for this specific demo
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
    },
    threeDsEnabled: false,
};

const FlowHandleSubmit = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false); // For session creation button
    const [flowPaymentSession, setFlowPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");

    const [demoConfig, setDemoConfig] = useState(demoDefaultConfig);

    // Ref to store the actual FlowComponent instance
    const flowComponentInstanceRef = useRef(null);
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
            demoCurrency: selectedCountry ? selectedCountry.currency : prev.demoCurrency, // Only set currency if country found
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
        setFlowPaymentSession(null); // Clear previous session
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
                email: demoConfig.demoEmail,
                country: demoConfig.demoCountry,
                currency: demoConfig.demoCurrency,
                billing_address: demoConfig.demoBillingAddress,
                threeDsEnabled: demoConfig.threeDsEnabled,
            });

            setFlowPaymentSession(response.data); // Store the full session object
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

    // Custom Submit Button Handler (calls flowComponentInstanceRef.current.submit())
    const handleCustomSubmit = useCallback(() => {
        if (flowComponentInstanceRef.current) {
            toast.info("Custom submit button clicked! Calling FlowComponent.submit()...");
            flowComponentInstanceRef.current.submit(); // <--- CALL THE SUBMIT METHOD HERE
        } else {
            toast.error("Flow component not initialized. Please create a session first.");
        }
    }, []);


    // Core useEffect for Initializing and Mounting Flow Component
    useEffect(() => {
        if (!flowPaymentSession?.id) {
            // Clear any old component if session disappears
            const flowContainer = document.getElementById('flow-container');
            if (flowContainer) {
                flowContainer.innerHTML = '';
            }
            flowComponentInstanceRef.current = null; // Clear the ref
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
                          // IMPORTANT: Modified handleSubmit callback
                          handleSubmit: async (flowComponent, submitData) => {
                              setSubmissionLoading(true); // Start loading for submission API call
                              toast.info("`handleSubmit` invoked! Submitting customized payment...");
                              try {
                                  const response = await axios.post(`${API_BASE_URL}api/submit-flow-session-payment`, {
                                      session_data: submitData.session_data, // The token from Flow
                                      payment_session_id: flowPaymentSession.id, // The ID of the session we created earlier
                                      amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
                                      currency: demoConfig.demoCurrency,
                                      country: demoConfig.demoCountry,
                                      email: demoConfig.demoEmail,
                                      billing_address: demoConfig.demoBillingAddress,
                                      threeDsEnabled: demoConfig.threeDsEnabled,
                                  });

                                  if (response.data.status === 'Succeeded' || response.data.status === 'Authorized' || response.data.status === 'Captured') {
                                      // Correctly using FlowComponent instance from handleSubmit callback
                                      flowComponent.completePayment(window.Checkout.ApplePaySession.STATUS_SUCCESS);
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
                        card: {
                            data: {
                                displayCardholderName: demoConfig.cardDisplayCardholderName,
                            },
                        },
                    },
                    // onPaymentCompleted and onError callbacks will NOT be called if handleSubmit takes control.
                    // However, it's good practice to keep them for fallback or other non-handleSubmit paths.
                    onPaymentCompleted: (_component, paymentResponse) => {
                        toast.success('Payment completed (standard)!');
                        console.log("Standard Payment Completed:", paymentResponse);
                        navigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
                    },
                    onError: (component, error) => {
                        toast.error('Payment failed (standard)!');
                        console.error("Standard Payment Error:", error);
                        navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                    }
                });
                const flowComponent = checkout.create('flow');
                // Store the flowComponent instance in the ref
                flowComponentInstanceRef.current = flowComponent;
                
                if (await flowComponent.isAvailable()) {
                    flowComponent.mount('#flow-container');
                    setLastUpdatedFlow(new Date());
                } else {
                    toast.error("Flow component is not available for mounting.");
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
                                    The <code>handleSubmit()</code> callback in Checkout.com Flow component is invoked by the Flow component itself when its internal form is submitted.
                                </p>
                                <p className="text-gray-700 mt-2">
                                    To trigger this, you call <code>FlowComponent.submit()</code> from your own custom button.
                                </p>
                                <p className="text-gray-700 mt-2">
                                    The <code>handleSubmit</code> callback then receives a <code>submitData</code> object (containing <code>session_data</code>) which this demo uses to submit the payment to your backend (<code>/api/submit-flow-session-payment</code>) for **customized processing**.
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
                                    <label className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={demoConfig.threeDsEnabled}
                                            onChange={(e) => setDemoConfig({ ...demoConfig, threeDsEnabled: e.target.checked })}
                                            className="form-checkbox h-4 w-4 text-blue-600"
                                        />
                                        <span className="ml-2 text-gray-700">Enable 3D Secure (on payment)</span>
                                    </label>
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
                                        disabled={!flowComponentInstanceRef.current || submissionLoading} // Disable if Flow instance not set or submitting
                                        className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out disabled:opacity-50"
                                    >
                                        {submissionLoading ? 'Submitting Payment...' : 'Submit Payment (via `FlowComponent.submit()`)'}
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