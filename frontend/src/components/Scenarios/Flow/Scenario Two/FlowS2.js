import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import CardGroup from 'react-bootstrap/CardGroup';
import { Frames, CardNumber, ExpiryDate, Cvv, CardFrame } from "frames-react";
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams } from "react-router-dom";
import { FaExclamationCircle, FaQuestionCircle } from 'react-icons/fa';




const FlowS2 = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [searchParams] = useSearchParams();
    const paymentIdFromUrl = searchParams.get("cko-payment-id");
    const [inlinePaymentId, setInlinePaymentId] = useState(null);


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
                amount: 1000,  // Amount in cents ($50.00)
                email: "test@example.com",
                country: "AT",
                currency: "EUR",
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

    useEffect(() => {
        if (paymentSession) {
            loadCheckoutWebComponents({
                paymentSession,
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',  // Replace with your actual public key
                environment: 'sandbox', // Or 'production' based on your environment
                onPaymentCompleted: (_component, paymentResponse) => {
                    toast.success('Payment completed successfully!');
                    toast.info('Payment ID: ' + paymentResponse.id);
                    setInlinePaymentId(paymentResponse.id); // <-- Store for rendering
                    console.log("Payment ID:", paymentResponse.id);
                },
                onError: (component, error) => {
                    toast.error('Payment failed. Please try again.');
                    console.error("Payment Error:", error);
                    toast.info('Request ID: ' + (error?.request_id || 'N/A'));
                }
            }).then(checkout => {
                const flowComponent = checkout.create('flow');
                flowComponent.mount('#flow-container');  // Mount the Flow component to a div
                setLastUpdatedFlow(new Date()); // Update second card when flow mounts
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

    //Frames

    const [isCardValid, setIsCardValid] = useState(false);
    const [token, setToken] = useState("");
    const [cardholder, setCardholder] = useState({
    name: "Space InFront",
    billingAddress: {
        addressLine1: "123 Anywhere St.",
        addressLine2: "Apt. 456",
        zip: "123456",
        city: "Anytown",
        state: "Alabama",
        country: "US",
    },
    phone: "5551234567",
    });

    function loadScript() {
        // Check if already loaded to avoid duplicates
        if (window.Frames) {
            Frames.init('pk_sbox_z6zxchef4pyoy3bziidwee4clm4');
            setLastUpdatedFrames(new Date());
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.checkout.com/js/framesv2.min.js";
        script.async = true;
        script.onload = () => {
            console.log("Frames script loaded");
            Frames.init('pk_sbox_z6zxchef4pyoy3bziidwee4clm4');
            setLastUpdatedFrames(new Date());
        };
        document.body.appendChild(script);
    }

    useEffect(() => {
        loadScript();
    }, []);

    return (
        <div>
            <h1 className="text-center">Flow Scenario Two</h1>
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

                                {(inlinePaymentId || paymentIdFromUrl) && (
                                    <div className="text-center my-3">
                                        <p className="text-success">Payment completed!</p>
                                        <p>
                                            <strong>Payment ID:</strong> <code>{inlinePaymentId || paymentIdFromUrl}</code>
                                        </p>
                                    </div>
                                )}

                                <br />
                                <form
                                    id="payment-form"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        Frames.cardholder = cardholder;
                                        Frames.submitCard();
                                    }}
                                >
                                    <Frames
                                        config={{
                                            publicKey: "pk_sbox_z6zxchef4pyoy3bziidwee4clm4",
                                            cardholder,
                                        }}
                                        cardValidationChanged={(e) => setIsCardValid(e.isValid)}
                                        cardTokenized={(e) => setToken(e.token)}
                                    >
                                        <div className="card-frame">
                                            <CardNumber />
                                            <ExpiryDate />
                                            <Cvv />
                                        </div>
                                        <button id="pay-button" type="submit" disabled={!isCardValid}>
                                            Tokenize Card
                                        </button>
                                    </Frames>
                                    <div id="payment-result">
                                        {token && <>Card tokenized successfully. Token: {token}</>}
                                    </div>
                                </form>
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
                            </Card.Text>
                        </Card.Body>
                        <Card.Footer>
                            <small className="text-muted">{timeAgoFlow}</small>
                        </Card.Footer>
                    </Card>

                    {/* Card 3 - Frames */}
                    <Card>
                        <Card.Body>
                            <Card.Title className="text-center">Scenario</Card.Title>
                            <Card.Text>
                                <div className="text-center" >
                                <FaExclamationCircle color="#3a86ff" style={{marginRight: 8}}/>
                                <span className="text-muted">Scenario: </span> My Flow component is showing on the website but after I enter my name in the form, 
                                I am not able to click on the card number field or the expiry date field. 
                                </div>
                                <div className="text-center mt-3" >
                                <FaQuestionCircle color="#ef233c" style={{marginRight: 8}}/>
                                What would we check in this scenario ? What could affect the card field ?
                                </div>
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


export default FlowS2;
