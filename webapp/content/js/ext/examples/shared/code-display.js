/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
// Create and append to the body, a Panel containing a block of code from the passed URL
function createCodePanel(url, title) {
	var panel = new Ext.Panel({
		hideMode: 'visibility',
		title: title,
    	width: 750,
    	style: {
    		'margin-top': '10px'
    	},
    	hideCollapseTool: true,
    	titleCollapse: true,
    	collapsible: true,
    	collapsed: true,
		autoScroll: true,
		renderTo: Ext.getBody(),
		listeners: {
			render: function(p) {
				p.getUpdater().setRenderer({
					render: Ext.isIE ? function(el, response, scripts, callback) {
						el.update('');
						var np = el.createChild({
							tag: 'pre',
							cls: 'code',
							cn: {
								tag: 'code'
							}
						});
						var t = response.responseText.split("\n");
						var c = np.child('code', true);
						for (var i = 0, l = t.length; i < l; i++) {
							var pre = document.createElement('pre');
							if (t[i].length) {
								pre.appendChild(document.createTextNode(t[i]));
								c.appendChild(pre);
							} else if (i < (l - 1)) {
								c.appendChild(document.createElement("br"));
							}
							
						}
					} : function(el, response, scripts, callback) {
						el.update('');
						el.createChild({
							tag: 'pre',
							cls: 'code',
							cn: {
								tag: 'code',
								html: response.responseText
							}
						});
					}
				});
			},
			beforeexpand: function(p) {
				p.load(url);
			},
			single: true
		}
	});
}

// Patch to allow XHR to local files. From hendricd: http://extjs.com/forum/member.php?u=8730
Ext.apply( Ext.lib.Ajax ,
{ forceActiveX:false,
  createXhrObject:function(transactionId)
        {
            var obj={  status:{isError:false}
            	     , tId:transactionId}, http;
            try
            {
            	
		if(Ext.isIE7 && !!this.forceActiveX){throw("IE7forceActiveX");}
                
		obj.conn= new XMLHttpRequest();
		
            }
            catch(e)
            {
                for (var i = 0; i < this.activeX.length; ++i) {
                    try
                    {
                        obj.conn= new ActiveXObject(this.activeX[i]);
			
                        break;
                    }
                    catch(e) { 
                    }
                }
            }
            finally
            {
            	obj.status.isError = typeof(obj.conn) === undefined;
            }	
            return obj;
            
        },
        
        getHttpStatus: function(reqObj){
        
        	var statObj = {  status:0
        			,statusText:''
        			,isError:false
        			,isLocal:false
        			,isOK:false
        			,error:null};
        	
        	try {
        		if(!reqObj)throw('noobj');
		        statObj.status = reqObj.status;
		        
		        statObj.isLocal = !reqObj.status && location.protocol == "file:" || 
		        		   Ext.isSafari && reqObj.status === undefined;
		        
		        statObj.isOK = (statObj.isLocal || (statObj.status > 199 && statObj.status < 300));
		        statObj.statusText = reqObj.statusText || '';
		    } catch(e){ //status may not avail/valid yet (or called too early).
		      } 
		    
    		return statObj; 
        
        },
        handleTransactionResponse:function(o, callback, isAbort)
		{
	
		
		callback = callback || {};
		var responseObject=null;
		
		 if(!o.status.isError){
			o.status = this.getHttpStatus(o.conn);	 	
		 	/* create and enhance the response with proper status and XMLDOM if necessary */
		 	responseObject = this.createResponseObject(o, callback.argument);
		 }
		
 		 if(o.status.isError){ /* checked again in case exception was raised - ActiveX was disabled during XML-DOM creation? */
 		     // And mixin everything the XHR object had to offer as well
		   responseObject = Ext.applyIf(responseObject||{},this.createExceptionObject(o.tId, callback.argument, (isAbort ? isAbort : false)));
		   
		 }
		
		 responseObject.options = o.options;
		 responseObject.stat = o.status;
		 
		 if (o.status.isOK && !o.status.isError) {
			if (callback.success) {
				if (!callback.scope) {
					callback.success(responseObject);
				}
				else {
					callback.success.apply(callback.scope, [responseObject]);
				}
			}
		  } else {

			if (callback.failure) {
				if (!callback.scope) {
					callback.failure(responseObject);
				}
				else {
					callback.failure.apply(callback.scope, [responseObject]);
				}
			}

		 }
		
		if(o.options.async){
			this.releaseObject(o);	
			responseObject = null;
		}else{ 
			this.releaseObject(o);
			return responseObject; 
		}
			
	},
	createResponseObject:function(o, callbackArg)
	{
	    var obj = {};
	    var headerObj = {},headerStr='';

	    try{  //to catch bad encoding problems here
		obj.responseText = o.conn.responseText;
	    }catch(e){obj.responseText ='';}

	    obj.responseXML = o.conn.responseXML;

	    try{
		headerStr = o.conn.getAllResponseHeaders()||'';
	    } catch(e){}

	    if(o.status.isLocal){

		   o.status.isOK = ((o.status.status = (!!obj.responseText.length)?200:404) == 200);

		   if(o.status.isOK && (!obj.responseXML || obj.responseXML.childNodes.length == 0)){

			var xdoc=null;
			try{   //ActiveX may be disabled
				if(typeof(DOMParser) == 'undefined'){ 
					xdoc=new ActiveXObject("Microsoft.XMLDOM"); 
					xdoc.async="false";
					xdoc.loadXML(obj.responseText); 

				}else{ 
					try{  //Opera 9 will fail parsing non-XML content, so trap here.
						var domParser = new DOMParser(); 
						xdoc = domParser.parseFromString(obj.responseText, 'application\/xml'); 
					}catch(ex){}
					finally{domParser = null;}

				}
			} catch(ex){ 
				o.status.isError = true; 
				o.status.error = ex;

				}

			obj.responseXML = xdoc;
		    }

		    if(obj.responseXML){

			var parseBad = (obj.responseXML.parseError || 0) != 0 || obj.responseXML.childNodes.length == 0;
			if(!parseBad){
				headerStr = 'Content-Type: ' + (obj.responseXML.contentType || 'text\/xml') + '\n' + headerStr ;
				}			    
		    }		


	    }	

	   var header = headerStr.split('\n');
	   for (var i = 0; i < header.length; i++) {
	        var delimitPos = header[i].indexOf(':');
	    	if (delimitPos != -1) {
			headerObj[header[i].substring(0, delimitPos)] = header[i].substring(delimitPos + 2);
	    	}
	    }

	    obj.tId = o.tId;
	    obj.status = o.status.status;
	    obj.statusText = o.status.statusText;
	    obj.getResponseHeader = headerObj;
	    obj.getAllResponseHeaders = headerStr;
	    obj.stat = o.status

	    if (typeof callbackArg !== undefined) {
		obj.argument = callbackArg;
	    }

	    return obj;
        },
        
	request : function(method, uri, cb, data, options) {
	            
	             options = Ext.apply({async:true,
			   headers:false,
			   userId:null,
			   password:null,
			   xmlData:null }, options||{});
	            	                	
	                var hs = options.headers;
	                if(hs){
	                    for(var h in hs){
	                        if(hs.hasOwnProperty(h)){
	                            this.initHeader(h, hs[h], false);
	                        }
	                    }
	                }
	                if(options.xmlData){
	                    this.initHeader('Content-Type', 'text/xml', false);
	                    method = 'POST';
	                    data = options.xmlData;
	                }
	            	            
		    return this.makeRequest(method, uri, cb, data, options);
		    
        },
        asyncRequest:function(method, uri, callback, postData)
        {
            var o = this.getConnectionObject();

            if (!o || o.status.isError) {
                return null;
            }
            else {
            	o.options = options;
                try{
			o.conn.open(method, uri, true);
		} catch(ex){
			o.status.isError = true;
			o.status.error = ex;
			return Ext.apply(o,this.handleTransactionResponse(o, callback));
			
		}
		
		
		if (this.useDefaultXhrHeader) {
		    if (!this.defaultHeaders['X-Requested-With']) {
			this.initHeader('X-Requested-With', this.defaultXhrHeader, true);
		    }
		}

		if(postData && this.useDefaultHeader){
		    this.initHeader('Content-Type', this.defaultPostHeader);
		}

		 if (this.hasDefaultHeaders || this.hasHeaders) {
		    this.setHeader(o);
		}

		this.handleReadyState(o, callback);
		
		try{ o.conn.send(postData || null);
		} catch(ex){ 
			o.status.isError=true;
			o.status.error = ex;
			return Ext.apply(o,this.handleTransactionResponse(o, callback));
		}
			
					
		return o;
            }
        },
        
        makeRequest:function(method, uri, callback, postData, options)
        {
            var o = this.getConnectionObject();
            	     
            if (!o || o.status.isError) {
                return null;
            }
            else {
            	o.options = options;	
                try{
			o.conn.open(method, uri, options.async, options.userId, options.password);
		} catch(ex){
			o.status.isError = true;
			o.status.error = ex;
			var r=this.handleTransactionResponse(o, callback);
			return Ext.apply(o,r);
		}

		if (this.useDefaultXhrHeader) {
		    if (!this.defaultHeaders['X-Requested-With']) {
			this.initHeader('X-Requested-With', this.defaultXhrHeader, true);
		    }
		}

		if(postData && this.useDefaultHeader){
		    this.initHeader('Content-Type', this.defaultPostHeader);
		}

		 if (this.hasDefaultHeaders || this.hasHeaders) {
		    this.setHeader(o);
		}

		if(o.options.async){ //Timers won't work here as it's a blocking call
			this.handleReadyState(o, callback);
		}
		
		try{ o.conn.send(postData || null);
		} catch(ex){ 
			//Ext.apply(o,this.handleTransactionResponse(o, callback));
		}
				
		return options.async?o:Ext.apply(o,this.handleTransactionResponse(o, callback));
            }
   }});
	
Ext.lib.Ajax.forceActiveX = (document.location.protocol == 'file:');/* or other true/false mechanism */