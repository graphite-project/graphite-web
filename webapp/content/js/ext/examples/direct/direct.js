/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    Ext.Direct.addProvider(
        Ext.app.REMOTING_API,
        {
            type:'polling',
            url: 'php/poll.php'
        }
    );

    var out = new Ext.form.DisplayField({
        cls: 'x-form-text',
        id: 'out'
    });

    var text = new Ext.form.TextField({
        width: 300,
        emptyText: 'Echo input'
    });

    var call = new Ext.Button({
        text: 'Echo',
        handler: function(){
            TestAction.doEcho(text.getValue(), function(result, e){
                var t = e.getTransaction();
                out.append(String.format('<p><b>Successful call to {0}.{1} with response:</b><xmp>{2}</xmp></p>',
                       t.action, t.method, Ext.encode(result)));
                out.el.scroll('b', 100000, true);
            });
        }
    });

    var num = new Ext.form.TextField({
        width: 80,
        emptyText: 'Multiply x 8',
        style:  'text-align:left;'
    });

    var multiply = new Ext.Button({
        text: 'Multiply',
        handler: function(){
            TestAction.multiply(num.getValue(), function(result, e){
                var t = e.getTransaction();
                if(e.status){
                    out.append(String.format('<p><b>Successful call to {0}.{1} with response:</b><xmp>{2}</xmp></p>',
                        t.action, t.method, Ext.encode(result)));
                }else{
                    out.append(String.format('<p><b>Call to {0}.{1} failed with message:</b><xmp>{2}</xmp></p>',
                        t.action, t.method, e.message));
                }
                out.el.scroll('b', 100000, true);
            });
        }
    });

    text.on('specialkey', function(t, e){
        if(e.getKey() == e.ENTER){
            call.handler();
        }
    });

	num.on('specialkey', function(t, e){
        if(e.getKey() == e.ENTER){
            multiply.handler();
        }
    });

	var p = new Ext.Panel({
        title: 'Remote Call Log',
        //frame:true,
		width: 600,
		height: 300,
		layout:'fit',
		
		items: [out],
        bbar: [text, call, '-', num, multiply]
	}).render(Ext.getBody());

    Ext.Direct.on('message', function(e){
        out.append(String.format('<p><i>{0}</i></p>', e.data));
                out.el.scroll('b', 100000, true);
    });
});
