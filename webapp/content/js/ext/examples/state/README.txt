This session scope state provider is in use in window/layout.html.

Usage:

get-state.php is included as JS file in the header of any page that needs state information. For a single
page application, that would be the main page of the application. It is NOT loaded via XHR/Ajax.

save-state.php is included in every page of the application, including pages loaded via ajax.

Inilialization of the SessionProvider looks like:
Ext.state.Manager.setProvider(new Ext.state.SessionProvider({state: Ext.appState}));

The way the session provider works is when a state change occurs, a cookie is set on the client 
with the new state data. The next time any page is requested on the server, save-state.php
will see that cookie, save it in the application state and CLEAR THE COOKIE. This way your application
doesn't have cookies creating unneccessary network latency.