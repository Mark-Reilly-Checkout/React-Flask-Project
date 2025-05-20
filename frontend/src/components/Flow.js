import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import CardGroup from 'react-bootstrap/CardGroup';
import { Frames, CardNumber, ExpiryDate, Cvv } from "frames-react";
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { data, useSearchParams } from "react-router-dom";




const Flow = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");


    // Separate states for each card's last updated time
    const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
    const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);
    const [lastUpdatedFrames, setLastUpdatedFrames] = useState(null);

    // Time display strings for each card
    const [timeAgoSession, setTimeAgoSession] = useState('');
    const [timeAgoFlow, setTimeAgoFlow] = useState('');
    const [timeAgoFrames, setTimeAgoFrames] = useState('');

    // Helper function to calculate time ago
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

    // Update time displays every minute
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
        // Set loading to true when the request starts
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: 5000,  // Amount in cents ($50.00)
                email: "testfry@example.com"
            });

            setPaymentSession(response.data); // Store session data in state
            setLastUpdatedSession(new Date()); // Update first card's timestamp

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
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',  // Replace with your actual public key
                environment: 'sandbox',// Or 'production' based on your environment
                locale: 'en',
                translations, 
                componentOptions: {
                    flow: {
                      expandFirstPaymentMethod: false,
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
                const flowComponent = checkout.create('applepay');
                flowComponent.mount('#flow-container');  // Mount the Flow component to a div
                setLastUpdatedFlow(new Date()); // Update second card when flow mounts
                (async () => {
                    const klarnaComponent = checkout.create("klarna");
                    const klarnaElement = document.getElementById('klarna-container');
                    if (await klarnaComponent.isAvailable()) {
                        klarnaComponent.mount(klarnaElement);
                    }
                })();
            }).catch(err => console.error("Checkout Web Components Error:", err));

            
        }
    }, [paymentSession]);

    useEffect(() => {
        // Check URL parameters on component mount
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('status');
        const paymentId = urlParams.get('cko-payment-id');

        if (paymentStatus === 'succeeded') {
            toast.success('Payment succeeded!', 'success');
        } else if (paymentStatus === 'failed') {
            toast.error('Payment failed. Please try again.', 'error');
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
                    {/* Card 1 - Session Request */}
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

                    {/* Card 2 - Flow Module */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Flow module</Card.Title>
                            <Card.Text>
                                <div id="flow-container"></div>
                                <div id='klarna-container'></div>
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
