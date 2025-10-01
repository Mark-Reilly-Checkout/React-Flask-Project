import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";

// Default configuration for the demo
const defaultConfig = {
    cardTypeToReject: 'none', // 'none', 'credit', or 'debit'
};

const OnAuthorized = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [config, setConfig] = useState(defaultConfig);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    const flowComponentRef = useRef(null);

    // Function to create the payment session
    const createPaymentSession = async () => {
        setLoading(true);
        setPaymentSession(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, {
                amount: 1099,
                currency: "GBP",
                reference: `on-authorized-demo-${Date.now()}`,
                customer: {
                    email: "customer@example.com"
                },
                billing: {
                    address: {
                        country: "GB"
                    }
                }
            });
            setPaymentSession(response.data);
            toast.success("Payment session created successfully!");
        } catch (error) {
            console.error("Payment Session Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session.');
        } finally {
            setLoading(false);
        }
    };

    // Effect to initialize and mount the Flow component
    useEffect(() => {
        if (!paymentSession?.id) {
            const flowContainer = document.getElementById('flow-container');
            if (flowContainer) flowContainer.innerHTML = '';
            return;
        }

        const initializeFlow = async (session) => {
            try {
                // --- The onAuthorized callback implementation ---
                const onAuthorized = async (self, authorizeResult) => {
                    console.log("onAuthorized event triggered:", authorizeResult);
                    const cardType = authorizeResult?.payment?.token?.paymentMethodData.info?.cardFundingSource;
                    const cardType1 = authorizeResult?.paymentMethodData.info?.cardFundingSource;
                    console.log("card type 1" + cardType1);
                    const cardType2 = authorizeResult?.payment.token.paymentMethodData.info?.cardFundingSource;
                     console.log("card type 2" + cardType2);

                    toast.info(`Wallet card type is: ${cardType || 'Unknown'}`);

                    if (cardType && cardType === config.cardTypeToReject) {
                        toast.error(`Rejecting ${cardType} card as per configuration.`);
                        return {
                            continue: false,
                            errorMessage: `Sorry, ${cardType} cards are not accepted for this payment.`,
                        };
                    }

                    toast.success("Card accepted. Proceeding with payment.");
                    return { continue: true };
                };

                const checkout = await loadCheckoutWebComponents({
                    paymentSession: session,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                    environment: 'sandbox',
                    componentOptions: {
                        applepay: {
                            onAuthorized, // Assign the callback here
                        },
                        googlepay: {
                            onAuthorized, // You can use the same callback for Google Pay
                        }
                    },
                    onPaymentCompleted: (component, paymentResponse) => {
                        toast.success(`Payment completed! ID: ${paymentResponse.id}`);
                        navigate(`/success?cko-payment-id=${paymentResponse.id}`);
                    },
                    onError: (component, error) => {
                        toast.error(error.message || "Payment failed.");
                        console.error("Flow Error:", error);
                    }
                });

                const flow = checkout.create('flow');
                flowComponentRef.current = flow;
                flow.mount('#flow-container');

            } catch (err) {
                console.error("Error loading Checkout Web Components:", err);
                toast.error("Failed to load payment component.");
            }
        };

        initializeFlow(paymentSession);

    }, [paymentSession, config, navigate]);

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Flow: onAuthorized Callback Demo</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Configuration and Session Creation */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">1. Configuration</Card.Title>
                        <p className="text-gray-600 mb-4">
                            Use this callback to inspect wallet details before payment. This demo will reject the payment if the card type selected in the wallet matches your choice below.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Card Type to Reject</label>
                            <select
                                value={config.cardTypeToReject}
                                onChange={(e) => setConfig({ ...config, cardTypeToReject: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="none">Allow All Cards</option>
                                <option value="credit">Reject Credit Cards</option>
                                <option value="debit">Reject Debit Cards</option>
                            </select>
                        </div>
                    </Card>
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">2. Create Session</Card.Title>
                        <button
                            onClick={createPaymentSession}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Payment Session & Load Flow"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Flow Component Display */}
                <Card className="p-6 rounded-xl shadow-md bg-white flex flex-col items-center justify-center min-h-[500px]">
                    <Card.Title className="text-xl font-semibold mb-4">3. Pay with Apple Pay / Google Pay</Card.Title>
                    {paymentSession ? (
                        <div id="flow-container" className="w-full"></div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Create a payment session to load the payment form.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default OnAuthorized;
