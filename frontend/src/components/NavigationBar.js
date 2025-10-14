import React from 'react';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NavigationBar = ({ currentUser, onLogout }) => {
    return (
        // The `expand="lg"` prop is key. It means the navbar will be in its expanded state
        // on large (lg) screens and up, and collapsed on screens smaller than that.
        <Navbar bg="dark" variant="dark" expand="lg" className="border-b border-slate-700">
            <Navbar.Brand as={Link} to="/">CKO Payments</Navbar.Brand>
            
            {/* This is the hamburger button that appears on smaller screens */}
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />

            {/* This component wraps all the content that will be collapsed */}
            <Navbar.Collapse id="responsive-navbar-nav">
                
                {/* Main navigation links */}
                <Nav className="me-auto">
                    <Nav.Link as={Link} to="/requestPayment">Request Payment</Nav.Link>
                    <Nav.Link as={Link} to="/paymentLink">Payment Link</Nav.Link>
                    
                    {/* Organized links into a "Flow Demos" dropdown */}
                    <NavDropdown title="Flow Demos" id="flow-demos-dropdown">
                        <NavDropdown.Item as={Link} to="/flow">Standard Flow</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/flow-saved-card">Saved Card</NavDropdown.Item>
                        <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/flowHandleSubmit">Handle Submit Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/flowHandleClick">Handle Click Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/onAuthorized">On Authorized Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/rememberMe">Remember Me</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/tokenization">Tokenization</NavDropdown.Item>
                    </NavDropdown>

                     {/* Organized links into an "APMs & Wallets" dropdown */}
                    <NavDropdown title="APMs & Wallets" id="apm-wallets-dropdown">
                        <NavDropdown.Item as={Link} to="/paypal">PayPal</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/googlePay">Google Pay</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/applePay">Apple Pay</NavDropdown.Item>
                    </NavDropdown>

                    <Nav.Link as={Link} to="/hosted-payment-pages">Hosted Payments</Nav.Link>
                    <Nav.Link as={Link} to="/checkout-demo">Checkout Demo</Nav.Link>
                </Nav>

                {/* Login/Logout links will also collapse into the menu */}
                <Nav>
                    {currentUser ? (
                        <>
                            <Navbar.Text className="text-slate-400 me-3">
                                Signed in as: {currentUser.email}
                            </Navbar.Text>
                            <Nav.Link onClick={onLogout} className="text-slate-300 hover:text-white">Logout</Nav.Link>
                        </>
                    ) : (
                        <>
                            <Nav.Link as={Link} to="/login" className="text-slate-300 hover:text-white">Login</Nav.Link>
                            <Nav.Link as={Link} to="/register" className="text-slate-300 hover:text-white">Register</Nav.Link>
                        </>
                    )}
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
};

export default NavigationBar;

