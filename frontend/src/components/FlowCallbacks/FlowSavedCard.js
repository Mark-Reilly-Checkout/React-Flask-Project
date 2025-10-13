import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate} from "react-router-dom";


// Default payload for creating the payment session
const defaultSessionPayload = {
  amount: 1000,
  currency: "GBP",
  reference: "Save-Card-DEMO",
  billing: {
    address: {
      country: "GB"
    }
  },
  customer: {
    name: "John Doe",
    email: "john.doe@example.com"
  },
  payment_method_configuration:{
    "card": {
        "store_payment_details":"collect_consent"
  }
}
};

const FlowSavedCard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [tokenizationResponse, setTokenizationResponse] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // State for the JSON editor for easy testing
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
        
        if (jsonError) {
            toast.error("Cannot create session. Please fix the invalid JSON.");
            setLoading(false);
            return;
        }

        try {
            // Clone the payload to avoid mutating state directly
            const finalPayload = { ...sessionPayload };

            // Add the processing_channel_id to the payload if it's provided
            if (processingChannelId) {
                finalPayload.processing_channel_id = processingChannelId;
            }

            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, finalPayload);

            setPaymentSession(response.data);
            toast.success("Payment session created successfully!");

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    // Effect to initialize and mount the Card component once a session is created
    useEffect(() => {
            if (!paymentSession?.id) {
                const flowContainer = document.getElementById('flow-container');
                if (flowContainer) flowContainer.innerHTML = '';
                return;
            }
    
            const initializeFlow = async (session) => {
                try {
                    const cko = await loadCheckoutWebComponents({
                        paymentSession: session,
                        publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                        environment: 'sandbox',
                        onPaymentCompleted: (component, paymentResponse) => {
                            toast.success(`Payment completed! ID: ${paymentResponse.id}`);
                            navigate(`/success?cko-payment-id=${paymentResponse.id}`);
                        },
                        onError: (component, error) => {
                            toast.error("Payment failed.");
                            console.error("Flow Error:", error);
                        }
                    });
    
                    const flow = cko.create('flow');
                    flowComponentRef.current = flow;
                    flow.mount('#flow-container');
    
                } catch (err) {
                    console.error("Error loading Checkout Web Components:", err);
                    toast.error("Failed to load payment component.");
                }
            };
    
            initializeFlow(paymentSession);
    
        }, [paymentSession, navigate]);

    // Handler for the custom "Tokenize" button, which tokenizes the card details
    const handleTokenize = async () => {
        if (!cardComponentRef.current) {
            toast.error("Card component is not initialized.");
            return;
        }
        setLoading(true);
        setTokenizationResponse(null);
        try {
            // The tokenize method validates and tokenizes the card details.
            // The response will include whether the user consented to save the card.
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
            <h1 className="text-3xl font-bold text-center mb-8">Flow - Saved Card Demo</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Configuration and Actions */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Payment Session</Card.Title>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Payment Session Request</label>
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
                        <Card.Title className="text-xl font-semibold mb-4">Card Component</Card.Title>
                        
                        {/* Container for the card component, rendered conditionally */}
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
                            {loading ? "Processing..." : "Tokenize"}
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

export default FlowSavedCard;
