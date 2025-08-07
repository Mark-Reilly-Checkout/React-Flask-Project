import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NavigationBar = () => {
  return (
    <Navbar bg="primary" data-bs-theme="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand href="/">CKO Integrations</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/flow">Flow</Nav.Link>
            <Nav.Link href="/hosted-payment-pages">Hosted Payment Pages</Nav.Link>
            <Nav.Link href="/paymentLink">Payment Link</Nav.Link>
            <Nav.Link href="/applePay">Apple Pay</Nav.Link>
            <Nav.Link href="/googlePay">Google Pay</Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link href="/checkout-demo">Checkout Demo</Nav.Link>
            <NavDropdown title="More APMs" id="collapsible-nav-dropdown" data-bs-theme="light">
              <Dropdown.Item href="#klarna">Klarna</Dropdown.Item>
              <Dropdown.Item href="/paypal">PayPal</Dropdown.Item>
              <Dropdown.Item href="#stc">STC Pay</Dropdown.Item>
              <Dropdown.Item href="#tabby">Tabby</Dropdown.Item>

            </NavDropdown>
          </Nav>
          <Nav>
            <NavDropdown title="Payouts" id="collapsible-nav-dropdown" data-bs-theme="light">
              <Dropdown.Item href="#card">Card</Dropdown.Item>
              <Dropdown.Item href="#bank">Bank</Dropdown.Item>
              <Dropdown.Item href="/requestPayment">Request Payment</Dropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
