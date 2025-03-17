import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Dropdown } from 'react-bootstrap';

const NavigationBar = () => {
  return (
    <Navbar bg="primary" data-bs-theme="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand href="#home">CKO Integrations</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
            <Nav.Link href="#services">Services</Nav.Link>
            <Nav.Link href="#contact">Contact</Nav.Link>
          </Nav>
          <Nav>
            <NavDropdown title="More deets" id="collapsible-nav-dropdown" data-bs-theme="light">
              <Dropdown.Item href="#hello">Hello</Dropdown.Item>
              <Dropdown.Item href="#hey">Hey</Dropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
