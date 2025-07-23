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

const Tokenization = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [tokenizationResponse, setTokenizationResponse] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // Ref to hold the card component instance
    const cardComponentRef = useRef(null);

    // Function to create the payment session
    const createPaymentSession = async () => {
        setLoading(true);
        setPaymentSession(null);
        setTokenizationResponse(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, defaultSessionPayload);
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
            const cardContainer = document.getElementById('card-container');
            if (cardContainer) cardContainer.innerHTML = '';
            cardComponentRef.current = null;
            return;
        }

        const initializeCardComponent = async (session) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: session,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4', // Use your public key
                    environment: 'sandbox',
                });

                const cardComponent = checkout.create('card', {
                    // We hide the component's own pay button to use our custom one
                    showPayButton: false, 
                });
                
                if (await cardComponent.isAvailable()) {
                    cardComponent.mount('#card-container');
                    cardComponentRef.current = cardComponent; // Store instance in ref
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

    // --- Handler for the custom "Tokenize" button ---
    const handleTokenize = async () => {
        if (!cardComponentRef.current) {
            toast.error("Card component is not initialized.");
            return;
        }
        setLoading(true);
        setTokenizationResponse(null);
        try {
            // This is the core tokenization call
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
            <h1 className="text-3xl font-bold text-center mb-8">Flow: Card Tokenization Demo</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Actions */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">1. Create Session</Card.Title>
                        <p className="text-gray-600 mb-4">
                            First, create a payment session. This authenticates the component and allows it to be displayed securely.
                        </p>
                        <button
                            onClick={createPaymentSession}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Creating Session..." : "Create Payment Session"}
                        </button>
                        {paymentSession && (
                            <p className="mt-4 text-sm text-gray-700 break-all">
                                <strong>Session ID:</strong> {paymentSession.id}
                            </p>
                        )}
                    </Card>

                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">2. Enter Card & Tokenize</Card.Title>
                        {/* Container where the card component will be mounted */}
                        <div id="card-container" className="min-h-[150px]">
                            {!paymentSession && <p className="text-center text-gray-500">Create a session to load the card form.</p>}
                        </div>
                        <button
                            onClick={handleTokenize}
                            disabled={loading || !paymentSession}
                            className="mt-4 w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Tokenizing..." : "Tokenize Card"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Tokenization Response */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Tokenization Response</Card.Title>
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-96 whitespace-pre-wrap break-words">
                        {tokenizationResponse
                            ? JSON.stringify(tokenizationResponse, null, 2)
                            : 'Waiting for tokenization response...'}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Tokenization;
