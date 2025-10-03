from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from checkout_sdk.checkout_sdk import CheckoutSdk
from checkout_sdk.environment import Environment
import json, datetime, traceback, os, requests, uuid, traceback
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt


app = Flask(__name__)
app.config["DEBUG"] = True
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_secret_key_for_development')
CORS(app, origins=["https://react-frontend-elpl.onrender.com", "https://react-flask-project-kpyi.onrender.com"]) #Frontend is running on https://

# These will be loaded from your .env file locally, or from Render's environment settings in production
CHECKOUT_SECRET_KEY = os.environ.get('CHECKOUT_SECRET_KEY')
CHECKOUT_PUBLIC_KEY = os.environ.get('CHECKOUT_PUBLIC_KEY')

print("Checkout Secret Key:", CHECKOUT_SECRET_KEY)
print("Checkout Public Key:", CHECKOUT_PUBLIC_KEY)

# Path to your Apple Pay merchant certificate and key
APPLE_PAY_CERT = './certificate_sandbox.pem'
APPLE_PAY_KEY = './certificate_sandbox.key'
MERCHANT_ID = 'merchant.com.reactFlask.sandbox'

# Initialise Checkout SDK
checkout_api = CheckoutSdk.builder() \
    .secret_key(CHECKOUT_SECRET_KEY) \
    .public_key(CHECKOUT_PUBLIC_KEY)\
    .environment(Environment.sandbox()) \
    .build() 
payments_client = checkout_api.payments    

# --- NEW: Initialize Bcrypt and LoginManager ---
bcrypt = Bcrypt(app)
login_manager = LoginManager()
login_manager.init_app(app)

# --- NEW: Simple in-memory user store (for demonstration) ---
users = {}

# --- NEW: User class for Flask-Login ---
class User(UserMixin):
    def __init__(self, id, email, password_hash):
        self.id = id
        self.email = email
        self.password_hash = password_hash

    @staticmethod
    def get(user_id):
        return users.get(user_id)

# --- NEW: User loader function for Flask-Login ---
@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if email in users:
        return jsonify({"error": "User already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(email=email, password_hash=hashed_password)
    users[email] = new_user

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = users.get(email)

    if user and bcrypt.check_password_hash(user.password_hash, password):
        login_user(user) # This handles the session cookie
        return jsonify({"message": "Logged in successfully", "user": {"email": user.email}}), 200

    return jsonify({"error": "Invalid credentials"}), 401


@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/api/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({"isLoggedIn": True, "user": {"email": current_user.email}}), 200
    else:
        return jsonify({"isLoggedIn": False, "user": None}), 200


# Test to show FE and BE communicating ff
@app.route('/')
def get_data():
    return jsonify({"message": "Hello from Flask!"})

#Route for verify domain with apple pay file. 
@app.route('/.well-known/apple-developer-merchantid-domain-association.txt')
def serve_apple_pay_verification():
    well_known_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.well-known')
    return send_from_directory(well_known_dir, 'apple-developer-merchantid-domain-association.txt')

# Recursively convert the payment details to a JSON-serializable structure
def make_json_serializable(data):
    """ Recursively make data JSON serializable """
    if isinstance(data, dict):
        return {key: make_json_serializable(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [make_json_serializable(item) for item in data]
    elif hasattr(data, '__dict__'):
        return make_json_serializable(vars(data))
    elif isinstance(data, (str, int, float, bool, type(None))):
        return data
    elif hasattr(data, 'href'):  # Specific handling for ResponseWrapper links
        return data.href  # Assuming href holds the URL link
    else:
        return str(data)

# GET - payment details
@app.route('/api/payment-details/<payment_id>')
def get_payment_details(payment_id):
    try:
        payment_details = payments_client.get_payment_details(payment_id)
        # Recursively convert the payment details to a JSON-serializable structure
        response_data = make_json_serializable(vars(payment_details))
        print("Extracted Payment Details:", response_data)
        return jsonify(response_data)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        if hasattr(e, 'http_status_code'):
            print(f"HTTP Status Code: {e.http_status_code}")
        if hasattr(e, 'error_details'):
            print(f"Error Details: {e.error_details}")
        return jsonify({"error": "Failed to fetch payment details", "details": str(e)}), 500
    
# POST - Flow - Create payment session
@app.route('/api/create-payment-session', methods=['POST'])
def create_payment_session():
    rresponse = None # Initialize response to None for error handling
    try:
        # Step 1: Get the raw JSON from the frontend
        data = request.json

        # Only set the default channel ID if one is not provided by the frontend
        if 'processing_channel_id' not in data:
            data['processing_channel_id'] = "pc_pxk25jk2hvuenon5nyv3p6nf2i"
        # Add success and failure URLs to the data received from the frontend.
        # This ensures redirection still works.
        data['success_url'] = "https://react-frontend-elpl.onrender.com/success"
        data['failure_url'] = "https://react-frontend-elpl.onrender.com/failure"


        # The block that manually built the `payment_request` has been removed.
        # We now pass the 'data' dictionary from the frontend directly.

        payment_sessions_client = checkout_api.payment_sessions
        
        # Step 2: Pass the entire frontend payload directly to the SDK
        response = payment_sessions_client.create_payment_sessions(data)

        print(f"Payment Session created successfully with ID: {response.id}")
        return jsonify({
            "id": response.id,
            "payment_session_secret": response.payment_session_secret,
            "payment_session_token": response.payment_session_token
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        error_message = {"error": "Internal Server Error during payment session creation", "details": str(e)}

        if hasattr(e, 'http_metadata') and e.http_metadata and hasattr(e.http_metadata, 'status_code'):
             error_message["http_status_code"] = e.http_metadata.status_code
             if hasattr(e, 'error_details') and e.error_details:
                 error_message["api_errors"] = e.error_details
             print(f"Checkout API Error: Status {e.http_metadata.status_code}, Details: {e.error_details}")
        elif response and hasattr(response, 'error_type'):
            error_message["type"] = response.error_type
        return jsonify(error_message), 500


# --- NEW ENDPOINT for Direct Card Payment with Risk Data ---
@app.route('/api/request-card-payment', methods=['POST'])
def request_card_payment():
    try:
        # Get the full JSON payload from the frontend
        payment_data = request.json
        
        print(f"Requesting card payment with data: {payment_data}")

        # Use the payments client to request a payment
        # The frontend payload already matches the structure needed by the SDK
        response = payments_client.request_payment(payment_data)

        # Convert the response object to a JSON-serializable dictionary
        response_data = make_json_serializable(vars(response))

        print(f"Payment response received: {response_data}")

        return jsonify(response_data)

    except Exception as e:
        traceback.print_exc()
        # Handle potential errors from the SDK
        error_details = str(e)
        status_code = 500
        if hasattr(e, 'http_metadata') and e.http_metadata:
            status_code = e.http_metadata.status_code
        if hasattr(e, 'error_details'):
            error_details = e.error_details
        
        return jsonify({"error": "Failed to process card payment", "details": error_details}), status_code


# POST - Regular - Payment
@app.route('/api/payments', methods=['POST'])

def regularPayment():
    try:
        data = request.json
        processing_channel_id = data.get("processing_channel_id")
        payment_context_id = data.get("payment_context_id")

        payment_request = {
            "payment_context_id": payment_context_id,  # Use the payment context ID from the frontend
            "processing_channel_id": processing_channel_id,  # Use the processing channel ID from the frontend
        }
        response = checkout_api.payments.request_payment(payment_request)
        #Display the API response response.id will find the field with id from the response
        return jsonify({"payment_id": response.id, "status":response.status})
    except Exception as e:
        #When there is an error display responses error codes and type
        return jsonify({"error": str(e), "error Code": response.error_codes, "Error Type": response.error_type}), 500

# POST - Regular - Payment Link
@app.route('/api/paymentLink', methods=['POST'])
def paymentLink():
    try:
        data = request.json
        requestPaymentLink = {
            "amount": data["amount"],  # Amount in cents
            "currency": "USD",
            "reference": "UCHA.SE LTD",
            "capture": True,  # Auto-capture payment
            "payment_type": "Regular",
            "customer": {
                "name":"Mark Reilly",
                "email": "test@checkout.com"
            },
            "billing":{
                "address":{
                    "country":"GB"
                }
            },
            "processing_channel_id":"pc_pxk25jk2hvuenon5nyv3p6nf2i",
            "return_url":"https://react-frontend-elpl.onrender.com/paymentLink"
        }
        response = checkout_api.payments_links.create_payment_link(requestPaymentLink)
        #Display the API response response.id will find the field with id from the response
        return jsonify({"id": response.id, "redirect_href": response._links.redirect.href, "expires_on":response.expires_on, "reference": response.reference})
    except Exception as e:
        error_message = {"error": str(e)}
        if response and hasattr(response, 'error_type'):
            error_message["type"] = response.error_type  # Avoids accessing response if it's None
        return jsonify(error_message), 500
    
# POST - Regular - Payment context
@app.route('/api/payment-contexts', methods=['POST'])
def paymentContext():
    response = None # Initialize response to None for error handling
    try:
        data = request.json
        
        # Extract dynamic values from the frontend request data
        amount = data["amount"]
        currency = data["currency"]
        reference = data.get("reference", f"cko-context-{uuid.uuid4().hex[:10]}") # Use provided reference or generate a unique one
        capture = data.get("capture", True) # Default to True if not provided by frontend
        payment_type = data.get("payment_type", "Regular") # Default to Regular if not provided by frontend
        
        # Customer details (assuming frontend sends email and potentially name)
        customer_email = data.get("email", "mark@hotmail.com")
        customer_name = data.get("customer_name", "Mark Reilly")

        # Billing address details (assuming frontend sends the full dict)
        #billing_address = data.get("billing_address")
        
        processing_channel_id = data.get("processing_channel_id")
        success_url = data.get("success_url")
        failure_url = data.get("failure_url")
        # --- FIXED: Extract nested processing and item data correctly ---
        processing_data = data.get("processing", {})
        user_action = processing_data.get("user_action", "continue")
        shipping_preference = processing_data.get("shipping_preference", "get_from_file")
        invoice_id = processing_data.get("invoice_id", f"inv-{uuid.uuid4().hex[:10]}")

        items_data = data.get("items", [])
        if not items_data: # Provide a default item if none are sent
            items_data = [{
                "name": "Default Item",
                "unit_price": amount,
                "quantity": 1,
                "total_amount": amount,
                "type": "digital",
            }]


        # Basic validation for mandatory fields from frontend
        if not all([amount, currency, customer_email, processing_channel_id, success_url, failure_url]):
            return jsonify({"error": "Missing essential fields for payment context (amount, currency, email, billing_address, processing_channel_id, success_url, failure_url)"}), 400

        # Construct the request for the Checkout.com API
        requestPaymentContext = {
            "source": { "type": "paypal" },
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "capture": capture,
            "payment_type": payment_type,
            "customer": {
                "name": customer_name,
                "email": customer_email
            },
            "processing": {
                "invoice_id": invoice_id,
                "user_action": user_action,
                "shipping_preference": shipping_preference, # Use the correctly extracted value
                "plan": {
                    "type": "merchant_initiated_billing_single_agreement"
                }
            },

            "processing_channel_id": processing_channel_id,
            "success_url": success_url,
            "failure_url": failure_url,
            "items": items_data
        }
        
        # Ensure 'contexts' exists in 'checkout_api' client
        if not hasattr(checkout_api, "contexts") or not hasattr(checkout_api.contexts, "create_payment_contexts"):
            print("Error: Checkout.com SDK 'contexts' client or 'create_payment_contexts' method not found.")
            return jsonify({"error": "Payment Contexts SDK client not initialized correctly"}), 500

        # Create the payment context
        payment_contexts_client = checkout_api.contexts
        response = payment_contexts_client.create_payment_contexts(requestPaymentContext)
        
        print(f"Payment Context created successfully with ID: {response.id}, Order ID: {response.partner_metadata.order_id}")

        # Return relevant response data to the frontend
        return jsonify({
            "id": response.id, # Checkout.com context ID
            "order_id": response.partner_metadata.order_id # Contains PayPal's order_i
        }), 201 # Return 201 Created for successful creation

    except Exception as e:
        import traceback
        traceback.print_exc()
        error_message = {"error": "Internal Server Error during payment context creation", "details": str(e)}

        if hasattr(e, 'http_metadata') and e.http_metadata and hasattr(e.http_metadata, 'status_code'):
             error_message["http_status_code"] = e.http_metadata.status_code
             if hasattr(e, 'error_details') and e.error_details:
                 error_message["api_errors"] = e.error_details
             print(f"Checkout API Error: Status {e.http_metadata.status_code}, Details: {e.error_details}")
        elif response and hasattr(response, 'error_type'):
            error_message["type"] = response.error_type
        return jsonify(error_message), 500


# POST - Apple Pay session
# This endpoint is called by the frontend to initiate the Apple Pay session
# It receives the Apple Pay token and amount, and then converts it into a Checkout.com token
# and processes the payment
@app.route('/api/apple-pay-session', methods=['POST'])
def apple_pay_session():
    data = request.get_json()
    print("Data in Apple Pay session call:", data)
    
    # 1. Tokenize the Apple Pay token using the SDK
    try:
        token_response = checkout_api.tokens.request_wallet_token({
            "type": "applepay",
            "token_data": data["tokenData"]
        })
        token = token_response.token  # The Checkout.com card token
        print("Tokenized Apple Pay token:", token)
    except Exception as e:
        print(f"Tokenization failed: {e}")
        return jsonify({"error": "Tokenization failed", "details": str(e)}), 400
    
    # 2. Use the token to create a payment request
    try:
        payment_request = {
            "source": {
                "type": "token",
                "token": token,
                "billing_address": {
                    "country": data.get("countryCode", "GB"),
                }
            },
            "amount": data["amount"],
            "currency": data["currencyCode"],
            "reference": f"apple-pay-risk-demo-{uuid.uuid4().hex[:6]}",
        }

        # --- NEW: Add risk data if device session ID is provided ---
        device_session_id = data.get("deviceSessionId")
        if device_session_id:
            payment_request['risk'] = {
                "enabled": True, # It's good practice to explicitly enable risk
                "device_session_id": device_session_id
            }
            print(f"Including risk data with device_session_id: {device_session_id}")
        
        payment_response = payments_client.request_payment(payment_request)
        
        # Determine payment status
        is_approved = payment_response.status == "Authorized" or payment_response.status == "Captured"
        return jsonify({
            "approved": is_approved,
            "status": payment_response.status,
            "payment_id": payment_response.id
        }), 200
    except Exception as e:
        print(f"Payment failed: {str(e)}")
        # Try to get more detailed error info from the SDK exception
        error_details = str(e)
        if hasattr(e, 'error_details'):
            error_details = e.error_details
        return jsonify({
            "approved": False,
            "error": error_details,
            "status": "Failed"
        }), 400

@app.route('/api/apple-pay/validate-merchant', methods=['POST'])
def validate_merchant():
    data = request.get_json()
    validation_url = data.get('validationURL')
    print("Validation URL:", validation_url)
    merchant_identifier = data.get('merchantIdentifier', MERCHANT_ID)  # Default to the defined MERCHANT_I
    print("Merchant Identifier:", merchant_identifier)
    display_name = data.get('displayName', "CKO Integrations")  # Default display name
    print("Display Name:", display_name)
    initiative_context = data.get('initiativeContext',"react-flask-project-kpyi.onrender.com")
    print("Initiative Context:", initiative_context)

    if not validation_url:
        return jsonify({"error": "Missing validationURL"}), 400
    payload = {
        "merchantIdentifier": merchant_identifier,
        "displayName": display_name,
        "initiative": "web",
        "initiativeContext": initiative_context  
    }
    
    try:
        response = requests.post(
            validation_url,
            json=payload,
            cert=(APPLE_PAY_CERT, APPLE_PAY_KEY),
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        print("Merchant Verified")
        return jsonify(response.json())
    except requests.RequestException as e:
        print("❌ Error validating merchant:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/submit-flow-session-payment', methods=['POST'])
def submit_flow_session_payment():
    try:
        data = request.json

        # --- Data received from Frontend ---
        session_data_token = data.get("session_data")
        payment_session_id = data.get("payment_session_id") # The ID from the initial payment session creation
        amount = data.get("amount") # Amount in minor units from frontend
        threeDsEnabled = data.get("threeDsEnabled")

        # --- Basic Validation ---
        if not all([session_data_token, payment_session_id, amount]):
            return jsonify({"error": "Missing essential submission data"}), 400

        # --- Construct the Request Body for Checkout.com API (based on cURL example) ---
        # Note: Some fields like 'items', '3ds', 'ip_address' are optional or might come from your
        # application's core logic. For this demo, we'll use a simple item.
        request_body = {
            "session_data": session_data_token,
            "amount": amount, # Amount in minor units
            "reference": f"SUBMIT-ORD-{payment_session_id}-{uuid.uuid4().hex[:6]}", # Generate a unique reference
            "items": [ # Using a simple item from the demo
                {
                    "name": "Wireless Headphones",
                    "quantity": 1,
                    "unit_price": amount, # Amount is total, for 1 item, unit_price = total_amount
                    "total_amount": 5555,
                    "reference": "ITEM-HEADPHONES"
                }
            ],
            # Optional: Add 3DS settings if applicable
            "3ds": {
                "enabled": threeDsEnabled, # Usually enabled
                "challenge_indicator": "no_preference",
            },
            # Optional: IP Address (for fraud screening), you might get this from request.remote_addr
            # "ip_address": request.remote_addr # Requires Flask's request object
        }

        # --- Make the API Call to Checkout.com ---
        headers = {
            'Authorization': f'Bearer {CHECKOUT_SECRET_KEY}', # Use your Checkout.com Secret Key
            'Content-Type': 'application/json'
        }

        # The URL for submitting payment sessions
        submit_url = f'https://api.sandbox.checkout.com/payment-sessions/{payment_session_id}/submits'

        print(f"Submitting payment session to CKO: {submit_url}")
        print(f"Request body: {request_body}")

        response = requests.post(submit_url, headers=headers, json=request_body)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        # --- IMPORTANT: Return the UNMODIFIED response body from CKO to the frontend ---
        # The frontend's flowComponent.completePayment() expects this specific format.
        print(f"Checkout.com submission response status: {response.status_code}")
        print(f"Checkout.com submission response body: {response.json()}")
        return jsonify(response.json()), response.status_code

    except requests.exceptions.HTTPError as http_err:
        # Handle HTTP errors from Checkout.com API call
        print(f"HTTP error occurred: {http_err}")
        print(f"Response content: {http_err.response.text}")
        try:
            error_details = http_err.response.json()
        except ValueError:
            error_details = {"message": http_err.response.text}
        return jsonify({"error": "CKO API HTTP Error", "details": error_details}), http_err.response.status_code
    except requests.exceptions.ConnectionError as conn_err:
        # Handle network connectivity errors
        print(f"Connection error occurred: {conn_err}")
        return jsonify({"error": "Network Connection Error to CKO", "details": str(conn_err)}), 503 # Service Unavailable
    except requests.exceptions.Timeout as timeout_err:
        # Handle request timeout errors
        print(f"Timeout error occurred: {timeout_err}")
        return jsonify({"error": "CKO API Request Timeout", "details": str(timeout_err)}), 504 # Gateway Timeout
    except Exception as e:
        # Catch any other unexpected errors
        traceback.print_exc()
        print(f"An unexpected error occurred during payment session submission: {e}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/api/hosted-payments', methods=['POST'])
def create_hosted_payments_page_session():
    try:
        # The frontend sends a JSON payload that matches the expected API structure.
        # We can pass this dictionary directly to the SDK method.
        payload = request.json

        # The SDK's hosted_payments client is accessed directly from the main API instance.
        # The payload dictionary is passed as the argument.
        response = checkout_api.hosted_payments.create_hosted_payments_page_session(payload)

        # The SDK response object needs to be converted to a dict to be JSON serializable
        response_dict = {
            "id": response.id,
            "reference": response.reference,
            "_links": {
                "redirect": {
                    "href": response._links['redirect'].href
                }
            }
        }
        
        return jsonify(response_dict), 201

    except Exception as e:
        traceback.print_exc()
        # Attempt to get more detailed error info from the SDK exception if available
        error_details = str(e)
        if hasattr(e, 'error_details'):
            error_details = e.error_details
        return jsonify({"error": "Failed to create Hosted Payments session", "details": error_details}), 500


if __name__ == '__main__':
    app.run()
    #app.run(port=5000)
