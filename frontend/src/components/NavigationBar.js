import React, { useState } from 'react';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NavigationBar = ({ currentUser, onLogout }) => {
    // --- NEW: State to manually control the collapse/expand behavior ---
    const [expanded, setExpanded] = useState(false);

    return (
        // --- UPDATED: Connect the Navbar's state to our manual `expanded` state ---
        <Navbar 
            bg="dark" 
            variant="dark" 
            expand="lg" 
            className="border-b border-slate-700"
            expanded={expanded} // Control the component's state
            onToggle={() => setExpanded(!expanded)} // Toggle state on hamburger click
        >
            <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>CKO Payments</Navbar.Brand>
            
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />

            <Navbar.Collapse id="responsive-navbar-nav">
                
                <Nav className="me-auto">
                    {/* --- UPDATED: Added onClick to every link to close the menu after selection --- */}
                    <Nav.Link as={Link} to="/requestPayment" onClick={() => setExpanded(false)}>Request Payment</Nav.Link>
                    <Nav.Link as={Link} to="/paymentLink" onClick={() => setExpanded(false)}>Payment Link</Nav.Link>
                    
                    <NavDropdown title="Flow Demos" id="flow-demos-dropdown">
                        <NavDropdown.Item as={Link} to="/flow" onClick={() => setExpanded(false)}>Standard Flow</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/flow-saved-card" onClick={() => setExpanded(false)}>Saved Card</NavDropdown.Item>
                        <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/flowHandleSubmit" onClick={() => setExpanded(false)}>Handle Submit Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/flowHandleClick" onClick={() => setExpanded(false)}>Handle Click Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/onAuthorized" onClick={() => setExpanded(false)}>On Authorized Callback</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/rememberMe" onClick={() => setExpanded(false)}>Remember Me</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/tokenization" onClick={() => setExpanded(false)}>Tokenization</NavDropdown.Item>
                    </NavDropdown>

                    <NavDropdown title="APMs & Wallets" id="apm-wallets-dropdown">
                        <NavDropdown.Item as={Link} to="/paypal" onClick={() => setExpanded(false)}>PayPal</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/googlePay" onClick={() => setExpanded(false)}>Google Pay</NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/applePay" onClick={() => setExpanded(false)}>Apple Pay</NavDropdown.Item>
                    </NavDropdown>

                    <Nav.Link as={Link} to="/hosted-payment-pages" onClick={() => setExpanded(false)}>Hosted Payments</Nav.Link>
                    <Nav.Link as={Link} to="/checkout-demo" onClick={() => setExpanded(false)}>Checkout Demo</Nav.Link>
                </Nav>

                <Nav>
                    {currentUser ? (
                        <>
                            <Navbar.Text className="text-slate-400 me-3">
                                Signed in as: {currentUser.email}
                            </Navbar.Text>
                            {/* --- UPDATED: The logout link also needs to close the menu --- */}
                            <Nav.Link onClick={() => { onLogout(); setExpanded(false); }} className="text-slate-300 hover:text-white">Logout</Nav.Link>
                        </>
                    ) : (
                        <>
                            <Nav.Link as={Link} to="/login" onClick={() => setExpanded(false)} className="text-slate-300 hover:text-white">Login</Nav.Link>
                            <Nav.Link as={Link} to="/register" onClick={() => setExpanded(false)} className="text-slate-300 hover:text-white">Register</Nav.Link>
                        </>
                    )}
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
};

export default NavigationBar;

