from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from checkout_sdk.checkout_sdk import CheckoutSdk
from checkout_sdk.environment import Environment
from checkout_sdk.api_client import ApiClient
from checkout_sdk.authorization_type import AuthorizationType
from checkout_sdk.checkout_configuration import CheckoutConfiguration
from checkout_sdk.oauth_scopes import OAuthScopes
from checkout_sdk.payments.sessions.sessions_client import PaymentSessionsClient
from checkout_sdk.payments.sessions.sessions import PaymentSessionsRequest
import json, datetime, traceback, os, requests, uuid, traceback


app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, origins=["https://react-frontend-elpl.onrender.com", "https://react-flask-project-kpyi.onrender.com"]) #Frontend is running on https://

# Path to your Apple Pay merchant certificate and key
APPLE_PAY_CERT = './certificate_sandbox.pem'
APPLE_PAY_KEY = './certificate_sandbox.key'
MERCHANT_ID = 'merchant.com.reactFlask.sandbox'

# Initialise Checkout SDK
checkout_api = CheckoutSdk.builder() \
    .secret_key('sk_sbox_vyafhd3nyddbhrs6ks53gpx2mi5') \
    .public_key('pk_sbox_z6zxchef4pyoy3bziidwee4clm4')\
    .environment(Environment.sandbox()) \
    .build() 
payments_client = checkout_api.payments    


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

        # Add success and failure URLs to the data received from the frontend.
        # This ensures redirection still works.
        data['success_url'] = "https://react-frontend-elpl.onrender.com/success"
        data['failure_url'] = "https://react-frontend-elpl.onrender.com/failure"
        data['processing_channel_id'] = "pc_yeh2m5bgbfpefmkd2m3kmetiqy"


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
        user_action = data.get("user_action", "continue") # Default to 'continue' as per CKO docs
        itemType = data.get("type", "digital") # Default to 'continue' as per CKO docs



        # Basic validation for mandatory fields from frontend
        if not all([amount, currency, customer_email, processing_channel_id, success_url, failure_url]):
            return jsonify({"error": "Missing essential fields for payment context (amount, currency, email, billing_address, processing_channel_id, success_url, failure_url)"}), 400

        requestPaymentContext = {
            "source": { # As per documentation example for PayPal payment contexts
                "type": "paypal"
            },
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "capture": capture,
            "payment_type": payment_type, # Use dynamic payment_type
            "customer": {
                "name": customer_name,
                "email": customer_email
            },
            "processing": { # As per documentation example
                "invoice_id": data.get("invoice_id", f"inv-{uuid.uuid4().hex[:10]}"), # Use provided invoice_id or generate
                "user_action": user_action,
                "plan":{
                    "type":"merchant_initiated_billing_single_agreement"
                }
            },
            "processing_channel_id": processing_channel_id, # Use dynamic processing_channel_id
            "success_url": success_url, # Use dynamic success_url
            "failure_url": failure_url, # Use dynamic failure_url
            "items": data.get("items", [ # Items from frontend, or default dummy item
                {
                    "name": "Default Item",
                    "unit_price": amount,
                    "quantity": 1,
                    "total_amount": amount,
                    "type": itemType, # Use dynamic item typ
                }
            ])
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
                    "country": data.get("countryCode", "IE"),  # Default country if not sent from FE
                }
            },
            "amount": data["amount"],  # Amount from frontend (integer, e.g., 5000)
            "currency": data["currencyCode"],         # Or use data["currency"] if dynamic
            "reference": "apple_pay_txn_001",
        }
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
        return jsonify({
            "approved": False,
            "error": str(e),
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
            'Authorization': f'Bearer sk_sbox_vyafhd3nyddbhrs6ks53gpx2mi5', # Use your Checkout.com Secret Key
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


if __name__ == '__main__':
    app.run()
    #app.run(port=5000)
