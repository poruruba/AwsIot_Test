'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

// for cognito
const COGNITO_REDIRECT_URL = 'https://[立ち上げたNode.jsのホスト名]/auth_dialog/index.html';
const COGNITO_CLIENT_ID = '[CognitoクライアントID]';

// for awsiot
const AWSIOT_ENDPOINT = '[AWS IoTデバイスデータエンドポイント]'; // XXXXXXXXX-ats.iot.ap-northeast-1.amazonaws.com';
const AWSIOT_CLIENT_ID = "test01";
const AWSIOT_TOPIC = "test_sub";

// for awsiot custom authorozer
const AWSIOT_CUSTOM_AUTHORIZER = 'test-custom-authorizer';
const HTTP_PARAM_NAME = 'actionToken';

// for awsiot iam
const IAM_ACCESSKEY_ID = '[アクセスキーID]';
const IAM_SECRET_KEY = '[シークレットアクセスキー]';

const base_url = 'https://[立ち上げたNode.jsのホスト名]';

const awsIot = require('aws-iot-device-sdk');
var new_win;
var deviceIot;

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        is_connected: false,
        is_subscribed: false,
        state: "abcd",
        message: "hello world",
        logmessage: '',
        client_id: AWSIOT_CLIENT_ID,
    },
    computed: {
    },
    methods: {
        do_publish: async function(){
            if( !deviceIot ){
                alert('is not connected');
                return;
            }
            deviceIot.publish(AWSIOT_TOPIC, JSON.stringify({ message: this.message } ));
        },

        do_publish_custom_http: async function(){
            var params = {
                message : this.message
            };
            var result = await do_post(base_url + '/publish-custom-http', params );
            console.log(result);
        },

        start_iam: async function(){
            var credential = {
                protocol: 'wss',
                accessKeyId: IAM_ACCESSKEY_ID,
                secretKey: IAM_SECRET_KEY,
            };
            await this.mqtt_subscribe(AWSIOT_TOPIC, AWSIOT_CLIENT_ID, credential);
        },

        start_assumerole: async function(){
            var params = {
                client_id: AWSIOT_CLIENT_ID
            };
            var result = await do_post(base_url + "/make-credential-assumerole", params );
            console.log(result);
            var credential = {
                protocol: 'wss',
                accessKeyId: result.credential.AccessKeyId,
                secretKey: result.credential.SecretAccessKey,
                sessionToken: result.credential.SessionToken
            };
            await this.mqtt_subscribe(AWSIOT_TOPIC, AWSIOT_CLIENT_ID, credential);
        },

        start_custom: async function(){
            var credential = {
                protocol: 'wss-custom-auth',
                customAuthHeaders: {
                    'X-Amz-CustomAuthorizer-Name': AWSIOT_CUSTOM_AUTHORIZER,
                },
                customAuthQueryString: '?x-amz-customauthorizer-name=' + AWSIOT_CUSTOM_AUTHORIZER + '&' + HTTP_PARAM_NAME + '=allow',
            };
            await this.mqtt_subscribe(AWSIOT_TOPIC, AWSIOT_CLIENT_ID, credential);
        },

        start_login: function(){
            var params = {
                state: this.state,
                client_id: COGNITO_CLIENT_ID,
                scope: 'openid profile'
            };
            new_win = open(COGNITO_REDIRECT_URL + to_urlparam(params), null, 'width=500,height=750');
        },

        do_token: async function(message){
            if( this.state != message.state ){
                alert('state is mismatch');
                return;
            }
            console.log(message);

            var params = {
                code: message.code,
                redirect_uri: COGNITO_REDIRECT_URL
            };
            var result = await do_post(base_url + "/make-credential-cognito", params );
            console.log(result);

            var credential = {
                protocol: 'wss',
                accessKeyId: result.credential.AccessKeyId,
                secretKey: result.credential.SecretKey,
                sessionToken: result.credential.SessionToken
            };
            console.log(credential);

            await this.mqtt_subscribe(AWSIOT_TOPIC, AWSIOT_CLIENT_ID, credential);            
        },

        mqtt_subscribe: async function(topic, client_id, credential){
            console.log('start mqtt_subscribe');
            try{
                var params = {
                    region: 'ap-northeast-1',
                    host: AWSIOT_ENDPOINT,
                    clientId: client_id,
                };
                params = Object.assign(params, credential);

                if( deviceIot ){
                    deviceIot.end();
                    deviceIot = null;
                    this.is_connected = false;
                    this.is_subscribed = false;
                }
                deviceIot = awsIot.device(params);

                deviceIot.on('connect', () => {
                    this.is_connected = true;
                    console.log('connected');
                    deviceIot.subscribe(topic, undefined, (err, granted) =>{
                        if( err ){
                            console.error(err);
                            return;
                        }
                        this.is_subscribed = true;
                        console.log("deviceIot subscribe ok");
                    });
                });
                
                deviceIot.on('close', () =>{
                    this.is_connected = false;
                    this.is_subscribed = false;
                    console.log('closed');
                }),

                deviceIot.on('message', (topic, payload) => {
                    console.log('message (' + topic + ')');
                    console.log(payload.toString());
                    this.logmessage += (new Date().toLocaleString( 'ja-JP', {} )) + ": (" + topic + ") " + payload.toString() + '\n';
                });
            }catch(error){
                console.log('mqtt_subscribe error: ' + error);
            }
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function to_urlparam(qs){
    var params = new URLSearchParams(qs);
    // for( var key in qs )
    //     params.set(key, qs[key] );
    var param = params.toString();

    if( param == '' )
        return '';
    else
        return '?' + param;
}
