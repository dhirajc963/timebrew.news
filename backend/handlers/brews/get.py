import json

def handler(event, context):
    return {
        'statusCode': 501,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'message': 'Get brews endpoint - not implemented yet',
            'endpoint': 'GET /brews'
        })
    }