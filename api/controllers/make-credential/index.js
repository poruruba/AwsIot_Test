'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const COGNITO_FEDERATED_ID = '[Cognito IDプール]'; //ap-northeast-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX';
const COGNITO_USERPOOL_ID = '[CognitoユーザプールID]'; //ap-northeast-1_XXXXXXXXX';
const COGNITO_URL = '[Cognitoドメイン名]'; //https://XXXXX.auth.ap-northeast-1.amazoncognito.com';
const COGNITO_CLIENT_ID = '[クライアントID]';
const COGNITO_CLIENT_SECRET = '[クライアントシークレット]';
const TARGET_ASSUMEROLE_ARN = 'arn:aws:iam::[AWSアカウントID]:role/iot_limitedaccess_assumerole';
const AWSIOT_POLICY_NAME = "iot_limitedaccess_policy";
const AWSIOT_CUSTOM_AUTHORIZER = 'test-custom-authorizer';
const AWSIOT_ENDPOINT = '[AWS IoTデバイスデータエンドポイント]'; //XXXXXXXXX-ats.iot.ap-northeast-1.amazonaws.com';
const AWSIOT_TOPIC = "test_sub";
const HTTP_PARAM_NAME = 'actionToken';

const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;

const AWS = require('aws-sdk');
AWS.config.update({
	region: 'ap-northeast-1'
});

const sts = new AWS.STS({
	apiVersion: '2011-06-15',
});

const iot = new AWS.Iot({
	apiVersion: '2015-05-28'
});

const cognitoidentity = new AWS.CognitoIdentity({
	apiVersion: '2014-06-30'
});

exports.handler = async (event, context, callback) => {
	if( event.path == '/publish-cusotm-http'){
		var body = JSON.parse(event.body);
		var headers = {
			'X-Amz-CustomAuthorizer-Name' : AWSIOT_CUSTOM_AUTHORIZER
		};
		await do_post_with_headers("https://" + AWSIOT_ENDPOINT + '/topics/' + AWSIOT_TOPIC + '?' + HTTP_PARAM_NAME + '=allow', body, headers);
		return new Response({});
	}else
	if( event.path == '/make-credential-assumerole' ){
		var body = JSON.parse(event.body);

		var data = await sts.assumeRole({
			RoleArn: TARGET_ASSUMEROLE_ARN,
			RoleSessionName: body.client_id
		}).promise();

		return new Response({ credential: data.Credentials });
	}else
	if( event.path == '/make-credential-cognito' ){
		var body = JSON.parse(event.body);
		var params = {
			grant_type: 'authorization_code',
			client_id: COGNITO_CLIENT_ID,
			redirect_uri: body.redirect_uri,
			code: body.code
		};
		console.log(params);
		var result = await do_post_basic(COGNITO_URL + '/oauth2/token', params, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET);
		console.log(result);
		var id_token = result.id_token;

		var params = {
			IdentityPoolId: COGNITO_FEDERATED_ID,
			Logins: {
				["cognito-idp.ap-northeast-1.amazonaws.com/" + COGNITO_USERPOOL_ID]: id_token
			}
		};
		var result = await cognitoidentity.getId(params).promise();
		console.log(result);

		var identityId = result.IdentityId;

		var params = {
			target: identityId
		};
		var result = await iot.listAttachedPolicies(params).promise();
		console.log(result);
		
		var item = result.policies.find(item => item.policyName == AWSIOT_POLICY_NAME);
		if( !item ){
			console.log("policy not found");
			var params = {
				policyName: AWSIOT_POLICY_NAME,
				target: identityId,
			};
			await iot.attachPolicy(params).promise();
		}

		var params = {
			IdentityId: identityId,
			Logins: {
				["cognito-idp.ap-northeast-1.amazonaws.com/" + COGNITO_USERPOOL_ID]: id_token
			}
		};
		var result = await cognitoidentity.getCredentialsForIdentity(params).promise();
		console.log(result);
		return new Response({ credential: result.Credentials });
	}else{
		var body = JSON.parse(event.body);
		console.log(body);
		return new Response({ message: 'Hello World' });
	}
};

async function do_post_basic(url, params, client_id, client_secret){
	var data = new URLSearchParams(params).toString();
	var basic = 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64');
	const headers = new Headers( { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization' : basic } );

	return fetch(url, {
			method : 'POST',
			body : data,
			headers: headers
	})
	.then((response) => {
			if( !response.ok )
					throw 'status is not 200';
			return response.json();
	})
}

function do_post_with_headers(url, body, hds) {
	var headers = new Headers(hds);
	headers.append("Content-Type", "application/json");

	return fetch(url, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: headers
	})
	.then((response) => {
		if (!response.ok)
			throw 'status is not 200';
		return response.json();
//    return response.text();
//    return response.blob();
//    return response.arrayBuffer();
	});
}
