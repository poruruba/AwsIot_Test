const HTTP_PARAM_NAME = 'actionToken';
const ALLOW_ACTION = 'Allow';
const DENY_ACTION = 'Deny';

exports.handler = function(event, context, callback) {
    console.log("test-iot-custom-authorizer called");
    console.log(event);
    
    var protocolData = event.protocolData;
    var ACCOUNT_ID = context.invokedFunctionArn.split(":")[4];
    if (!protocolData) {
        console.log('Using the test-invoke-authorizer cli for testing only');
        callback(null, generateAuthResponse(DENY_ACTION, ACCOUNT_ID));
    } else{
        var queryString = event.protocolData.http.queryString;
        console.log('queryString values -- ' + queryString);
        const params = new URLSearchParams(queryString);
        var action = params.get(HTTP_PARAM_NAME);
        if(action && action.toLowerCase() === 'allow'){
            callback(null, generateAuthResponse(ALLOW_ACTION, ACCOUNT_ID));
        }else{
            callback(null, generateAuthResponse(DENY_ACTION, ACCOUNT_ID));
        }
    }
};

var generateAuthResponse = function(effect, ACCOUNT_ID) {
    var statement = {};
    statement.Action = [
        "iot:Receive",
        "iot:Subscribe",
        "iot:Connect",
        "iot:Publish"
    ];
    statement.Effect = effect;
    statement.Resource = [
        "arn:aws:iot:ap-northeast-1:" + ACCOUNT_ID + ":topicfilter/test_sub",
        "arn:aws:iot:ap-northeast-1:" + ACCOUNT_ID + ":client/*",
        "arn:aws:iot:ap-northeast-1:" + ACCOUNT_ID + ":topic/test_sub"
    ];

    var policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    policyDocument.Statement[0] = statement;

    var authResponse = {};
    authResponse.isAuthenticated = true;
    authResponse.principalId = 'principalId';
    authResponse.policyDocuments = [policyDocument];
    authResponse.disconnectAfterInSeconds = 3600;
    authResponse.refreshAfterInSeconds = 600;

    console.log('authResponse --> ' + JSON.stringify(authResponse));

    return authResponse;
}            