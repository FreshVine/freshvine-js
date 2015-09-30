/*!
 * Fresh Vine API javascript library
 * A simple javascript library that makes it easy to use the Fresh Vine API.
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
 *
 */

if( typeof FV_API_CLIENT_ID == 'undefined' || typeof FV_API_CLIENT_SECRET == 'undefined' ){ throw new Error('You must define your FV_API_CLIENT_ID to use fv-api.js');	}
if( typeof FV_API_VERSION == 'undefined'){	var FV_API_VERSION = '1';	}

var	FV_connection_api_status = true;	// Boolean if the API is accessible
if( typeof FV_API_AUTH_APPROACH === 'undefined' ){
	var FV_API_AUTH_APPROACH = 'key';			// Valid values are 'key', or 'token'
}

	//
	// This is the Fresh Vine API for javascript based applications
var FV_MakeRequest = function( Endpoint, Method, RequestData, SuccessFunction, ErrorFunction, excludeAuthData ){

		// Ensure it is a full URI
		if( Endpoint.toLowerCase().indexOf("https://api.freshvine.co/") === -1 ){
			if( Endpoint.indexOf('auth/') == -1 ){
				Endpoint =  FV_API_VERSION + '/' + Endpoint;
			}
			Endpoint = 'https://api.freshvine.co/' + Endpoint;	// Prepend the Fresh Vine API domain to the endpoint 
		}

		// If Endpoint starts with 'auth/' we don't append the api version
		var activeAuth = true;
		if( FV_API_AUTH_APPROACH === 'key' && ( FV_getItem('FV_api_key') === null || FV_getItem('FV_api_key').length == 0 ) ){
			activeAuth = false;
		}
		if( FV_API_AUTH_APPROACH === 'token' && ( FV_getItem('FV_access_token') === null || FV_getItem('FV_access_token').length == 0 ) ){
			activeAuth = false;
		}

		if( !activeAuth && Endpoint.toLowerCase().indexOf('https://api.freshvine.co/auth/') === -1 ){
			if( typeof FV_code_response != 'object' ){
				if( typeof FV_DeviceCodeRegister === 'function' ){
					FV_DeviceCodeRegister();	// We haven't started polling yet
				}
			}

			ErrorFunction( 401, 'Unable to Process Request, Not yet Authenticated' );
			return false;	// Requests cannot be made until the API is connected
		}

		if( Method.toUpperCase() !== 'GET' && Method.toUpperCase() !== 'POST' )
			return false;

		Method = Method.toUpperCase();

		//
		// Add in the auth header data to the RequestData object
		if( typeof RequestData === 'undefined')
			RequestData = {};
		if( typeof excludeAuthData === 'undefined' || excludeAuthData == false ){
			RequestData['FVappid'] = FV_API_CLIENT_ID;
			// RequestData['FVsecret'] = FV_API_CLIENT_SECRET;
			// Set the Auth Approach
			if( FV_API_AUTH_APPROACH === 'key' ){
				RequestData['FVkey'] = FV_getItem('FV_api_key');
			}else if( FV_API_AUTH_APPROACH === 'token' ){
				RequestData['oauth_token'] = FV_getItem('FV_access_token');
			}
		}

		$.ajax({type: Method,
				url: Endpoint,
				dataType: 'json',
				data: RequestData
			})
			.done(function( data, textStatus, jqXHR ) {
				// Check if the key or token expired
				FV_ConnectionOnline();	// Mark it online
				// console.log('Request Done', data, textStatus, jqXHR );

				if( typeof SuccessFunction == 'function' ){
					SuccessFunction( data, textStatus, jqXHR );
				}
			})
			.fail(function(data, textStatus, errorThrown ){
				// console.log( 'ajax failed', data.status );
				if( data.status == 0 ){
					FV_ConnectionOffline(); // Unable to reach the web
				}else{
					FV_ConnectionOnline();	// Mark it online
				}
				if( data.status >= 400 ){
					FV_ErrorHandler( data.status );	// Manage big errors
				}	// Only catching errors here

				// Check if the key or token expired
				if( typeof ErrorFunction == 'function' ){
					ErrorFunction( data.status, textStatus, errorThrown );
				}
				return;
			});
	},
	FV_ErrorHandler = function( statusCode ){
		if( statusCode == '401'){		// 401: Unauthorized - trash the credentials
			if( FV_API_AUTH_APPROACH === 'token' ){
				FV_removeItem('FV_access_token');
				FV_removeItem('FV_refresh_token');
			}else if( FV_API_AUTH_APPROACH === 'key' ){
				FV_removeItem('FV_api_key');
			}

			if( typeof FV_DeviceCodeRegister === 'function' ){
				FV_DeviceCodeRegister();	// Restart the Device Code approach
			}
		}

		return true;
	},
	FV_ConnectionStatus = function(){
		return FV_connection_api_status;	// Simply returns the current status. You may choose to change up the variable name used.
	},
	FV_Disconnect = function( callbackFunction ){	// Need to drop key/s, and tell Fresh Vine to destroy them - will keep them from showing up in the My Apps section
		if( FV_API_AUTH_APPROACH === 'token' ){ var endpoint = 'auth/oauth/destroy';
		}else if( FV_API_AUTH_APPROACH === 'key' ){	var endpoint = 'auth/key/destroy';	}

		FV_MakeRequest( endpoint, 'GET', {}, function(){
				if( FV_API_AUTH_APPROACH === 'token' ){
					FV_removeItem('FV_access_token');
					FV_removeItem('FV_refresh_token');
				}else if( FV_API_AUTH_APPROACH === 'key' ){
					FV_removeItem('FV_api_key');
				}

				if( typeof callbackFunction == 'function'){	callbackFunction();	}
			});
	};

//
// If you're using a different data storage approach than localstorage you can write your own functions and load them prior to this script.
if( typeof FV_getItem !== 'function'){
	/*
	 * Retreive information from a storage system
	 */
	var FV_getItem = function( k ){
			return window.localStorage.getItem( k );
		};
}
if( typeof FV_removeItem !== 'function'){
	/*
	 * Remove information from a storage system
	 */
	var FV_removeItem = function( k ){
			return window.localStorage.removeItem( k );
		};
}
if( typeof FV_setItem !== 'function'){
	/*
	 * Save information into a storage system
	 */
	var FV_setItem = function( k, v ){
			return window.localStorage.setItem( k, v );
		};
}
if( typeof FV_ConnectionOffline != 'function' ){
	/*
	 * Function called when javascript is unable to reach the server
	 * Helpful for letting the user know that your application cannot reach the web/fresh vine
	 */
	FV_ConnectionOffline = function(){
		if( FV_ConnectionStatus == false ){ return; }	// Already disconnected
		FV_connection_api_status = false;

		// This is where you'd suspend things that require a web connection
		console.log('Your unable to reach the Fresh Vine API')

		return;
	}
}
if( typeof FV_ConnectionOnline != 'function' ){
	/*
	 * Function called when javascript is able to reach the server
	 * Helpful for letting the user know that your application can reach the web/fresh vine
	 */
	FV_ConnectionOnline = function(){
		if( FV_ConnectionStatus == true ){ return; }	// Already connected
		FV_connection_api_status = true;

		// This is where you'd place your custom scripts for when the web comes back

		return;
	};
}