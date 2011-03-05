/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.HtmlEditor
 * @extends Ext.form.Field
 * Provides a lightweight HTML Editor component. Some toolbar features are not supported by Safari and will be
 * automatically hidden when needed.  These are noted in the config options where appropriate.
 * <br><br>The editor's toolbar buttons have tooltips defined in the {@link #buttonTips} property, but they are not
 * enabled by default unless the global {@link Ext.QuickTips} singleton is {@link Ext.QuickTips#init initialized}.
 * <br><br><b>Note: The focus/blur and validation marking functionality inherited from Ext.form.Field is NOT
 * supported by this editor.</b>
 * <br><br>An Editor is a sensitive component that can't be used in all spots standard fields can be used. Putting an Editor within
 * any element that has display set to 'none' can cause problems in Safari and Firefox due to their default iframe reloading bugs.
 * <br><br>Example usage:
 * <pre><code>
// Simple example rendered with default options:
Ext.QuickTips.init();  // enable tooltips
new Ext.form.HtmlEditor({
    renderTo: Ext.getBody(),
    width: 800,
    height: 300
});

// Passed via xtype into a container and with custom options:
Ext.QuickTips.init();  // enable tooltips
new Ext.Panel({
    title: 'HTML Editor',
    renderTo: Ext.getBody(),
    width: 600,
    height: 300,
    frame: true,
    layout: 'fit',
    items: {
        xtype: 'htmleditor',
        enableColors: false,
        enableAlignments: false
    }
});
</code></pre>
 * @constructor
 * Create a new HtmlEditor
 * @param {Object} config
 * @xtype htmleditor
 */

Ext.form.HtmlEditor = Ext.extend(Ext.form.Field, {
    /**
     * @cfg {Boolean} enableFormat Enable the bold, italic and underline buttons (defaults to true)
     */
    enableFormat : true,
    /**
     * @cfg {Boolean} enableFontSize Enable the increase/decrease font size buttons (defaults to true)
     */
    enableFontSize : true,
    /**
     * @cfg {Boolean} enableColors Enable the fore/highlight color buttons (defaults to true)
     */
    enableColors : true,
    /**
     * @cfg {Boolean} enableAlignments Enable the left, center, right alignment buttons (defaults to true)
     */
    enableAlignments : true,
    /**
     * @cfg {Boolean} enableLists Enable the bullet and numbered list buttons. Not available in Safari. (defaults to true)
     */
    enableLists : true,
    /**
     * @cfg {Boolean} enableSourceEdit Enable the switch to source edit button. Not available in Safari. (defaults to true)
     */
    enableSourceEdit : true,
    /**
     * @cfg {Boolean} enableLinks Enable the create link button. Not available in Safari. (defaults to true)
     */
    enableLinks : true,
    /**
     * @cfg {Boolean} enableFont Enable font selection. Not available in Safari. (defaults to true)
     */
    enableFont : true,
    /**
     * @cfg {String} createLinkText The default text for the create link prompt
     */
    createLinkText : 'Please enter the URL for the link:',
    /**
     * @cfg {String} defaultLinkValue The default value for the create link prompt (defaults to http:/ /)
     */
    defaultLinkValue : 'http:/'+'/',
    /**
     * @cfg {Array} fontFamilies An array of available font families
     */
    fontFamilies : [
        'Arial',
        'Courier New',
        'Tahoma',
        'Times New Roman',
        'Verdana'
    ],
    defaultFont: 'tahoma',
    /**
     * @cfg {String} defaultValue A default value to be put into the editor to resolve focus issues (defaults to &#160; (Non-breaking space) in Opera and IE6, &#8203; (Zero-width space) in all other browsers).
     */
    defaultValue: (Ext.isOpera || Ext.isIE6) ? '&#160;' : '&#8203;',

    // private properties
    actionMode: 'wrap',
    validationEvent : false,
    deferHeight: true,
    initialized : false,
    activated : false,
    sourceEditMode : false,
    onFocus : Ext.emptyFn,
    iframePad:3,
    hideMode:'offsets',
    defaultAutoCreate : {
        tag: "textarea",
        style:"width:500px;height:300px;",
        autocomplete: "off"
    },

    // private
    initComponent : function(){
        this.addEvents(
            /**
             * @event initialize
             * Fires when the editor is fully initialized (including the iframe)
             * @param {HtmlEditor} this
             */
            'initialize',
            /**
             * @event activate
             * Fires when the editor is first receives the focus. Any insertion must wait
             * until after this event.
             * @param {HtmlEditor} this
             */
            'activate',
             /**
             * @event beforesync
             * Fires before the textarea is updated with content from the editor iframe. Return false
             * to cancel the sync.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'beforesync',
             /**
             * @event beforepush
             * Fires before the iframe editor is updated with content from the textarea. Return false
             * to cancel the push.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'beforepush',
             /**
             * @event sync
             * Fires when the textarea is updated with content from the editor iframe.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'sync',
             /**
             * @event push
             * Fires when the iframe editor is updated with content from the textarea.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'push',
             /**
             * @event editmodechange
             * Fires when the editor switches edit modes
             * @param {HtmlEditor} this
             * @param {Boolean} sourceEdit True if source edit, false if standard editing.
             */
            'editmodechange'
        );
        Ext.form.HtmlEditor.superclass.initComponent.call(this);
    },

    // private
    createFontOptions : function(){
        var buf = [], fs = this.fontFamilies, ff, lc;
        for(var i = 0, len = fs.length; i< len; i++){
            ff = fs[i];
            lc = ff.toLowerCase();
            buf.push(
                '<option value="',lc,'" style="font-family:',ff,';"',
                    (this.defaultFont == lc ? ' selected="true">' : '>'),
                    ff,
                '</option>'
            );
        }
        return buf.join('');
    },

    /*
     * Protected method that will not generally be called directly. It
     * is called when the editor creates its toolbar. Override this method if you need to
     * add custom toolbar buttons.
     * @param {HtmlEditor} editor
     */
    createToolbar : function(editor){
        var items = [];
        var tipsEnabled = Ext.QuickTips && Ext.QuickTips.isEnabled();


        function btn(id, toggle, handler){
            return {
                itemId : id,
                cls : 'x-btn-icon',
                iconCls: 'x-edit-'+id,
                enableToggle:toggle !== false,
                scope: editor,
                handler:handler||editor.relayBtnCmd,
                clickEvent:'mousedown',
                tooltip: tipsEnabled ? editor.buttonTips[id] || undefined : undefined,
                overflowText: editor.buttonTips[id].title || undefined,
                tabIndex:-1
            };
        }


        if(this.enableFont && !Ext.isSafari2){
            var fontSelectItem = new Ext.Toolbar.Item({
               autoEl: {
                    tag:'select',
                    cls:'x-font-select',
                    html: this.createFontOptions()
               }
            });

            items.push(
                fontSelectItem,
                '-'
            );
        }

        if(this.enableFormat){
            items.push(
                btn('bold'),
                btn('italic'),
                btn('underline')
            );
        }

        if(this.enableFontSize){
            items.push(
                '-',
                btn('increasefontsize', false, this.adjustFont),
                btn('decreasefontsize', false, this.adjustFont)
            );
        }

        if(this.enableColors){
            items.push(
                '-', {
                    itemId:'forecolor',
                    cls:'x-btn-icon',
                    iconCls: 'x-edit-forecolor',
                    clickEvent:'mousedown',
                    tooltip: tipsEnabled ? editor.buttonTips.forecolor || undefined : undefined,
                    tabIndex:-1,
                    menu : new Ext.menu.ColorMenu({
                        allowReselect: true,
                        focus: Ext.emptyFn,
                        value:'000000',
                        plain:true,
                        listeners: {
                            scope: this,
                            select: function(cp, color){
                                this.execCmd('forecolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                this.deferFocus();
                            }
                        },
                        clickEvent:'mousedown'
                    })
                }, {
                    itemId:'backcolor',
                    cls:'x-btn-icon',
                    iconCls: 'x-edit-backcolor',
                    clickEvent:'mousedown',
                    tooltip: tipsEnabled ? editor.buttonTips.backcolor || undefined : undefined,
                    tabIndex:-1,
                    menu : new Ext.menu.ColorMenu({
                        focus: Ext.emptyFn,
                        value:'FFFFFF',
                        plain:true,
                        allowReselect: true,
                        listeners: {
                            scope: this,
                            select: function(cp, color){
                                if(Ext.isGecko){
                                    this.execCmd('useCSS', false);
                                    this.execCmd('hilitecolor', color);
                                    this.execCmd('useCSS', true);
                                    this.deferFocus();
                                }else{
                                    this.execCmd(Ext.isOpera ? 'hilitecolor' : 'backcolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                    this.deferFocus();
                                }
                            }
                        },
                        clickEvent:'mousedown'
                    })
                }
            );
        }

        if(this.enableAlignments){
            items.push(
                '-',
                btn('justifyleft'),
                btn('justifycenter'),
                btn('justifyright')
            );
        }

        if(!Ext.isSafari2){
            if(this.enableLinks){
                items.push(
                    '-',
                    btn('createlink', false, this.createLink)
                );
            }

            if(this.enableLists){
                items.push(
                    '-',
                    btn('insertorderedlist'),
                    btn('insertunorderedlist')
                );
            }
            if(this.enableSourceEdit){
                items.push(
                    '-',
                    btn('sourceedit', true, function(btn){
                        this.toggleSourceEdit(!this.sourceEditMode);
                    })
                );
            }
        }

        // build the toolbar
        var tb = new Ext.Toolbar({
            renderTo: this.wrap.dom.firstChild,
            items: items
        });

        if (fontSelectItem) {
            this.fontSelect = fontSelectItem.el;

            this.mon(this.fontSelect, 'change', function(){
                var font = this.fontSelect.dom.value;
                this.relayCmd('fontname', font);
                this.deferFocus();
            }, this);
        }

        // stop form submits
        this.mon(tb.el, 'click', function(e){
            e.preventDefault();
        });

        this.tb = tb;
        this.tb.doLayout();
    },

    onDisable: function(){
        this.wrap.mask();
        Ext.form.HtmlEditor.superclass.onDisable.call(this);
    },

    onEnable: function(){
        this.wrap.unmask();
        Ext.form.HtmlEditor.superclass.onEnable.call(this);
    },

    setReadOnly: function(readOnly){

        Ext.form.HtmlEditor.superclass.setReadOnly.call(this, readOnly);
        if(this.initialized){
            if(Ext.isIE){
                this.getEditorBody().contentEditable = !readOnly;
            }else{
                this.setDesignMode(!readOnly);
            }
            var bd = this.getEditorBody();
            if(bd){
                bd.style.cursor = this.readOnly ? 'default' : 'text';
            }
            this.disableItems(readOnly);
        }
    },

    /**
     * Protected method that will not generally be called directly. It
     * is called when the editor initializes the iframe with HTML contents. Override this method if you
     * want to change the initialization markup of the iframe (e.g. to add stylesheets).
     *
     * Note: IE8-Standards has unwanted scroller behavior, so the default meta tag forces IE7 compatibility
     */
    getDocMarkup : function(){
        var h = Ext.fly(this.iframe).getHeight() - this.iframePad * 2;
        return String.format('<html><head><style type="text/css">body{border: 0; margin: 0; padding: {0}px; height: {1}px; cursor: text}</style></head><body></body></html>', this.iframePad, h);
    },

    // private
    getEditorBody : function(){
        var doc = this.getDoc();
        return doc.body || doc.documentElement;
    },

    // private
    getDoc : function(){
        return Ext.isIE ? this.getWin().document : (this.iframe.contentDocument || this.getWin().document);
    },

    // private
    getWin : function(){
        return Ext.isIE ? this.iframe.contentWindow : window.frames[this.iframe.name];
    },

    // private
    onRender : function(ct, position){
        Ext.form.HtmlEditor.superclass.onRender.call(this, ct, position);
        this.el.dom.style.border = '0 none';
        this.el.dom.setAttribute('tabIndex', -1);
        this.el.addClass('x-hidden');
        if(Ext.isIE){ // fix IE 1px bogus margin
            this.el.applyStyles('margin-top:-1px;margin-bottom:-1px;');
        }
        this.wrap = this.el.wrap({
            cls:'x-html-editor-wrap', cn:{cls:'x-html-editor-tb'}
        });

        this.createToolbar(this);

        this.disableItems(true);

        this.tb.doLayout();

        this.createIFrame();

        if(!this.width){
            var sz = this.el.getSize();
            this.setSize(sz.width, this.height || sz.height);
        }
        this.resizeEl = this.positionEl = this.wrap;
    },

    createIFrame: function(){
        var iframe = document.createElement('iframe');
        iframe.name = Ext.id();
        iframe.frameBorder = '0';
        iframe.style.overflow = 'auto';
        iframe.src = Ext.SSL_SECURE_URL;

        this.wrap.dom.appendChild(iframe);
        this.iframe = iframe;

        this.monitorTask = Ext.TaskMgr.start({
            run: this.checkDesignMode,
            scope: this,
            interval:100
        });
    },

    initFrame : function(){
        Ext.TaskMgr.stop(this.monitorTask);
        var doc = this.getDoc();
        this.win = this.getWin();

        doc.open();
        doc.write(this.getDocMarkup());
        doc.close();

        var task = { // must defer to wait for browser to be ready
            run : function(){
                var doc = this.getDoc();
                if(doc.body || doc.readyState == 'complete'){
                    Ext.TaskMgr.stop(task);
                    this.setDesignMode(true);
                    this.initEditor.defer(10, this);
                }
            },
            interval : 10,
            duration:10000,
            scope: this
        };
        Ext.TaskMgr.start(task);
    },


    checkDesignMode : function(){
        if(this.wrap && this.wrap.dom.offsetWidth){
            var doc = this.getDoc();
            if(!doc){
                return;
            }
            if(!doc.editorInitialized || this.getDesignMode() != 'on'){
                this.initFrame();
            }
        }
    },

    /* private
     * set current design mode. To enable, mode can be true or 'on', off otherwise
     */
    setDesignMode : function(mode){
        var doc = this.getDoc();
        if (doc) {
            if(this.readOnly){
                mode = false;
            }
            doc.designMode = (/on|true/i).test(String(mode).toLowerCase()) ?'on':'off';
        }

    },

    // private
    getDesignMode : function(){
        var doc = this.getDoc();
        if(!doc){ return ''; }
        return String(doc.designMode).toLowerCase();

    },

    disableItems: function(disabled){
        if(this.fontSelect){
            this.fontSelect.dom.disabled = disabled;
        }
        this.tb.items.each(function(item){
            if(item.getItemId() != 'sourceedit'){
                item.setDisabled(disabled);
            }
        });
    },

    // private
    onResize : function(w, h){
        Ext.form.HtmlEditor.superclass.onResize.apply(this, arguments);
        if(this.el && this.iframe){
            if(Ext.isNumber(w)){
                var aw = w - this.wrap.getFrameWidth('lr');
                this.el.setWidth(aw);
                this.tb.setWidth(aw);
                this.iframe.style.width = Math.max(aw, 0) + 'px';
            }
            if(Ext.isNumber(h)){
                var ah = h - this.wrap.getFrameWidth('tb') - this.tb.el.getHeight();
                this.el.setHeight(ah);
                this.iframe.style.height = Math.max(ah, 0) + 'px';
                var bd = this.getEditorBody();
                if(bd){
                    bd.style.height = Math.max((ah - (this.iframePad*2)), 0) + 'px';
                }
            }
        }
    },

    /**
     * Toggles the editor between standard and source edit mode.
     * @param {Boolean} sourceEdit (optional) True for source edit, false for standard
     */
    toggleSourceEdit : function(sourceEditMode){
        var iframeHeight,
            elHeight;

        if (sourceEditMode === undefined) {
            sourceEditMode = !this.sourceEditMode;
        }
        this.sourceEditMode = sourceEditMode === true;
        var btn = this.tb.getComponent('sourceedit');

        if (btn.pressed !== this.sourceEditMode) {
            btn.toggle(this.sourceEditMode);
            if (!btn.xtbHidden) {
                return;
            }
        }
        if (this.sourceEditMode) {
            // grab the height of the containing panel before we hide the iframe
            this.previousSize = this.getSize();

            iframeHeight = Ext.get(this.iframe).getHeight();

            this.disableItems(true);
            this.syncValue();
            this.iframe.className = 'x-hidden';
            this.el.removeClass('x-hidden');
            this.el.dom.removeAttribute('tabIndex');
            this.el.focus();
            this.el.dom.style.height = iframeHeight + 'px';
        }
        else {
            elHeight = parseInt(this.el.dom.style.height, 10);
            if (this.initialized) {
                this.disableItems(this.readOnly);
            }
            this.pushValue();
            this.iframe.className = '';
            this.el.addClass('x-hidden');
            this.el.dom.setAttribute('tabIndex', -1);
            this.deferFocus();

            this.setSize(this.previousSize);
            delete this.previousSize;
            this.iframe.style.height = elHeight + 'px';
        }
        this.fireEvent('editmodechange', this, this.sourceEditMode);
    },

    // private used internally
    createLink : function() {
        var url = prompt(this.createLinkText, this.defaultLinkValue);
        if(url && url != 'http:/'+'/'){
            this.relayCmd('createlink', url);
        }
    },

    // private
    initEvents : function(){
        this.originalValue = this.getValue();
    },

    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    markInvalid : Ext.emptyFn,

    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    clearInvalid : Ext.emptyFn,

    // docs inherit from Field
    setValue : function(v){
        Ext.form.HtmlEditor.superclass.setValue.call(this, v);
        this.pushValue();
        return this;
    },

    /**
     * Protected method that will not generally be called directly. If you need/want
     * custom HTML cleanup, this is the method you should override.
     * @param {String} html The HTML to be cleaned
     * @return {String} The cleaned HTML
     */
    cleanHtml: function(html) {
        html = String(html);
        if(Ext.isWebKit){ // strip safari nonsense
            html = html.replace(/\sclass="(?:Apple-style-span|khtml-block-placeholder)"/gi, '');
        }

        /*
         * Neat little hack. Strips out all the non-digit characters from the default
         * value and compares it to the character code of the first character in the string
         * because it can cause encoding issues when posted to the server.
         */
        if(html.charCodeAt(0) == this.defaultValue.replace(/\D/g, '')){
            html = html.substring(1);
        }
        return html;
    },

    /**
     * Protected method that will not generally be called directly. Syncs the contents
     * of the editor iframe with the textarea.
     */
    syncValue : function(){
        if(this.initialized){
            var bd = this.getEditorBody();
            var html = bd.innerHTML;
            if(Ext.isWebKit){
                var bs = bd.getAttribute('style'); // Safari puts text-align styles on the body element!
                var m = bs.match(/text-align:(.*?);/i);
                if(m && m[1]){
                    html = '<div style="'+m[0]+'">' + html + '</div>';
                }
            }
            html = this.cleanHtml(html);
            if(this.fireEvent('beforesync', this, html) !== false){
                this.el.dom.value = html;
                this.fireEvent('sync', this, html);
            }
        }
    },

    //docs inherit from Field
    getValue : function() {
        this[this.sourceEditMode ? 'pushValue' : 'syncValue']();
        return Ext.form.HtmlEditor.superclass.getValue.call(this);
    },

    /**
     * Protected method that will not generally be called directly. Pushes the value of the textarea
     * into the iframe editor.
     */
    pushValue : function(){
        if(this.initialized){
            var v = this.el.dom.value;
            if(!this.activated && v.length < 1){
                v = this.defaultValue;
            }
            if(this.fireEvent('beforepush', this, v) !== false){
                this.getEditorBody().innerHTML = v;
                if(Ext.isGecko){
                    // Gecko hack, see: https://bugzilla.mozilla.org/show_bug.cgi?id=232791#c8
                    this.setDesignMode(false);  //toggle off first
                    this.setDesignMode(true);
                }
                this.fireEvent('push', this, v);
            }

        }
    },

    // private
    deferFocus : function(){
        this.focus.defer(10, this);
    },

    // docs inherit from Field
    focus : function(){
        if(this.win && !this.sourceEditMode){
            this.win.focus();
        }else{
            this.el.focus();
        }
    },

    // private
    initEditor : function(){
        //Destroying the component during/before initEditor can cause issues.
        try{
            var dbody = this.getEditorBody(),
                ss = this.el.getStyles('font-size', 'font-family', 'background-image', 'background-repeat', 'background-color', 'color'),
                doc,
                fn;

            ss['background-attachment'] = 'fixed'; // w3c
            dbody.bgProperties = 'fixed'; // ie

            Ext.DomHelper.applyStyles(dbody, ss);

            doc = this.getDoc();

            if(doc){
                try{
                    Ext.EventManager.removeAll(doc);
                }catch(e){}
            }

            /*
             * We need to use createDelegate here, because when using buffer, the delayed task is added
             * as a property to the function. When the listener is removed, the task is deleted from the function.
             * Since onEditorEvent is shared on the prototype, if we have multiple html editors, the first time one of the editors
             * is destroyed, it causes the fn to be deleted from the prototype, which causes errors. Essentially, we're just anonymizing the function.
             */
            fn = this.onEditorEvent.createDelegate(this);
            Ext.EventManager.on(doc, {
                mousedown: fn,
                dblclick: fn,
                click: fn,
                keyup: fn,
                buffer:100
            });

            if(Ext.isGecko){
                Ext.EventManager.on(doc, 'keypress', this.applyCommand, this);
            }
            if(Ext.isIE || Ext.isWebKit || Ext.isOpera){
                Ext.EventManager.on(doc, 'keydown', this.fixKeys, this);
            }
            doc.editorInitialized = true;
            this.initialized = true;
            this.pushValue();
            this.setReadOnly(this.readOnly);
            this.fireEvent('initialize', this);
        }catch(e){}
    },

    // private
    beforeDestroy : function(){
        if(this.monitorTask){
            Ext.TaskMgr.stop(this.monitorTask);
        }
        if(this.rendered){
            Ext.destroy(this.tb);
            var doc = this.getDoc();
            if(doc){
                try{
                    Ext.EventManager.removeAll(doc);
                    for (var prop in doc){
                        delete doc[prop];
                    }
                }catch(e){}
            }
            if(this.wrap){
                this.wrap.dom.innerHTML = '';
                this.wrap.remove();
            }
        }
        Ext.form.HtmlEditor.superclass.beforeDestroy.call(this);
    },

    // private
    onFirstFocus : function(){
        this.activated = true;
        this.disableItems(this.readOnly);
        if(Ext.isGecko){ // prevent silly gecko errors
            this.win.focus();
            var s = this.win.getSelection();
            if(!s.focusNode || s.focusNode.nodeType != 3){
                var r = s.getRangeAt(0);
                r.selectNodeContents(this.getEditorBody());
                r.collapse(true);
                this.deferFocus();
            }
            try{
                this.execCmd('useCSS', true);
                this.execCmd('styleWithCSS', false);
            }catch(e){}
        }
        this.fireEvent('activate', this);
    },

    // private
    adjustFont: function(btn){
        var adjust = btn.getItemId() == 'increasefontsize' ? 1 : -1,
            doc = this.getDoc(),
            v = parseInt(doc.queryCommandValue('FontSize') || 2, 10);
        if((Ext.isSafari && !Ext.isSafari2) || Ext.isChrome || Ext.isAir){
            // Safari 3 values
            // 1 = 10px, 2 = 13px, 3 = 16px, 4 = 18px, 5 = 24px, 6 = 32px
            if(v <= 10){
                v = 1 + adjust;
            }else if(v <= 13){
                v = 2 + adjust;
            }else if(v <= 16){
                v = 3 + adjust;
            }else if(v <= 18){
                v = 4 + adjust;
            }else if(v <= 24){
                v = 5 + adjust;
            }else {
                v = 6 + adjust;
            }
            v = v.constrain(1, 6);
        }else{
            if(Ext.isSafari){ // safari
                adjust *= 2;
            }
            v = Math.max(1, v+adjust) + (Ext.isSafari ? 'px' : 0);
        }
        this.execCmd('FontSize', v);
    },

    // private
    onEditorEvent : function(e){
        this.updateToolbar();
    },


    /**
     * Protected method that will not generally be called directly. It triggers
     * a toolbar update by reading the markup state of the current selection in the editor.
     */
    updateToolbar: function(){

        if(this.readOnly){
            return;
        }

        if(!this.activated){
            this.onFirstFocus();
            return;
        }

        var btns = this.tb.items.map,
            doc = this.getDoc();

        if(this.enableFont && !Ext.isSafari2){
            var name = (doc.queryCommandValue('FontName')||this.defaultFont).toLowerCase();
            if(name != this.fontSelect.dom.value){
                this.fontSelect.dom.value = name;
            }
        }
        if(this.enableFormat){
            btns.bold.toggle(doc.queryCommandState('bold'));
            btns.italic.toggle(doc.queryCommandState('italic'));
            btns.underline.toggle(doc.queryCommandState('underline'));
        }
        if(this.enableAlignments){
            btns.justifyleft.toggle(doc.queryCommandState('justifyleft'));
            btns.justifycenter.toggle(doc.queryCommandState('justifycenter'));
            btns.justifyright.toggle(doc.queryCommandState('justifyright'));
        }
        if(!Ext.isSafari2 && this.enableLists){
            btns.insertorderedlist.toggle(doc.queryCommandState('insertorderedlist'));
            btns.insertunorderedlist.toggle(doc.queryCommandState('insertunorderedlist'));
        }

        Ext.menu.MenuMgr.hideAll();

        this.syncValue();
    },

    // private
    relayBtnCmd : function(btn){
        this.relayCmd(btn.getItemId());
    },

    /**
     * Executes a Midas editor command on the editor document and performs necessary focus and
     * toolbar updates. <b>This should only be called after the editor is initialized.</b>
     * @param {String} cmd The Midas command
     * @param {String/Boolean} value (optional) The value to pass to the command (defaults to null)
     */
    relayCmd : function(cmd, value){
        (function(){
            this.focus();
            this.execCmd(cmd, value);
            this.updateToolbar();
        }).defer(10, this);
    },

    /**
     * Executes a Midas editor command directly on the editor document.
     * For visual commands, you should use {@link #relayCmd} instead.
     * <b>This should only be called after the editor is initialized.</b>
     * @param {String} cmd The Midas command
     * @param {String/Boolean} value (optional) The value to pass to the command (defaults to null)
     */
    execCmd : function(cmd, value){
        var doc = this.getDoc();
        doc.execCommand(cmd, false, value === undefined ? null : value);
        this.syncValue();
    },

    // private
    applyCommand : function(e){
        if(e.ctrlKey){
            var c = e.getCharCode(), cmd;
            if(c > 0){
                c = String.fromCharCode(c);
                switch(c){
                    case 'b':
                        cmd = 'bold';
                    break;
                    case 'i':
                        cmd = 'italic';
                    break;
                    case 'u':
                        cmd = 'underline';
                    break;
                }
                if(cmd){
                    this.win.focus();
                    this.execCmd(cmd);
                    this.deferFocus();
                    e.preventDefault();
                }
            }
        }
    },

    /**
     * Inserts the passed text at the current cursor position. Note: the editor must be initialized and activated
     * to insert text.
     * @param {String} text
     */
    insertAtCursor : function(text){
        if(!this.activated){
            return;
        }
        if(Ext.isIE){
            this.win.focus();
            var doc = this.getDoc(),
                r = doc.selection.createRange();
            if(r){
                r.pasteHTML(text);
                this.syncValue();
                this.deferFocus();
            }
        }else{
            this.win.focus();
            this.execCmd('InsertHTML', text);
            this.deferFocus();
        }
    },

    // private
    fixKeys : function(){ // load time branching for fastest keydown performance
        if(Ext.isIE){
            return function(e){
                var k = e.getKey(),
                    doc = this.getDoc(),
                        r;
                if(k == e.TAB){
                    e.stopEvent();
                    r = doc.selection.createRange();
                    if(r){
                        r.collapse(true);
                        r.pasteHTML('&nbsp;&nbsp;&nbsp;&nbsp;');
                        this.deferFocus();
                    }
                }else if(k == e.ENTER){
                    r = doc.selection.createRange();
                    if(r){
                        var target = r.parentElement();
                        if(!target || target.tagName.toLowerCase() != 'li'){
                            e.stopEvent();
                            r.pasteHTML('<br />');
                            r.collapse(false);
                            r.select();
                        }
                    }
                }
            };
        }else if(Ext.isOpera){
            return function(e){
                var k = e.getKey();
                if(k == e.TAB){
                    e.stopEvent();
                    this.win.focus();
                    this.execCmd('InsertHTML','&nbsp;&nbsp;&nbsp;&nbsp;');
                    this.deferFocus();
                }
            };
        }else if(Ext.isWebKit){
            return function(e){
                var k = e.getKey();
                if(k == e.TAB){
                    e.stopEvent();
                    this.execCmd('InsertText','\t');
                    this.deferFocus();
                }else if(k == e.ENTER){
                    e.stopEvent();
                    this.execCmd('InsertHtml','<br /><br />');
                    this.deferFocus();
                }
             };
        }
    }(),

    /**
     * Returns the editor's toolbar. <b>This is only available after the editor has been rendered.</b>
     * @return {Ext.Toolbar}
     */
    getToolbar : function(){
        return this.tb;
    },

    /**
     * Object collection of toolbar tooltips for the buttons in the editor. The key
     * is the command id associated with that button and the value is a valid QuickTips object.
     * For example:
<pre><code>
{
    bold : {
        title: 'Bold (Ctrl+B)',
        text: 'Make the selected text bold.',
        cls: 'x-html-editor-tip'
    },
    italic : {
        title: 'Italic (Ctrl+I)',
        text: 'Make the selected text italic.',
        cls: 'x-html-editor-tip'
    },
    ...
</code></pre>
    * @type Object
     */
    buttonTips : {
        bold : {
            title: 'Bold (Ctrl+B)',
            text: 'Make the selected text bold.',
            cls: 'x-html-editor-tip'
        },
        italic : {
            title: 'Italic (Ctrl+I)',
            text: 'Make the selected text italic.',
            cls: 'x-html-editor-tip'
        },
        underline : {
            title: 'Underline (Ctrl+U)',
            text: 'Underline the selected text.',
            cls: 'x-html-editor-tip'
        },
        increasefontsize : {
            title: 'Grow Text',
            text: 'Increase the font size.',
            cls: 'x-html-editor-tip'
        },
        decreasefontsize : {
            title: 'Shrink Text',
            text: 'Decrease the font size.',
            cls: 'x-html-editor-tip'
        },
        backcolor : {
            title: 'Text Highlight Color',
            text: 'Change the background color of the selected text.',
            cls: 'x-html-editor-tip'
        },
        forecolor : {
            title: 'Font Color',
            text: 'Change the color of the selected text.',
            cls: 'x-html-editor-tip'
        },
        justifyleft : {
            title: 'Align Text Left',
            text: 'Align text to the left.',
            cls: 'x-html-editor-tip'
        },
        justifycenter : {
            title: 'Center Text',
            text: 'Center text in the editor.',
            cls: 'x-html-editor-tip'
        },
        justifyright : {
            title: 'Align Text Right',
            text: 'Align text to the right.',
            cls: 'x-html-editor-tip'
        },
        insertunorderedlist : {
            title: 'Bullet List',
            text: 'Start a bulleted list.',
            cls: 'x-html-editor-tip'
        },
        insertorderedlist : {
            title: 'Numbered List',
            text: 'Start a numbered list.',
            cls: 'x-html-editor-tip'
        },
        createlink : {
            title: 'Hyperlink',
            text: 'Make the selected text a hyperlink.',
            cls: 'x-html-editor-tip'
        },
        sourceedit : {
            title: 'Source Edit',
            text: 'Switch to source editing mode.',
            cls: 'x-html-editor-tip'
        }
    }

    // hide stuff that is not compatible
    /**
     * @event blur
     * @hide
     */
    /**
     * @event change
     * @hide
     */
    /**
     * @event focus
     * @hide
     */
    /**
     * @event specialkey
     * @hide
     */
    /**
     * @cfg {String} fieldClass @hide
     */
    /**
     * @cfg {String} focusClass @hide
     */
    /**
     * @cfg {String} autoCreate @hide
     */
    /**
     * @cfg {String} inputType @hide
     */
    /**
     * @cfg {String} invalidClass @hide
     */
    /**
     * @cfg {String} invalidText @hide
     */
    /**
     * @cfg {String} msgFx @hide
     */
    /**
     * @cfg {String} validateOnBlur @hide
     */
    /**
     * @cfg {Boolean} allowDomMove  @hide
     */
    /**
     * @cfg {String} applyTo @hide
     */
    /**
     * @cfg {String} autoHeight  @hide
     */
    /**
     * @cfg {String} autoWidth  @hide
     */
    /**
     * @cfg {String} cls  @hide
     */
    /**
     * @cfg {String} disabled  @hide
     */
    /**
     * @cfg {String} disabledClass  @hide
     */
    /**
     * @cfg {String} msgTarget  @hide
     */
    /**
     * @cfg {String} readOnly  @hide
     */
    /**
     * @cfg {String} style  @hide
     */
    /**
     * @cfg {String} validationDelay  @hide
     */
    /**
     * @cfg {String} validationEvent  @hide
     */
    /**
     * @cfg {String} tabIndex  @hide
     */
    /**
     * @property disabled
     * @hide
     */
    /**
     * @method applyToMarkup
     * @hide
     */
    /**
     * @method disable
     * @hide
     */
    /**
     * @method enable
     * @hide
     */
    /**
     * @method validate
     * @hide
     */
    /**
     * @event valid
     * @hide
     */
    /**
     * @method setDisabled
     * @hide
     */
    /**
     * @cfg keys
     * @hide
     */
});
Ext.reg('htmleditor', Ext.form.HtmlEditor);
