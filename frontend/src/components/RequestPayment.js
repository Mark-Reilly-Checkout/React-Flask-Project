import axios from "axios";
import Button from 'react-bootstrap/Button';
import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import CardGroup from 'react-bootstrap/CardGroup';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

const PaymentComponent = () => {
    const [loading, setLoading] = useState(false);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";


    const RequestPayment = async () => {
        try {
            const response = axios.post(`${API_BASE_URL}api/requestPayment`, {
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
        } finally {
            setLoading(false);
        }
    };
    return (
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
                                <div>
                                    <p className="text-muted">Hosted payment pages coming soon...</p>
                                </div>
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

