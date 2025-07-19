import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate} from "react-router-dom";

// Default payload for the JSON editor
const defaultSessionPayload = {
  "amount": 4700,
  "currency": "GBP",
  "reference": "ORD-REMEMBER-ME",
  "billing": {
    "address": {
      "country": "GB"
    }
  },
  "customer": {
    "name": "John Doe",
    "email": "customer@example.com" // Essential for Remember Me
  }
};

const RememberMe = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    
    // State for the JSON editor and the new processing channel ID field
    const [sessionPayload, setSessionPayload] = useState(defaultSessionPayload);
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultSessionPayload, null, 2));
    const [jsonError, setJsonError] = useState(null);
    const [processingChannelId, setProcessingChannelId] = useState(''); // New state for the channel ID

    const flowComponentRef = useRef(null);

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

    // Effect to initialize and mount the Flow component
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

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Flow: Remember Me & Channel ID Demo</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Configuration */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Session Request</Card.Title>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Processing Channel ID (Optional)</label>
                            <input
                                type="text"
                                value={processingChannelId}
                                onChange={(e) => setProcessingChannelId(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="pc_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Request Payload</label>
                            <textarea
                                value={jsonInput}
                                onChange={handleJsonInputChange}
                                className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                                rows={20}
                                placeholder="Enter session request JSON here..."
                            />
                            {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                        </div>
                        <button
                            onClick={createPaymentSession}
                            disabled={loading || !!jsonError}
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Create Session & Load Flow"}
                        </button>
                    </div>
                </Card>

                {/* Right Panel: Flow Component Display */}
                <Card className="p-6 rounded-xl shadow-md bg-white flex flex-col items-center justify-center min-h-[500px]">
                    <Card.Title className="text-xl font-semibold mb-4">Payment</Card.Title>
                    {paymentSession ? (
                        <div id="flow-container" className="w-full"></div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Click "Create Session" to load the payment form.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default RememberMe;
