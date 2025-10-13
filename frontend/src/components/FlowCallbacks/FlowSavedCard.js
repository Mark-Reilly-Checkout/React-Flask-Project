import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';

// Default payload for creating the payment session
const defaultSessionPayload = {
  amount: 1000,
  currency: "GBP",
  reference: "ORD-TOKENIZATION-DEMO",
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

const FlowSavedCard = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [tokenizationResponse, setTokenizationResponse] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // State for the JSON editor
    const [sessionPayload, setSessionPayload] = useState(defaultSessionPayload);
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultSessionPayload, null, 2));
    const [jsonError, setJsonError] = useState(null);

    const cardComponentRef = useRef(null);
    const cardContainerRef = useRef(null); 

    // Handler for the JSON text area input
    const handleJsonInputChange = (e) => {
        const value = e.target.value;
        setJsonInput(value); 
        try {
            const parsedJson = JSON.parse(value);
            setSessionPayload(parsedJson); 
            setJsonError(null); 
        } catch (error) {
            setJsonError('Invalid JSON format.'); 
        }
    };

    // Function to create the payment session
    const createPaymentSession = async () => {
        setLoading(true);
        setPaymentSession(null);
        setTokenizationResponse(null);

        if (jsonError) {
            toast.error("Cannot create session. Please fix the invalid JSON.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, sessionPayload);
            setPaymentSession(response.data);
            toast.success("Payment session created. Card component will now load.");
        } catch (error) {
            console.error("Payment Session Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session.');
        } finally {
            setLoading(false);
        }
    };

    // Effect to initialize and mount the Card component
    useEffect(() => {
        if (!paymentSession?.id) {
            if (cardContainerRef.current) {
                cardContainerRef.current.innerHTML = '';
            }
            cardComponentRef.current = null;
            return;
        }

        const initializeCardComponent = async (session) => {
            if (!cardContainerRef.current) {
                // This check is now a safeguard, but less likely to fail with conditional rendering
                toast.error("Card container element not found in the DOM.");
                return;
            }
            
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: session,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                    environment: 'sandbox',
                });

                const cardComponent = checkout.create('card', {
                    showPayButton: false, 
                });
                
                if (await cardComponent.isAvailable()) {
                    cardComponent.mount(cardContainerRef.current);
                    cardComponentRef.current = cardComponent;
                } else {
                    toast.error("Card component is not available.");
                }

            } catch (err) {
                console.error("Error loading Checkout Web Components:", err);
                toast.error("Failed to load the card component.");
            }
        };

        initializeCardComponent(paymentSession);

    }, [paymentSession]);

    // Handler for the custom "Tokenize" button
    const handleTokenize = async () => {
        if (!cardComponentRef.current) {
            toast.error("Card component is not initialized.");
            return;
        }
        setLoading(true);
        setTokenizationResponse(null);
        try {
            const { data } = await cardComponentRef.current.tokenize();
            
            setTokenizationResponse(data);
            toast.success(`Token created successfully: ${data.token}`);
            console.log("Tokenization Response:", data);

        } catch (error) {
            console.error("Tokenization Error:", error);
            toast.error(error.message || "An error occurred during tokenization.");
            setTokenizationResponse({ error: error.message, details: error });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Save Card with Flow</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Actions */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">1. Create Payment Session</Card.Title>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Payment Session Request JSON</label>
                            <textarea
                                value={jsonInput}
                                onChange={handleJsonInputChange}
                                className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                                rows={15}
                                placeholder="Enter session request JSON here..."
                            />
                            {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                        </div>
                        <button
                            onClick={createPaymentSession}
                            disabled={loading || !!jsonError}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Creating Session..." : "Create Payment Session"}
                        </button>
                        {paymentSession && (
                            <p className="mt-4 text-sm text-gray-700 break-all">
                                <strong>Payment Session ID:</strong> {paymentSession.id}
                            </p>
                        )}
                    </Card>

                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">2. Flow Component</Card.Title>
                        
                        {/* --- MODIFIED: Conditional rendering for the container --- */}
                        {paymentSession ? (
                            <div ref={cardContainerRef} id="card-container" className="min-h-[150px]">
                                {/* The card component will be mounted here by the useEffect hook */}
                            </div>
                        ) : (
                            <div className="min-h-[150px] flex items-center justify-center">
                                <p className="text-center text-gray-500">Create a payment session to load the card form.</p>
                            </div>
                        )}

                        <button
                            onClick={handleTokenize}
                            disabled={loading || !paymentSession}
                            className="mt-4 w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Processing.." : "Payment with Saved Card"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Tokenization Response */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Payment Response</Card.Title>
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-96 whitespace-pre-wrap break-words">
                        {tokenizationResponse
                            ? JSON.stringify(tokenizationResponse, null, 2)
                            : 'Waiting for payment response...'}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FlowSavedCard;
