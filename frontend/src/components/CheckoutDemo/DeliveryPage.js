import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components'; // Import for Flow component
import { toast } from 'react-toastify'; // Import toast


// --- Country to Currency Mapping (Retained for basket currency check) ---
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

// --- Translations for Flow Component (Moved from Flow.js) ---
const translations = {
    en: {
      'form.required': 'Please provide this field',
      'form.full_name.placeholder': 'Mark Reilly',
      'pay_button.pay': 'Pay now',
      'pay_button.payment_failed': 'Payment failed, please try again',
    },
  };


const DeliveryPage = () => {
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    const [basket, setBasket] = useState(null);
    const [billingAddress, setBillingAddress] = useState(null);
    const [customerEmail, setCustomerEmail] = useState(null);
    const [subtotal, setSubtotal] = useState(0);

    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);

    const [paymentSessionForFlow, setPaymentSessionForFlow] = useState(null);
    const [loadingPaymentSession, setLoadingPaymentSession] = useState(false);

    // --- Removed flowConfig state and acceptedTermsRef as they are no longer needed ---
    // const [flowConfig, setFlowConfig] = useState(flowComponentDefaultConfig);
    // const acceptedTermsRef = useRef(false);


    // Dummy delivery options
    const deliveryOptions = [
        { id: 'standard', name: 'Standard Delivery (3-5 days)', cost: 5.00 },
        { id: 'express', name: 'Express Delivery (1-2 days)', cost: 10.00 },
        { id: 'premium', name: 'Premium Next Day', cost: 15.00 }
    ];

    useEffect(() => {
        const savedBasket = localStorage.getItem('checkoutBasket');
        const savedBillingAddress = localStorage.getItem('checkoutBillingAddress');
        const savedCustomerEmail = localStorage.getItem('checkoutCustomerEmail');
        const savedSubtotal = localStorage.getItem('checkoutSubtotal');

        if (savedBasket && savedBillingAddress && savedCustomerEmail && savedSubtotal) {
            setBasket(JSON.parse(savedBasket));
            setBillingAddress(JSON.parse(savedBillingAddress));
            setCustomerEmail(savedCustomerEmail);
            setSubtotal(parseFloat(savedSubtotal));
        } else {
            toast.error("Basket information missing. Please start from the basket page.");
            navigate('/checkout-demo');
        }
    }, [navigate]);

    useEffect(() => {
        if (subtotal !== null && selectedDeliveryOption !== null) {
            setTotalAmount(subtotal + selectedDeliveryOption.cost);
        } else {
            setTotalAmount(null);
        }
    }, [subtotal, selectedDeliveryOption]);


    const handleDeliverySelection = (optionId) => {
        const option = deliveryOptions.find(opt => opt.id === optionId);
        setSelectedDeliveryOption(option);
    };

    // --- Removed handleTermsAcceptance as terms checkbox is gone ---
    // const handleTermsAcceptance = (e) => { /* ... */ };


    const handleConfirmAndPay = async () => {
        if (!selectedDeliveryOption) {
            toast.warn("Please select a delivery option.",{
                position: "bottom-left",
            });
            return;
        }
        if (!totalAmount || !billingAddress || !customerEmail || !basket) {
            toast.error("Missing essential order details. Please go back to basket.");
            return;
        }

        setLoadingPaymentSession(true);
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(totalAmount * 100), // Convert to minor units
                currency: basket.currency, // Use currency from basket
                country: billingAddress.country, // Use country from billing address
                email: customerEmail,
                billing_address: billingAddress, // Send the full billing address object
                reference: `order-${Date.now()}` // Dynamic reference
            });

            setPaymentSessionForFlow(response.data);
            toast.success("Payment session created! Flow component will now load.", {
                position: "bottom-left",
            });

        } catch (error) {
            console.error("Error creating payment session:", error.response ? error.response.data : error.message);
            toast.error("Failed to create payment session. Please try again.");
            setPaymentSessionForFlow(null);
        } finally {
            setLoadingPaymentSession(false);
        }
    };

    // --- useEffect for loading/mounting Flow Component (Simplified and Transplanted) ---
    useEffect(() => {
        // Only proceed if paymentSessionForFlow has data
        if (!paymentSessionForFlow?.id) {
             console.log("Waiting for payment session details to load Flow component.");
            return;
        }

        const flowContainer = document.getElementById('flow-container');
        if (flowContainer) {
            flowContainer.innerHTML = ''; // Clear existing Checkout.com component
        }

        const initializeFlowComponent = async (sessionObject) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: sessionObject, // Pass the full session object
                    // --- Hardcoded Flow Component Configuration ---
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4', // Hardcoded public key
                    environment: 'sandbox', // Hardcoded environment
                    locale: 'en', // Hardcoded locale
                    translations, // Use the translations object from above
                    componentOptions: {
                        flow: {
                          expandFirstPaymentMethod: false, // Hardcoded option
                          // Removed handleClick logic for simplicity in this demo
                        },
                        card: {
                          displayCardholderName: 'bottom', // Hardcoded option
                          data: {
                            email: customerEmail, // Use customer email from state
                            country: billingAddress?.country, // Pass billing address country
                            currency: basket?.currency, // Pass basket currency
                            billing_address: billingAddress // Pass full billing address
                          },
                        },
                      },

                onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    console.log("Payment ID:", paymentResponse.id);
                     navigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
                },
                onError: (component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                    navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                }
            });
            const flowComponent = checkout.create('flow');
            
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
                setLoadingPaymentSession(false);
            }
        };

        initializeFlowComponent(paymentSessionForFlow);

    }, [paymentSessionForFlow, API_BASE_URL, customerEmail, billingAddress, basket]); // Dependencies updated

    if (!basket || !billingAddress || !customerEmail || subtotal === null) {
        return <div className="text-center mt-8 text-gray-700">Loading order details...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Choose Delivery & Pay</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Order Summary & Delivery Options */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Order Summary</Card.Title>
                        <div className="space-y-2 mb-4 border-b pb-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{basket.name} (x{basket.quantity})</span>
                                <span>{basket.currency} {(basket.unitPrice * basket.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Subtotal:</span>
                                <span>{basket.currency} {subtotal.toFixed(2)}</span>
                            </div>
                            {selectedDeliveryOption && (
                                <div className="flex justify-between items-center text-sm text-gray-600">
                                    <span>{selectedDeliveryOption.name}:</span>
                                    <span>{basket.currency} {selectedDeliveryOption.cost.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total:</span>
                            <span>{basket.currency} {totalAmount !== null ? totalAmount.toFixed(2) : '---'}</span>
                        </div>
                    </Card>

                    {/* Removed Configuration Panel for Flow Component */}
                    {/* The configuration panel from Flow.js is no longer here */}

                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Delivery Options</Card.Title>
                        <div className="space-y-3">
                            {deliveryOptions.map(option => (
                                <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="deliveryOption"
                                        value={option.id}
                                        checked={selectedDeliveryOption?.id === option.id}
                                        onChange={() => handleDeliverySelection(option.id)}
                                        className="form-radio h-5 w-5 text-blue-600"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        {option.name} - {basket?.currency || 'GBP'} {option.cost.toFixed(2)}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={handleConfirmAndPay}
                            disabled={!selectedDeliveryOption || loadingPaymentSession}
                            className="mt-6 w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 transition duration-300 ease-in-out"
                        >
                            {loadingPaymentSession ? "Generating Payment Session..." : "Confirm Delivery & Pay"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Flow Component */}
                <Card className="p-6 rounded-xl shadow-md bg-white flex flex-col items-center justify-center min-h-[500px] min-w-[350px]">
                    <Card.Title className="text-xl font-semibold mb-4">Payment Details</Card.Title>
                    {paymentSessionForFlow ? (
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
                        </>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Select delivery and confirm to load payment options.</p>
                            {loadingPaymentSession && <p className="mt-2">Loading...</p>}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DeliveryPage;