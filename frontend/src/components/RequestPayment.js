import axios from "axios";
import Button from 'react-bootstrap/Button';
import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import CardGroup from 'react-bootstrap/CardGroup';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

const PaymentComponent = () => {
    const [loading, setLoading] = useState(false);


const RequestPayment = async () => {
    try {
        const response = axios.post("http://127.0.0.1:5000/api/requestPayment", {
            card_number: "4242424242424242",
            expiry_month: "6",
            expiry_year: "2025",
            cvv: "100",
            amount: 5000,  // Amount in cents ($50.00)
            email: "test@example.com"
        });

        console.log("Payment Response:", response.data);
    } catch (error) {
        console.error("Payment Error:", error.response ? error.response.data : error.message);
    }finally {
        setLoading(false);
    }
};
return(
    <div>
        <br></br>
    <div>
    <CardGroup>
        <Card>
            <Card.Body>
            <Card.Title>Request Payment</Card.Title>
            <Card.Text>
            <div>
                <button onClick={RequestPayment} disabled={loading}>
                    {loading ? "Processing..." : "Make Payment"}
                </button>
            </div>
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <small className="text-muted">Last updated 3 mins ago</small>
            </Card.Footer>
        </Card>
        <Card>
            <Card.Body>
            <Card.Title>Flow - Tokenisation Only</Card.Title>
            <Card.Text>
                This card has supporting text below as a natural lead-in to
                additional content.
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <small className="text-muted">Last updated 3 mins ago</small>
            </Card.Footer>
        </Card>
        <Card>
            <Card.Body>
            <Card.Title>Frames</Card.Title>
            <Card.Text>
                This is a wider card with supporting text below as a natural lead-in
                to additional content. This card has even longer content than the
                first to show that equal height action.
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


export default PaymentComponent;

