import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import CardGroup from 'react-bootstrap/CardGroup';
import { Frames, CardNumber, ExpiryDate, Cvv } from "frames-react";
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';


const Flow = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastType, setToastType] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

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

    // Initialize Frames and set third card's timestamp
    useEffect(() => {
        Frames.init("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");
        setLastUpdatedFrames(new Date()); // Update third card when Frames initializes
    }, []);

    const SessionRequest = async () => {
        setLoading(true);
        // Set loading to true when the request starts
        try {
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: 1000,  // Amount in cents ($50.00)
                email: "test@example.com"
            });

            setPaymentSession(response.data); // Store session data in state
            setLastUpdatedSession(new Date()); // Update first card's timestamp

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
            showToast('Error creating payment session', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paymentSession) {
            loadCheckoutWebComponents({
                paymentSession,
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',  // Replace with your actual public key
                environment: 'sandbox', // Or 'production' based on your environment
                onPaymentCompleted: (_component, paymentResponse) => {
                    showToast('Payment completed successfully!', 'success');
                    console.log("Payment completed with ID:", paymentResponse.id);
                },
                onError: (component, error) => {
                    showToast('Payment processing error', 'error');
                    console.error("Payment Error:", error, "Component:", component.type);
                }
            }).then(checkout => {
                const flowComponent = checkout.create('flow');
                flowComponent.mount('#flow-container');  // Mount the Flow component to a div
                setLastUpdatedFlow(new Date()); // Update second card when flow mounts
                const klarnaComponent = checkout.create("klarna");
                const klarnaElement = document.getElementById('klarna-container');
                if (klarnaComponent.isAvailable()) {
                    klarnaComponent.mount(klarnaElement);
                }
            }).catch(err => console.error("Checkout Web Components Error:", err));
        }
    }, [paymentSession]);

    useEffect(() => {
        // Check URL parameters on component mount
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('status');
        const paymentId = urlParams.get('cko-payment-id');

        if (paymentStatus === 'succeeded') {
            showToast('Payment succeeded!', 'success');
        } else if (paymentStatus === 'failed') {
            showToast('Payment failed. Please try again.', 'error');
        }

        if (paymentId) {
            console.log('Payment ID from URL:', paymentId);
        }
    }, []);

    const showToast = (message, type) => {
        setToastVisible(true);
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastVisible(false), 5000);
    };

    return (
        <div>
            <style>
                {`
                    .toast {
                        visibility: hidden;
                        min-width: 250px;
                        margin-left: -125px;
                        color: #fff;
                        text-align: center;
                        border-radius: 2px;
                        padding: 16px;
                        position: fixed;
                        z-index: 1;
                        left: 50%;
                        bottom: 30px;
                        font-family: monospace;
                        opacity: 0;
                        transition: all 0.5s ease;
                    }

                    .toast.show {
                        visibility: visible;
                        opacity: 1;
                        bottom: 30px;
                    }

                    .toast.success {
                        background-color: mediumseagreen;
                    }

                    .toast.error {
                        background-color: indianred;
                    }
                `}
            </style>
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

                                {/* Toast Notification */}
                                {toastVisible && (
                                    <div className={`toast ${toastType} show`}>
                                        {toastMessage}
                                    </div>
                                )}
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoFlow}</small>
                        </Card.Footer>
                    </Card>

                    {/* Card 3 - Frames */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Frames</Card.Title>
                            <Card.Text>
                                <div className="card-frame"></div>
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoFrames}</small>
                        </Card.Footer>
                    </Card>
                </CardGroup>
            </div>
        </div>
    );
};


export default Flow;
