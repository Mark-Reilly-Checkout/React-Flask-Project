import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Card } from 'react-bootstrap';
import axios from 'axios';
import CardGroup from 'react-bootstrap/CardGroup';
// import { Frames, CardNumber, ExpiryDate, Cvv } from "frames-react"; // Not needed if not using Frames directly here
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { data, useSearchParams } from "react-router-dom";


const Flow = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");


    const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
    const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);
    const [lastUpdatedFrames, setLastUpdatedFrames] = useState(null);

    const [timeAgoSession, setTimeAgoSession] = useState('');
    const [timeAgoFlow, setTimeAgoFlow] = useState('');
    const [timeAgoFrames, setTimeAgoFrames] = useState('');

    const [acceptedTermsAndConditions, setAcceptedTermsAndConditions] = useState(false);

    // --- NEW: Create a ref to hold the latest state value ---
    const acceptedTermsRef = useRef(acceptedTermsAndConditions);

    // --- NEW: Update the ref whenever acceptedTermsAndConditions state changes ---
    useEffect(() => {
        acceptedTermsRef.current = acceptedTermsAndConditions;
    }, [acceptedTermsAndConditions]);


    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Last updated just now";
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);

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
            setTimeAgoFrames(getTimeAgo(lastUpdatedFrames));
        }, 60000);

        return () => clearInterval(interval);
    }, [lastUpdatedSession, lastUpdatedFlow, lastUpdatedFrames]);


    const SessionRequest = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: 5000,
                email: "testfry@example.com"
            });

            setPaymentSession(response.data);
            setLastUpdatedSession(new Date());

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating payment session', 'error');
        } finally {
            setLoading(false);
        }
    };

    const translations = {
        en: {
            'form.required': 'Please provide this field',
            'form.full_name.placeholder': 'Mark Reilly',
            'pay_button.pay': 'Pay now',
            'pay_button.payment_failed': 'Payment failed, please try again',
        },
    };

    useEffect(() => {
        if (paymentSession) {
            loadCheckoutWebComponents({
                paymentSession,
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
                environment: 'sandbox',
                locale: 'en',
                translations,
                componentOptions: {
                    flow: {
                        expandFirstPaymentMethod: false
                    },
                    card: {
                        displayCardholderName: 'bottom',
                        data: {
                            email: 'mark.reilly1234@checkot.com',
                        },
                    },
                },

                onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    console.log("Payment ID:", paymentResponse.id);
                },
                onError: (component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                }
            }).then(checkout => {
                const flowComponent = checkout.create('klarna', {
                    handleClick: (_self) => {
                        console.log("handleClick triggered");
                        if (acceptedTermsRef.current) {
                            console.log("Terms accepted, proceeding with payment...");
                            // Proceed with payment
                            toast.info("Proceeding with payment...");
                            return { continue: true };
                        } else {
                            console.log("Terms not accepted, showing warning...");
                            // Show warning
                            toast.warn("Please accept the terms and conditions before paying.");
                            return { continue: false };
                        }
                    }
                });
                

                /* const paypalComponent = checkout.create('paypal', {
                    handleClick: (_self) => {
                        if (acceptedTermsRef.current) {
                            toast.success('Proceeding with PayPal');
                            return { continue: true };
                        } else {
                            toast.warn('Please accept the terms and conditions.');
                            return { continue: false };
                        }
                    },
                }); */

                //flowComponent.mount('#googlepay-container');
                setLastUpdatedFlow(new Date());

                (async () => {
                    const isFlowAvailable = await flowComponent.isAvailable();
                    if (isFlowAvailable) {
                        flowComponent.mount(document.getElementById("flow-container"));
                    }

                    /* const isPayPalAvailable = await paypalComponent.isAvailable();
                    if (isPayPalAvailable) {
                        paypalComponent.mount(document.getElementById("paypal-container"));
                    } */
                })();

            }).catch(err => console.error("Checkout Web Components Error:", err));
        }
    }, [paymentSession]); // IMPORTANT: Remove acceptedTermsAndConditions from here!

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
        <div>
            <br />
            <div>
                <CardGroup>
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Request a session for Flow</Card.Title>
                            <Card.Text>
                                <div className="text-center">
                                    <button onClick={SessionRequest} disabled={loading}>
                                        {loading ? "Processing..." : "Request Session"}
                                    </button>
                                    <br />
                                    <div>
                                        {paymentSession && <p>Payment Session ID: {paymentSession.id}</p>}
                                    </div>
                                </div>
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoSession}</small>
                        </Card.Footer>
                    </Card>

                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Flow module</Card.Title>
                            <Card.Text>
                                <div className="mb-3">
                                    <input
                                        type="checkbox"
                                        id="termsCheckbox"
                                        checked={acceptedTermsAndConditions}
                                        onChange={(e) => setAcceptedTermsAndConditions(e.target.checked)}
                                    />
                                    <label htmlFor="termsCheckbox" className="ms-2">I accept the <a href="/terms" target="_blank">Terms and Conditions</a></label>
                                </div>
                                <div id="flow-container"></div>
                                {/* <div id="paypal-container"></div> */}
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoFlow}</small>
                        </Card.Footer>
                    </Card>

                </CardGroup>
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

export default Flow;