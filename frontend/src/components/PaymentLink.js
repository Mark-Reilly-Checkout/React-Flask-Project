import axios from "axios";
import Button from 'react-bootstrap/Button';
import React, { useState, useEffect } from 'react';
import { Card, CardText } from 'react-bootstrap';
import CardGroup from 'react-bootstrap/CardGroup';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

const PaymentLink = () => {
    const [loading, setLoading] = useState(false);
    const [paymentLinkData, setPaymentLinkData] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";


const RequestPaymentLink = async () => {
    try {
        const response = await axios.post(`${API_BASE_URL}api/paymentLink`, {
            amount: 5000
        });

        console.log("API Base URL:", API_BASE_URL);
        console.log("Payment Link data:", response.data);
        console.log("Payment Link ID:", response.data.id);

        setPaymentLinkData(response.data); // Store payment link data in state
    } catch (error) {
        console.error("Payment Error:", error.response ? error.response.data : error.message);
    }finally {
        setLoading(false);
    }
};
return(
    <div>
        <br></br>
    <div class="col d-flex justify-content-center">
    <CardGroup>
        <Card>
            <Card.Body>
            <Card.Title>Payment Link Demo</Card.Title>
            <Card.Text>
            <div text-center="true">
                <button onClick={RequestPaymentLink} disabled={loading}>
                    {loading ? "Processing..." : "Requesting Payment Link"}
                </button>
            </div>
            </Card.Text>
            </Card.Body>
            <Card.Footer>
            <div>
            {paymentLinkData && (
                 <p>Payment Link redirect: {paymentLinkData.redirect_href}</p>
                )}
            </div>
            </Card.Footer>
        </Card>
    </CardGroup> 
    </div>
</div>
    );
};


export default PaymentLink;

