/*!
 * Fresh Vine API Device Code javascript library
 * The functional side of using a device code apprach for app authenication with the Fresh Vine API.
 *
 * @author Paul Prins
 * @link http://freshvine.co/
 * @version 1.0
 * @requires jQuery v1.7 or later
 *
 * Find instructions and source on GitHub: https://github.com/FreshVine/Fresh-Vine-API-js
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

var	FV_code_response = undefined,
	FV_code_polling_timer,
	FV_code_state = 'inactive'; // Possible States 'fetching','displaying','inactive'

if( typeof FV_API_SCOPE == 'undefined' ){ var FV_API_SCOPE = ''; }

var FV_DeviceCodeRegister = function( StateValue ){
		FV_ConnectionOnline();	// Ensure we set the system as online
		if( typeof FV_code_response == 'object' ){ return; }	// We're already doing it
		if( FV_code_state == 'fetching' ){ return; }	// Currenting running this step

		FV_DeviceCode_UI_Show();	// Fire up the UI
		FV_removeItem('FV_api_key');	// Ensure the current key has been removed
		if( typeof StateValue === 'undefined' )
			StateValue = '';

		syncTimer = 0;	// Clear the sync timer

		var endPoint = 'auth/key/device/code';
		if( FV_API_AUTH_APPROACH === 'token' ){ endPoint = 'auth/oauth/device/code'; }

		var thisData = {'FVappid': FV_API_CLIENT_ID,
						'FVsecret': FV_API_CLIENT_SECRET,
						'state': StateValue,	// this is just for us
						'scope': FV_API_SCOPE	};

		//
		// Queue up a polling check
		clearTimeout( FV_code_polling_timer );
		FV_MakeRequest( endPoint, 'POST', thisData, 
				function( data, textStatus, jqXHR ) {
					if ( typeof FV_DeviceCode_UI_ShowCode == 'function' ) {
						syncTimer = 0;	// Clear the timer
						FV_DeviceCode_UI_ShowCode( data.user_code );
					}
					FV_code_polling_timer = setTimeout(function(){ FV_DeviceCodeRegisterCheck(); }, data.interval * 1050 );
					console.log( 'FV_DeviceCodeRegister - Made it here');

					FV_code_response = data;
					FV_setItem('FV_user_code', data.user_code);
					FV_setItem('FV_device_code', data.device_code);
					return;
				},
				function(data, textStatus, errorThrown ){
					console.log('Error getting a device code', data, textStatus);
					FV_code_polling_timer = setTimeout(function(){
									syncTimer = 0;
									FV_DeviceCodeRegister();
								}, 10 * 1050 );	// Set this to 10 seconds, to try again
					return;
				}, true );
	},
	FV_DeviceCodeRegisterCheck = function(){
		FV_ConnectionOnline();	// Ensure we set the system as online
		var endPoint = 'auth/key/device/polling';
		if( FV_API_AUTH_APPROACH === 'token' )
			var endPoint = 'auth/oauth/device/polling';

		var thisData = {'FVappid': FV_API_CLIENT_ID,
						'FVsecret': FV_API_CLIENT_SECRET,
						'device_code': FV_code_response.device_code	};

		clearTimeout( FV_code_polling_timer );
		FV_MakeRequest( endPoint, 'POST', thisData,
				function( data, textStatus, jqXHR ) {
					console.log( 'FV_DeviceCodeRegisterCheck Made it here');
					//
					// We're polling and polling like a champ
					if( typeof data.error === 'string' ){
						switch( data.error ){
							case 'auth_pending':
							case 'slow_down':
								// Keep the loop going but at a slower pace
								clearTimeout( FV_code_polling_timer );
								FV_code_polling_timer = setTimeout(function(){ FV_DeviceCodeRegisterCheck(); }, FV_code_response.interval * 1500 );
								break;

							case 'auth_expired':
								FV_removeItem('FV_user_code');	// Clear the user code
								FV_code_response = undefined;
								if ( typeof FV_DeviceCodeRegister == 'function' ) {	FV_DeviceCodeRegister( );	}
								break;

							case 'auth_rejected':
								FV_removeItem('FV_user_code');	// Clear the user code
								FV_code_response = undefined;
								if ( typeof FV_DeviceCodeRegister == 'function' ) {	FV_DeviceCodeRegister( );	}
								break;

							case 'invalid':
								FV_removeItem('FV_user_code');	// Clear the user code
								FV_code_response = undefined;
								if ( typeof FV_DeviceCodeRegister == 'function' ) {	FV_DeviceCodeRegister( );	}
								break;

							case 'destoryed':
								FV_removeItem('FV_user_code');	// Clear the user code
								FV_code_response = undefined;
								if ( typeof FV_DeviceCodeRegister == 'function' ) {	FV_DeviceCodeRegister( );	}
								break;
						}

						return;
					}


					FV_removeItem('FV_device_code');	// Clear the user code
					FV_removeItem('FV_user_code');	// Clear the user code
					if( typeof data.access_token === 'string' ){
						FV_code_response = undefined;
						clearTimeout( FV_code_polling_timer );

						FV_setItem('FV_access_token', data.access_token);
						FV_setItem('FV_refresh_token', data.refresh_token);
						if ( typeof FV_DeviceCode_UI_Hide == 'function' ) {
							syncTimer = 0;
							FV_DeviceCode_UI_Hide( data.device_name );
						}
					}

					if( typeof data.access_key === 'string' ){
						FV_code_response = undefined;
						clearTimeout( FV_code_polling_timer );

						FV_setItem('FV_api_key', data.access_key);
						if ( typeof FV_DeviceCode_UI_Hide == 'function' ) {
							syncTimer = 0;
							FV_DeviceCode_UI_Hide( data.device_name );
						}
					}
					// if
				},
				function(jqXHR, textStatus, errorThrown ){
					console.log('Error getting a device token');

					FV_code_response = undefined;
					FV_removeItem('FV_user_code');	// Clear the user code
					if ( typeof FV_DeviceCode_UI_Show == 'function' ) {	syncTimer = 0;	FV_DeviceCode_UI_Show();	}
				}, true);
	};


if( typeof FV_DeviceCode_UI_Show !== 'function' ){
	/*
	 * Function called when the device code process starts - allows you to prep the user
	 */
	var FV_DeviceCode_UI_Show = function(){
		
	};
}
if( typeof FV_DeviceCode_UI_ShowCode !== 'function' ){
	/*
	 * Function called when the device code is retreived from the Fresh Vine api.
	 * 		You must somehow display the device code to the User. 
	 */
	FV_DeviceCode_UI_ShowCode = function( deviceCode ){
		// $('.deviceCode').html( deviceCode.substr(0, 3) + '&nbsp;&nbsp;' + deviceCode.substr(3) );
	};
}
if( typeof FV_DeviceCode_UI_Hide !== 'function' ){
	/*
	 * Function called when the device code has been successfully registered You can hide the UI and trigger other events
	 *		Also supplies the device name in
	 */
	FV_DeviceCode_UI_Hide = function( deviceName ){
		
	};
}
