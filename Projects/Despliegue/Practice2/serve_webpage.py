import json
import urllib.request

def lambda_handler(event, context):
    try:
        api_key = "a5aa52d2-6d72-4b1a-a5dd-0ab54c92683c"
        url = f"https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&maxresults=5&compact=true&verbose=false&key={api_key}"

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        items = ""
        for station in data:
            info = station.get("AddressInfo", {})
            items += f"<li>{info.get('Title','?')} - {info.get('Town','?')}</li>"

        html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Estaciones de Carga</title></head>
<body>
  <h1>Estaciones de carga en España</h1>
  <ul>{items}</ul>
</body>
</html>"""

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/html; charset=utf-8",
                "Access-Control-Allow-Origin": "*"
            },
            "body": html
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"<h2>Error</h2><p>{str(e)}</p>"
        }
    