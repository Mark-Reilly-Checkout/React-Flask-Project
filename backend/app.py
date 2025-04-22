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
import json, datetime, traceback, os, requests

app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, origins="https://react-frontend-elpl.onrender.com") #Frontend is running on https://

# Path to your Apple Pay merchant certificate and key
APPLE_PAY_CERT = './certificate_sandbox.pem'
APPLE_PAY_KEY = './certificate_sandbox.key'
MERCHANT_ID = 'merchant.com.reactFlask.sandbox'

# Init API keys
checkout_api = CheckoutSdk.builder() \
    .secret_key('sk_sbox_vyafhd3nyddbhrs6ks53gpx2mi5') \
    .public_key('pk_sbox_z6zxchef4pyoy3bziidwee4clm4')\
    .environment(Environment.sandbox()) \
    .build() 
payments_client = checkout_api.payments    


""" # Init OAuth keys
checkout_api = CheckoutSdk\
    .builder()\
    .oauth()\
    .client_credentials(client_id='ack_jdvxyolcn7zexnoptk3cec3zze', client_secret='b8OZBEXkGxSF3Xe4VG9BiVltDo-N9lKLZQa_g7MSbK9OSDxdb-8mGK53YsWPMqMDZRFaQZMxnPCVfNcw8y6sxQ')\
    .environment(Environment.sandbox())\
    .build()
payments_client = checkout_api.payments """


# Test to show FE and BE communicating 
@app.route('/')
def get_data():
    return jsonify({"message": "Hello from Flask!"})

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
    response = None
    try:
        data = request.json
        payment_request = {
            "amount": data["amount"],  # Amount in cents
            "currency": "EUR",
            "reference": "order-12345",
            "capture": True,  # Auto-capture payment
            "customer": {
                "name":"Mark Reilly",
                "email": data["email"]
            },
            "billing":{
                "address":{
                    "country":"NL"
                }
            },
            "payment_method_configuration": {
                "googlepay":{
                    "store_payment_details":"disabled"
                }
            },
            "payment_type": "Recurring",
            "items": [
                {
                "name":         "Battery Power Pack",
                "quantity":     1,
                "unit_price":   1000,
                "total_amount": 1000,
                "reference":    "SE532"    }
            ],
            "processing_channel_id":"pc_pxk25jk2hvuenon5nyv3p6nf2i",
            "success_url": "https://react-frontend-elpl.onrender.com/success",
            "failure_url": "https://react-frontend-elpl.onrender.com/failure"
        }

        # ✅ Check if `sessions` exists in `checkout_api`
        if not hasattr(checkout_api, "sessions"):
            return jsonify({"error": "Sessions API is not available in the SDK"}), 500

       # Access payment sessions client correctly
        payment_sessions_client = checkout_api.payment_sessions
        
        # Create the payment session
        response = payment_sessions_client.create_payment_sessions(payment_request)


        print(f"Payment Session Token: {response.id}")

        return jsonify({

            "id": response.id,
            "payment_session_secret ": response.payment_session_secret,
            "payment_session_token": response.payment_session_token
        })

    except Exception as e:
        error_message = {"error": str(e)}
        if response and hasattr(response, 'error_type'):
            error_message["type"] = response.error_type  # Avoids accessing response if it's None
        return jsonify(error_message), 500

# POST - Regular - Payment
@app.route('/api/requestPayment', methods=['POST'])
def regularPayment():
    try:
        data = request.json
        payment_request = {
            "source": {
                "type": "card",
                "number": data["card_number"],  # Card number from frontend
                "expiry_month": data["expiry_month"],  # Expiry month from frontend
                "expiry_year": data["expiry_year"],  # Expiry year from frontend
                "cvv": data["cvv"]  # CVV from frontend
            },
            "amount": data["amount"],  # Amount in cents
            "currency": "USD",
            "reference": "order-1234",
            "capture": True,  # Auto-capture payment
            "payment_type": "Regular",
            "customer": {
                "name":"Mark Reilly",
                "email": data["email"]
            },
            "billing":{
                "address":{
                    "country":"GB"
                }
            },
            "processing_channel_id":"pc_pxk25jk2hvuenon5nyv3p6nf2i",
            "success_url": "https://react-frontend-elpl.onrender.com/success",
            "failure_url": "https://react-frontend-elpl.onrender.com/failure"
        }

        response = checkout_api.payments.request_payment(payment_request)
        #Display the API response response.id will find the field with id from the response
        return jsonify({"payment_id": response.id, "amount": response.amount, "status":response.status, "Response code": response.response_code, "Response Summary":response.response_summary})

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

@app.route('/api/apple-pay-session', methods=['POST'])
def applePaySession():
    data = request.get_json()

    payload = {
        "source": {
            "type": "applepay",
            "token_data": data["tokenData"]
        },
        "amount": data["amount"],
        "currency": "USD",  # or EUR/GBP depending on your use
        "reference": "apple_pay_txn_001",
    }

    headers = {
        "Authorization": "sk_sbox_vyafhd3nyddbhrs6ks53gpx2mi5",
        "Content-Type": "application/json"
    }

    response = requests.post("https://api.sandbox.checkout.com/payments", json=payload, headers=headers)

    return jsonify(response.json()), response.status_code


@app.route("/api/apple-pay/complete", methods=["POST"])
def complete_apple_pay():
    data = request.get_json()

    # This route would typically finalize the order or save to DB
    # For now we just echo the token for testing
    return jsonify({
        "status": "success",
        "message": "Payment token received",
        "token": data
    })

@app.route('/api/apple-pay/validate-merchant', methods=['POST'])
def validate_merchant():
    data = request.get_json()
    validation_url = data.get('validationURL')

    if not validation_url:
        return jsonify({"error": "Missing validationURL"}), 400

    payload = {
        "merchantIdentifier": MERCHANT_ID,
        "domainName": "react-frontend-elpl.onrender.com",  # use your dev domain or localhost
        "displayName": "My Shop"
    }

    try:
        response = requests.post(
            validation_url,
            json=payload,
            cert=(APPLE_PAY_CERT, APPLE_PAY_KEY),
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        print("❌ Error validating merchant:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run()
    #app.run(port=5000)
