import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import CardGroup from 'react-bootstrap/CardGroup';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';

const Flow = () => {
    const [loading, setLoading] = useState(false);
    const [paymentSession, setPaymentSession] = useState(null);
    const publicKey = 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4';

    const SessionRequest = async () => {
        setLoading(true);
        // Set loading to true when the request starts
        try {
            const response = await axios.post("http://127.0.0.1:5000/api/create-payment-session", {
                amount: 1000,  // Amount in cents ($50.00)
                email: "test@example.com"
            });
            console.log("Payment Responses:", response.data);
            console.log("Session ID:", response.data.id);
            setPaymentSession(response.data); // Store session data in state

        } catch (error) {
            console.error("Payment Error:", error.response ? error.response.data : error.message);
        }finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paymentSession) {
            loadCheckoutWebComponents({
                paymentSession,
                publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',  // Replace with your actual public key
                environment: 'sandbox'         // Or 'production' based on your environment
            }).then(checkout => {
                const flowComponent = checkout.create('flow');
                flowComponent.mount('#flow-container');  // Mount the Flow component to a div
                const klarnaComponent = checkout.create("klarna");
                const klarnaElement = document.getElementById('klarna-container');
                if (klarnaComponent.isAvailable()) {
                    klarnaComponent.mount(klarnaElement);
                  }
            }).catch(err => console.error("Checkout Web Components Error:", err));
        }
    }, [paymentSession]);



    

return(
    <div>
        <br></br>
    <div>
    <CardGroup>
        <Card>
            <Card.Body>
            <Card.Title>Requet a session for Flow</Card.Title>
            <Card.Text>
            <div>
                <button onClick={SessionRequest} disabled={loading}>
                    {loading ? "Processing..." : "Request Session"}
                </button>

                <br></br>
                <div>
                {paymentSession && (
                 <p>Payment Session ID: {paymentSession.id}</p>
                )}
                </div>
            </div>
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <small className="text-muted">Last updated 3 mins ago</small>
            </Card.Footer>
        </Card>
        <Card>
            <Card.Body>
            <Card.Title>Flow module</Card.Title>
            <Card.Text>
            <div id="flow-container"></div>
            <div id='klarna-container'></div>
            <p>{paymentSession ? `Session ID: ${paymentSession.id}` : ''}</p>
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <small className="text-muted">Last updated 3 mins ago</small>
            </Card.Footer>
        </Card>
        <Card>
            <Card.Body>
            <Card.Title></Card.Title>
            <Card.Text>
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <small className="text-muted">Last updated 3 mins ago</small>
            </Card.Footer>
        </Card>
    </CardGroup> 
    </div>
</div>
    );
};


export default Flow;
