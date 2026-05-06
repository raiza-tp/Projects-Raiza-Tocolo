import json
import urllib.request

def lambda_handler(event, context):
    try:
        api_key = "a5aa52d2-6d72-4b1a-a5dd-0ab54c92683c"
        url = f"https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&maxresults=5&compact=true&verbose=false&key={api_key}"

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps(data)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }