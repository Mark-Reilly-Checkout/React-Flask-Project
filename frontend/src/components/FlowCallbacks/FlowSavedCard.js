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
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [paymentResponse, setPaymentResponse] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null); // State for the GET Payment Details response
    const [gettingDetails, setGettingDetails] = useState(false); // Loading state for the GET request    
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const navigate = useNavigate();

    // State for the JSON editor for easy testing
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultSessionPayload, null, 2));
    const [jsonError, setJsonError] = useState(null);

    const flowContainerRef = useRef(null); 

    // Handler for the JSON text area input to allow dynamic payloads
    const handleJsonInputChange = (e) => {
        const value = e.target.value;
        setJsonInput(value); 
        try {
            JSON.parse(value);
            setJsonError(null); 
        } catch (error) {
            setJsonError('Invalid JSON format.'); 
        }
    };

    // Function to create the payment session by calling the backend
    const createPaymentSession = async () => {
        setLoading(true);
        setPaymentSession(null);
        setPaymentResponse(null);
        setPaymentDetails(null);

        if (jsonError) {
            toast.error("Cannot create session. Please fix the invalid JSON.");
            setLoading(false);
            return;
        }

        try {
            const parsedPayload = JSON.parse(jsonInput);
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, parsedPayload);
            setPaymentSession(response.data);
            toast.success("Payment session created. Flow component will now load.");
        } catch (error) {
            console.error("Payment Session Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentDetails = async (paymentId) => {
        if (!paymentId) return;
        setGettingDetails(true);
        setPaymentDetails(null); // Clear previous details
        try {
            const response = await axios.get(`${API_BASE_URL}/api/payment-details/${paymentId}`);
            setPaymentDetails(response.data);
        } catch (error) {
            console.error("Get Payment Details Error:", error.response ? error.response.data : error.message);
            toast.error('Error fetching payment details.');
            setPaymentDetails({ error: "Failed to fetch details.", details: error.response?.data });
        } finally {
            setGettingDetails(false);
        }
    };

    // Effect to initialize and mount the Flow component once a session is created
    useEffect(() => {
        if (!paymentSession?.id) {
            if (flowContainerRef.current) {
                flowContainerRef.current.innerHTML = '';
            }
            return;
        }

        const initializeFlowComponent = async (session) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: session,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4', // Replace with your public key if needed
                    environment: 'sandbox',
                    onPaymentCompleted: (_component, paymentResponse) => {
                        setPaymentResponse(paymentResponse);
                        toast.success('Payment completed successfully!');
                        fetchPaymentDetails(paymentResponse.id);
                        //navigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
                    },
                    onError: (component, error) => {
                        setPaymentResponse(error);
                        toast.error('Payment failed. Please try again.');
                        console.error("Payment Error:", error);
                        //navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                    }
                });

                const flowComponent = checkout.create('flow');
                
                if (await flowComponent.isAvailable()) {
                    flowComponent.mount(flowContainerRef.current);
                } else {
                    toast.error("Flow component is not available.");
                }

            } catch (err) {
                console.error("Error loading Checkout Web Components:", err);
                toast.error("Failed to load the Flow component.");
            }
        };

        initializeFlowComponent(paymentSession);

    }, [paymentSession, navigate]);


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Flow Component Demo</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    {/* Panel 1: Configuration and Actions */}
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

                    {/* Panel 2: Flow Component */}
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Flow Component</Card.Title>
                        {paymentSession ? (
                            <div ref={flowContainerRef} id="flow-container" className="min-h-[300px]">
                                {/* The flow component will be mounted here by the useEffect hook */}
                            </div>
                        ) : (
                            <div className="min-h-[300px] flex items-center justify-center">
                                <p className="text-center text-gray-500">Create a payment session to load the Flow component.</p>
                            </div>
                        )}
                    </Card>
                </div>
                
                {/* Right Column: Payment Response */}
                <div className="p-6 rounded-xl shadow-md bg-white">
                    <h2 className="text-xl font-semibold mb-4">Payment Response</h2>
                    {paymentResponse?.id && (
                        <div className="mb-4 text-sm text-gray-700 break-all">
                            <strong>Payment ID:</strong> {paymentResponse.id}
                        </div>
                    )}
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-full min-h-[400px] whitespace-pre-wrap break-words">
                        {gettingDetails ? "GET Payment Details running..." : (
                            paymentDetails ? JSON.stringify(paymentDetails, null, 2) :
                            (paymentResponse ? "Waiting for payment details..." : "Waiting for payment response...")
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowSavedCard;
