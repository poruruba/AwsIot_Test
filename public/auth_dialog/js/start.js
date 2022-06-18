'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const REDIRECT_URL = 'https://home.poruru.work:10443/auth_dialog/index.html';
const COGNITO_URL = 'https://poruru.auth.ap-northeast-1.amazoncognito.com';

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
    },
    computed: {
    },
    methods: {
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        if( searchs.code ){
            var message = {
                code : searchs.code,
                state: searchs.state
            };
            window.opener.vue.do_token(message);
            window.close();
        }else{
            console.log(searchs);
            auth_location(searchs.client_id, searchs.scope, searchs.state);
        }
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function auth_location(client_id, scope, state){
    var params = {
        client_id: client_id,
        redirect_uri: REDIRECT_URL,
        response_type: 'code',
        state: state,
        scope: scope
    };
    console.log(params);
    window.location = COGNITO_URL + "/login" + to_urlparam(params);
}

function to_urlparam(qs){
    var params = new URLSearchParams();
    for( var key in qs )
        params.set(key, qs[key] );
    var param = params.toString();

    if( param == '' )
        return '';
    else
        return '?' + param;
}
