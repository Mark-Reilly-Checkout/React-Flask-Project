import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import your page components (merged list)
import Home from './components/Home';
import Flow from './components/Flow';
import RequestPayment from './components/RequestPayment';
import Success from './components/Redirects/Success';
import Failure from './components/Redirects/Failure';
import OnAuthorized from './components/FlowCallbacks/OnAuthorized';
import PayPal from './components/PayPal';
import CheckoutDemo from './components/CheckoutDemo';
import DeliveryPage from './components/DeliveryPage';
import PaymentLink from './components/PaymentLink';
import ApplePay from './components/ApplePay';
import GooglePay from './components/GooglePay';
import Test from './components/Test';
import FlowHandleSubmit from './components/FlowCallbacks/FlowHandleSubmit';
import FlowHandleClick from './components/FlowCallbacks/FlowHandleClick';
import RememberMe from './components/FlowCallbacks/RememberMe';
import Tokenization from './components/FlowCallbacks/Tokenization';
import HostedPaymentPages from './components/HostedPaymentPages';
import CheckoutDemoApp from './components/CheckoutDemoApp';

// Import Login and Register components
import Login from './components/Login';
import Register from './components/Register';

// A simple component for the navigation bar
const AppNavbar = ({ currentUser, onLogout }) => {
    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-gray-800">Payment Suite</Link>
                <div className="flex items-center space-x-4">
                    {currentUser ? (
                        <>
                            <span className="text-gray-700">Welcome, {currentUser.email}</span>
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="px-4 py-2 rounded text-gray-700 hover:bg-gray-200">Login</Link>
                            <Link to="/register" className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};


function App() {
    // State for current user
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true); // To handle initial auth check
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // Check login status on app load
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/status`, { withCredentials: true });
                if (response.data.isLoggedIn) {
                    setCurrentUser(response.data.user);
                }
            } catch (error) {
                console.error("Could not fetch login status:", error);
            } finally {
                setLoading(false);
            }
        };
        checkLoginStatus();
    }, [API_BASE_URL]);

    // Handlers for login and logout
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/logout`, {}, { withCredentials: true });
            setCurrentUser(null);
            toast.success("Logged out successfully.");
        } catch (error) {
            toast.error("Logout failed. Please try again.");
        }
    };

    if (loading) {
        return <div>Loading...</div>; // Or a proper spinner component
    }

    return (
        <Router>
            <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
            <AppNavbar currentUser={currentUser} onLogout={handleLogout} />
            <div className="container mx-auto p-4">
                <Routes>
                    {/* Merged Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/flow" element={<Flow />} />
                    <Route path="/requestPayment" element={<RequestPayment />} />
                    <Route path="/paymentLink" element={<PaymentLink />} />
                    <Route path="/applePay" element={<ApplePay />} />
                    <Route path="/googlePay" element={<GooglePay />} />
                    <Route path="/test" element={<Test />} />
                    <Route path="/success" element={<Success />} />
                    <Route path="/failure" element={<Failure />} />
                    <Route path="/paypal" element={<PayPal />} />
                    <Route path="/flowHandleSubmit" element={<FlowHandleSubmit />} />
                    <Route path="/flowHandleClick" element={<FlowHandleClick />} />
                    <Route path="/onAuthorized" element={<OnAuthorized />} />
                    <Route path="/rememberMe" element={<RememberMe/>} />
                    <Route path='/tokenization' element={<Tokenization/>}/>
                    <Route path="/hosted-payment-pages" element={<HostedPaymentPages />}/>
                    <Route path="/checkout-demo/*" element={<CheckoutDemoApp />} />
                    <Route path="/delivery" element={<DeliveryPage />} />

                    {/* Authentication Routes */}
                    <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                    <Route path="/register" element={<Register />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;

