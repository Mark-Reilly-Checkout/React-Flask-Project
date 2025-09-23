import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';

// --- Translations for Components ---
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
    const [paymentSession, setPaymentSession] = useState(null);
    const [loadingPaymentSession, setLoadingPaymentSession] = useState(false);
    
    // Ref to hold the card component instance for manual submission
    const cardComponentRef = useRef(null);

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

    const handleConfirmAndPay = async () => {
        if (!selectedDeliveryOption) {
            toast.warn("Please select a delivery option.", { position: "bottom-left" });
            return;
        }
        if (!totalAmount || !billingAddress || !customerEmail || !basket) {
            toast.error("Missing essential order details. Please go back to basket.");
            return;
        }

        setLoadingPaymentSession(true);
        try {
            const payload = {
                amount: Math.round(totalAmount * 100),
                currency: basket.currency,
                reference: `checkout-demo-ord-${Date.now()}`,
                billing: { address: billingAddress },
                customer: { email: customerEmail },
                shipping: { address: billingAddress },
                items: [
                    { name: basket.name, quantity: basket.quantity, unit_price: Math.round(basket.unitPrice * 100) },
                    { name: selectedDeliveryOption.name, quantity: 1, unit_price: Math.round(selectedDeliveryOption.cost * 100) }
                ]
            };
            
            const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, payload);
            setPaymentSession(response.data);
            toast.success("Payment session created! Payment options will now load.", { position: "bottom-left" });

        } catch (error) {
            console.error("Error creating payment session:", error.response ? error.response.data : error.message);
            toast.error("Failed to create payment session. Please try again.");
            setPaymentSession(null);
        } finally {
            setLoadingPaymentSession(false);
        }
    };

    // --- UPDATED useEffect to load multiple individual payment components ---
    useEffect(() => {
        if (!paymentSession?.id) {
             console.log("Waiting for payment session details to load components.");
            return;
        }
        
        // Ensure containers exist before trying to clear them
        const clearContainer = (id) => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = '';
        }
        
        clearContainer('card-container');
        clearContainer('ideal-pay-container');
        clearContainer('google-pay-container');
        clearContainer('paypal-container');

        const initializePaymentComponents = async (sessionObject) => {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: sessionObject,
                    publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                    environment: 'sandbox',
                    locale: 'en',
                    translations,
                    onPaymentCompleted: (_component, paymentResponse) => {
                        toast.success('Payment completed successfully!');
                        console.log("Payment ID:", paymentResponse.id);
                        navigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
                    },
                    onError: (_component, error) => {
                        toast.error('Payment failed. Please try again.');
                        console.error("Payment Error:", error);
                        navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
                    }
                });

                // --- Create each component instance ---
                const cardComponent = checkout.create('card');
                const iDealComponent = checkout.create('ideal');
                const googlePayComponent = checkout.create('googlepay');
                const paypalComponent = checkout.create('paypal');
                
                // Store card component in ref to access its .submit() method
                cardComponentRef.current = cardComponent;
                
                // --- Mount each component if it's available ---
                (async () => {
                    if (await cardComponent.isAvailable()) {
                        cardComponent.mount('#card-container');
                    }
                    if (await iDealComponent.isAvailable()) {
                        iDealComponent.mount('#ideal-pay-container');
                    }
                    if (await googlePayComponent.isAvailable()) {
                        googlePayComponent.mount('#google-pay-container');
                    }
                    if (await paypalComponent.isAvailable()) {
                        paypalComponent.mount('#paypal-container');
                    }
                })();

            } catch (err) {
                console.error("Checkout Web Components Error:", err);
                toast.error("Error loading payment components: " + err.message);
            }
        };

        initializePaymentComponents(paymentSession);

    }, [paymentSession, API_BASE_URL, customerEmail, billingAddress, basket, navigate]);

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
                            <div className="flex justify-between items-center font-medium">
                                <span>{basket.name} (x{basket.quantity})</span>
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

                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Delivery Options</Card.Title>
                        <div className="space-y-3">
                            {deliveryOptions.map(option => (
                                <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input type="radio" name="deliveryOption" value={option.id} checked={selectedDeliveryOption?.id === option.id} onChange={() => handleDeliverySelection(option.id)} className="form-radio h-5 w-5 text-blue-600" />
                                    <span className="text-gray-700 font-medium">{option.name} - {basket?.currency || 'EUR'} {option.cost.toFixed(2)}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleConfirmAndPay} disabled={!selectedDeliveryOption || loadingPaymentSession} className="mt-6 w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 transition duration-300 ease-in-out">
                            {loadingPaymentSession ? "Generating Session..." : "Confirm Delivery & Pay"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Individual Payment Components in separate cards */}
                <div className="flex flex-col gap-6">
                    {paymentSession ? (
                        <>
                            <Card className="p-4 rounded-xl shadow-md bg-white">
                                <div id="google-pay-container" className="h-12 flex items-center justify-center"></div>
                            </Card>
                            <Card className="p-4 rounded-xl shadow-md bg-white">
                                <div id="ideal-pay-container" className="h-12 flex items-center justify-center"></div>
                            </Card>
                            <Card className="p-4 rounded-xl shadow-md bg-white">
                                <div id="paypal-container" className="h-12 flex items-center justify-center"></div>
                            </Card>
                            <Card className="p-6 rounded-xl shadow-md bg-white">
                                <div id="card-container" className="w-full"></div>
                                <button 
                                    onClick={() => cardComponentRef.current?.submit()} 
                                    className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out">
                                    Pay with Card
                                </button>
                            </Card>
                        </>
                    ) : (
                        <Card className="p-6 rounded-xl shadow-md bg-white flex flex-col items-center justify-center min-h-[500px]">
                            <div className="text-center text-gray-500">
                                <p>Select delivery and confirm to load payment options.</p>
                                {loadingPaymentSession && <p className="mt-2 animate-pulse">Loading...</p>}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryPage;

