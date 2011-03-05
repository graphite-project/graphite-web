/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Panel
 * @extends Ext.Container
 * <p>Panel is a container that has specific functionality and structural components that make
 * it the perfect building block for application-oriented user interfaces.</p>
 * <p>Panels are, by virtue of their inheritance from {@link Ext.Container}, capable
 * of being configured with a {@link Ext.Container#layout layout}, and containing child Components.</p>
 * <p>When either specifying child {@link Ext.Component#items items} of a Panel, or dynamically {@link Ext.Container#add adding} Components
 * to a Panel, remember to consider how you wish the Panel to arrange those child elements, and whether
 * those child elements need to be sized using one of Ext's built-in <code><b>{@link Ext.Container#layout layout}</b></code> schemes. By
 * default, Panels use the {@link Ext.layout.ContainerLayout ContainerLayout} scheme. This simply renders
 * child components, appending them one after the other inside the Container, and <b>does not apply any sizing</b>
 * at all.</p>
 * <p>A Panel may also contain {@link #bbar bottom} and {@link #tbar top} toolbars, along with separate
 * {@link #header}, {@link #footer} and {@link #body} sections (see {@link #frame} for additional
 * information).</p>
 * <p>Panel also provides built-in {@link #collapsible expandable and collapsible behavior}, along with
 * a variety of {@link #tools prebuilt tool buttons} that can be wired up to provide other customized
 * behavior.  Panels can be easily dropped into any {@link Ext.Container Container} or layout, and the
 * layout and rendering pipeline is {@link Ext.Container#add completely managed by the framework}.</p>
 * @constructor
 * @param {Object} config The config object
 * @xtype panel
 */
Ext.Panel = Ext.extend(Ext.Container, {
    /**
     * The Panel's header {@link Ext.Element Element}. Read-only.
     * <p>This Element is used to house the {@link #title} and {@link #tools}</p>
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property header
     */
    /**
     * The Panel's body {@link Ext.Element Element} which may be used to contain HTML content.
     * The content may be specified in the {@link #html} config, or it may be loaded using the
     * {@link autoLoad} config, or through the Panel's {@link #getUpdater Updater}. Read-only.
     * <p>If this is used to load visible HTML elements in either way, then
     * the Panel may not be used as a Layout for hosting nested Panels.</p>
     * <p>If this Panel is intended to be used as the host of a Layout (See {@link #layout}
     * then the body Element must not be loaded or changed - it is under the control
     * of the Panel's Layout.
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property body
     */
    /**
     * The Panel's bwrap {@link Ext.Element Element} used to contain other Panel elements
     * (tbar, body, bbar, footer). See {@link #bodyCfg}. Read-only.
     * @type Ext.Element
     * @property bwrap
     */
    /**
     * True if this panel is collapsed. Read-only.
     * @type Boolean
     * @property collapsed
     */
    /**
     * @cfg {Object} bodyCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object may be specified for any
     * Panel Element.</p>
     * <p>By default, the Default element in the table below will be used for the html markup to
     * create a child element with the commensurate Default class name (<code>baseCls</code> will be
     * replaced by <code>{@link #baseCls}</code>):</p>
     * <pre>
     * Panel      Default  Default             Custom      Additional       Additional
     * Element    element  class               element     class            style
     * ========   ==========================   =========   ==============   ===========
     * {@link #header}     div      {@link #baseCls}+'-header'   {@link #headerCfg}   headerCssClass   headerStyle
     * {@link #bwrap}      div      {@link #baseCls}+'-bwrap'     {@link #bwrapCfg}    bwrapCssClass    bwrapStyle
     * + tbar     div      {@link #baseCls}+'-tbar'       {@link #tbarCfg}     tbarCssClass     tbarStyle
     * + {@link #body}     div      {@link #baseCls}+'-body'       {@link #bodyCfg}     {@link #bodyCssClass}     {@link #bodyStyle}
     * + bbar     div      {@link #baseCls}+'-bbar'       {@link #bbarCfg}     bbarCssClass     bbarStyle
     * + {@link #footer}   div      {@link #baseCls}+'-footer'   {@link #footerCfg}   footerCssClass   footerStyle
     * </pre>
     * <p>Configuring a Custom element may be used, for example, to force the {@link #body} Element
     * to use a different form of markup than is created by default. An example of this might be
     * to {@link Ext.Element#createChild create a child} Panel containing a custom content, such as
     * a header, or forcing centering of all Panel content by having the body be a &lt;center&gt;
     * element:</p>
     * <pre><code>
new Ext.Panel({
    title: 'Message Title',
    renderTo: Ext.getBody(),
    width: 200, height: 130,
    <b>bodyCfg</b>: {
        tag: 'center',
        cls: 'x-panel-body',  // Default class not applied if Custom element specified
        html: 'Message'
    },
    footerCfg: {
        tag: 'h2',
        cls: 'x-panel-footer',        // same as the Default class
        html: 'footer html'
    },
    footerCssClass: 'custom-footer', // additional css class, see {@link Ext.element#addClass addClass}
    footerStyle:    'background-color:red' // see {@link #bodyStyle}
});
     * </code></pre>
     * <p>The example above also explicitly creates a <code>{@link #footer}</code> with custom markup and
     * styling applied.</p>
     */
    /**
     * @cfg {Object} headerCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #header} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} bwrapCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #bwrap} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} tbarCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #tbar} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} bbarCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #bbar} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} footerCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #footer} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Boolean} closable
     * Panels themselves do not directly support being closed, but some Panel subclasses do (like
     * {@link Ext.Window}) or a Panel Class within an {@link Ext.TabPanel}.  Specify <code>true</code>
     * to enable closing in such situations. Defaults to <code>false</code>.
     */
    /**
     * The Panel's footer {@link Ext.Element Element}. Read-only.
     * <p>This Element is used to house the Panel's <code>{@link #buttons}</code> or <code>{@link #fbar}</code>.</p>
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property footer
     */
    /**
     * @cfg {Mixed} applyTo
     * <p>The id of the node, a DOM node or an existing Element corresponding to a DIV that is already present in
     * the document that specifies some panel-specific structural markup.  When <code>applyTo</code> is used,
     * constituent parts of the panel can be specified by CSS class name within the main element, and the panel
     * will automatically create those components from that markup. Any required components not specified in the
     * markup will be autogenerated if necessary.</p>
     * <p>The following class names are supported (baseCls will be replaced by {@link #baseCls}):</p>
     * <ul><li>baseCls + '-header'</li>
     * <li>baseCls + '-header-text'</li>
     * <li>baseCls + '-bwrap'</li>
     * <li>baseCls + '-tbar'</li>
     * <li>baseCls + '-body'</li>
     * <li>baseCls + '-bbar'</li>
     * <li>baseCls + '-footer'</li></ul>
     * <p>Using this config, a call to render() is not required.  If applyTo is specified, any value passed for
     * {@link #renderTo} will be ignored and the target element's parent node will automatically be used as the
     * panel's container.</p>
     */
    /**
     * @cfg {Object/Array} tbar
     * <p>The top toolbar of the panel. This can be a {@link Ext.Toolbar} object, a toolbar config, or an array of
     * buttons/button configs to be added to the toolbar.  Note that this is not available as a property after render.
     * To access the top toolbar after render, use {@link #getTopToolbar}.</p>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /**
     * @cfg {Object/Array} bbar
     * <p>The bottom toolbar of the panel. This can be a {@link Ext.Toolbar} object, a toolbar config, or an array of
     * buttons/button configs to be added to the toolbar.  Note that this is not available as a property after render.
     * To access the bottom toolbar after render, use {@link #getBottomToolbar}.</p>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /** @cfg {Object/Array} fbar
     * <p>A {@link Ext.Toolbar Toolbar} object, a Toolbar config, or an array of
     * {@link Ext.Button Button}s/{@link Ext.Button Button} configs, describing a {@link Ext.Toolbar Toolbar} to be rendered into this Panel's footer element.</p>
     * <p>After render, the <code>fbar</code> property will be an {@link Ext.Toolbar Toolbar} instance.</p>
     * <p>If <code>{@link #buttons}</code> are specified, they will supersede the <code>fbar</code> configuration property.</p>
     * The Panel's <code>{@link #buttonAlign}</code> configuration affects the layout of these items, for example:
     * <pre><code>
var w = new Ext.Window({
    height: 250,
    width: 500,
    bbar: new Ext.Toolbar({
        items: [{
            text: 'bbar Left'
        },'->',{
            text: 'bbar Right'
        }]
    }),
    {@link #buttonAlign}: 'left', // anything but 'center' or 'right' and you can use '-', and '->'
                                  // to control the alignment of fbar items
    fbar: [{
        text: 'fbar Left'
    },'->',{
        text: 'fbar Right'
    }]
}).show();
     * </code></pre>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /**
     * @cfg {Boolean} header
     * <code>true</code> to create the Panel's header element explicitly, <code>false</code> to skip creating
     * it.  If a <code>{@link #title}</code> is set the header will be created automatically, otherwise it will not.
     * If a <code>{@link #title}</code> is set but <code>header</code> is explicitly set to <code>false</code>, the header
     * will not be rendered.
     */
    /**
     * @cfg {Boolean} footer
     * <code>true</code> to create the footer element explicitly, false to skip creating it. The footer
     * will be created automatically if <code>{@link #buttons}</code> or a <code>{@link #fbar}</code> have
     * been configured.  See <code>{@link #bodyCfg}</code> for an example.
     */
    /**
     * @cfg {String} title
     * The title text to be used as innerHTML (html tags are accepted) to display in the panel
     * <code>{@link #header}</code> (defaults to ''). When a <code>title</code> is specified the
     * <code>{@link #header}</code> element will automatically be created and displayed unless
     * {@link #header} is explicitly set to <code>false</code>.  If you do not want to specify a
     * <code>title</code> at config time, but you may want one later, you must either specify a non-empty
     * <code>title</code> (a blank space ' ' will do) or <code>header:true</code> so that the container
     * element will get created.
     */
    /**
     * @cfg {Array} buttons
     * <code>buttons</code> will be used as <code>{@link Ext.Container#items items}</code> for the toolbar in
     * the footer (<code>{@link #fbar}</code>). Typically the value of this configuration property will be
     * an array of {@link Ext.Button}s or {@link Ext.Button} configuration objects.
     * If an item is configured with <code>minWidth</code> or the Panel is configured with <code>minButtonWidth</code>,
     * that width will be applied to the item.
     */
    /**
     * @cfg {Object/String/Function} autoLoad
     * A valid url spec according to the Updater {@link Ext.Updater#update} method.
     * If autoLoad is not null, the panel will attempt to load its contents
     * immediately upon render.<p>
     * The URL will become the default URL for this panel's {@link #body} element,
     * so it may be {@link Ext.Element#refresh refresh}ed at any time.</p>
     */
    /**
     * @cfg {Boolean} frame
     * <code>false</code> by default to render with plain 1px square borders. <code>true</code> to render with
     * 9 elements, complete with custom rounded corners (also see {@link Ext.Element#boxWrap}).
     * <p>The template generated for each condition is depicted below:</p><pre><code>
     *
// frame = false
&lt;div id="developer-specified-id-goes-here" class="x-panel">

    &lt;div class="x-panel-header">&lt;span class="x-panel-header-text">Title: (frame:false)&lt;/span>&lt;/div>

    &lt;div class="x-panel-bwrap">
        &lt;div class="x-panel-body">&lt;p>html value goes here&lt;/p>&lt;/div>
    &lt;/div>
&lt;/div>

// frame = true (create 9 elements)
&lt;div id="developer-specified-id-goes-here" class="x-panel">
    &lt;div class="x-panel-tl">&lt;div class="x-panel-tr">&lt;div class="x-panel-tc">
        &lt;div class="x-panel-header">&lt;span class="x-panel-header-text">Title: (frame:true)&lt;/span>&lt;/div>
    &lt;/div>&lt;/div>&lt;/div>

    &lt;div class="x-panel-bwrap">
        &lt;div class="x-panel-ml">&lt;div class="x-panel-mr">&lt;div class="x-panel-mc">
            &lt;div class="x-panel-body">&lt;p>html value goes here&lt;/p>&lt;/div>
        &lt;/div>&lt;/div>&lt;/div>

        &lt;div class="x-panel-bl">&lt;div class="x-panel-br">&lt;div class="x-panel-bc"/>
        &lt;/div>&lt;/div>&lt;/div>
&lt;/div>
     * </code></pre>
     */
    /**
     * @cfg {Boolean} border
     * True to display the borders of the panel's body element, false to hide them (defaults to true).  By default,
     * the border is a 2px wide inset border, but this can be further altered by setting {@link #bodyBorder} to false.
     */
    /**
     * @cfg {Boolean} bodyBorder
     * True to display an interior border on the body element of the panel, false to hide it (defaults to true).
     * This only applies when {@link #border} == true.  If border == true and bodyBorder == false, the border will display
     * as a 1px wide inset border, giving the entire body element an inset appearance.
     */
    /**
     * @cfg {String/Object/Function} bodyCssClass
     * Additional css class selector to be applied to the {@link #body} element in the format expected by
     * {@link Ext.Element#addClass} (defaults to null). See {@link #bodyCfg}.
     */
    /**
     * @cfg {String/Object/Function} bodyStyle
     * Custom CSS styles to be applied to the {@link #body} element in the format expected by
     * {@link Ext.Element#applyStyles} (defaults to null). See {@link #bodyCfg}.
     */
    /**
     * @cfg {String} iconCls
     * The CSS class selector that specifies a background image to be used as the header icon (defaults to '').
     * <p>An example of specifying a custom icon class would be something like:
     * </p><pre><code>
// specify the property in the config for the class:
     ...
     iconCls: 'my-icon'

// css class that specifies background image to be used as the icon image:
.my-icon { background-image: url(../images/my-icon.gif) 0 6px no-repeat !important; }
</code></pre>
     */
    /**
     * @cfg {Boolean} collapsible
     * True to make the panel collapsible and have the expand/collapse toggle button automatically rendered into
     * the header tool button area, false to keep the panel statically sized with no button (defaults to false).
     */
    /**
     * @cfg {Array} tools
     * An array of tool button configs to be added to the header tool area. When rendered, each tool is
     * stored as an {@link Ext.Element Element} referenced by a public property called <code><b></b>tools.<i>&lt;tool-type&gt;</i></code>
     * <p>Each tool config may contain the following properties:
     * <div class="mdetail-params"><ul>
     * <li><b>id</b> : String<div class="sub-desc"><b>Required.</b> The type
     * of tool to create. By default, this assigns a CSS class of the form <code>x-tool-<i>&lt;tool-type&gt;</i></code> to the
     * resulting tool Element. Ext provides CSS rules, and an icon sprite containing images for the tool types listed below.
     * The developer may implement custom tools by supplying alternate CSS rules and background images:
     * <ul>
     * <div class="x-tool x-tool-toggle" style="float:left; margin-right:5;"> </div><div><code> toggle</code> (Created by default when {@link #collapsible} is <code>true</code>)</div>
     * <div class="x-tool x-tool-close" style="float:left; margin-right:5;"> </div><div><code> close</code></div>
     * <div class="x-tool x-tool-minimize" style="float:left; margin-right:5;"> </div><div><code> minimize</code></div>
     * <div class="x-tool x-tool-maximize" style="float:left; margin-right:5;"> </div><div><code> maximize</code></div>
     * <div class="x-tool x-tool-restore" style="float:left; margin-right:5;"> </div><div><code> restore</code></div>
     * <div class="x-tool x-tool-gear" style="float:left; margin-right:5;"> </div><div><code> gear</code></div>
     * <div class="x-tool x-tool-pin" style="float:left; margin-right:5;"> </div><div><code> pin</code></div>
     * <div class="x-tool x-tool-unpin" style="float:left; margin-right:5;"> </div><div><code> unpin</code></div>
     * <div class="x-tool x-tool-right" style="float:left; margin-right:5;"> </div><div><code> right</code></div>
     * <div class="x-tool x-tool-left" style="float:left; margin-right:5;"> </div><div><code> left</code></div>
     * <div class="x-tool x-tool-up" style="float:left; margin-right:5;"> </div><div><code> up</code></div>
     * <div class="x-tool x-tool-down" style="float:left; margin-right:5;"> </div><div><code> down</code></div>
     * <div class="x-tool x-tool-refresh" style="float:left; margin-right:5;"> </div><div><code> refresh</code></div>
     * <div class="x-tool x-tool-minus" style="float:left; margin-right:5;"> </div><div><code> minus</code></div>
     * <div class="x-tool x-tool-plus" style="float:left; margin-right:5;"> </div><div><code> plus</code></div>
     * <div class="x-tool x-tool-help" style="float:left; margin-right:5;"> </div><div><code> help</code></div>
     * <div class="x-tool x-tool-search" style="float:left; margin-right:5;"> </div><div><code> search</code></div>
     * <div class="x-tool x-tool-save" style="float:left; margin-right:5;"> </div><div><code> save</code></div>
     * <div class="x-tool x-tool-print" style="float:left; margin-right:5;"> </div><div><code> print</code></div>
     * </ul></div></li>
     * <li><b>handler</b> : Function<div class="sub-desc"><b>Required.</b> The function to
     * call when clicked. Arguments passed are:<ul>
     * <li><b>event</b> : Ext.EventObject<div class="sub-desc">The click event.</div></li>
     * <li><b>toolEl</b> : Ext.Element<div class="sub-desc">The tool Element.</div></li>
     * <li><b>panel</b> : Ext.Panel<div class="sub-desc">The host Panel</div></li>
     * <li><b>tc</b> : Object<div class="sub-desc">The tool configuration object</div></li>
     * </ul></div></li>
     * <li><b>stopEvent</b> : Boolean<div class="sub-desc">Defaults to true. Specify as false to allow click event to propagate.</div></li>
     * <li><b>scope</b> : Object<div class="sub-desc">The scope in which to call the handler.</div></li>
     * <li><b>qtip</b> : String/Object<div class="sub-desc">A tip string, or
     * a config argument to {@link Ext.QuickTip#register}</div></li>
     * <li><b>hidden</b> : Boolean<div class="sub-desc">True to initially render hidden.</div></li>
     * <li><b>on</b> : Object<div class="sub-desc">A listener config object specifiying
     * event listeners in the format of an argument to {@link #addListener}</div></li>
     * </ul></div>
     * <p>Note that, apart from the toggle tool which is provided when a panel is collapsible, these
     * tools only provide the visual button. Any required functionality must be provided by adding
     * handlers that implement the necessary behavior.</p>
     * <p>Example usage:</p>
     * <pre><code>
tools:[{
    id:'refresh',
    qtip: 'Refresh form Data',
    // hidden:true,
    handler: function(event, toolEl, panel){
        // refresh logic
    }
},
{
    id:'help',
    qtip: 'Get Help',
    handler: function(event, toolEl, panel){
        // whatever
    }
}]
</code></pre>
     * <p>For the custom id of <code>'help'</code> define two relevant css classes with a link to
     * a 15x15 image:</p>
     * <pre><code>
.x-tool-help {background-image: url(images/help.png);}
.x-tool-help-over {background-image: url(images/help_over.png);}
// if using an image sprite:
.x-tool-help {background-image: url(images/help.png) no-repeat 0 0;}
.x-tool-help-over {background-position:-15px 0;}
</code></pre>
     */
    /**
     * @cfg {Ext.Template/Ext.XTemplate} toolTemplate
     * <p>A Template used to create {@link #tools} in the {@link #header} Element. Defaults to:</p><pre><code>
new Ext.Template('&lt;div class="x-tool x-tool-{id}">&amp;#160;&lt;/div>')</code></pre>
     * <p>This may may be overridden to provide a custom DOM structure for tools based upon a more
     * complex XTemplate. The template's data is a single tool configuration object (Not the entire Array)
     * as specified in {@link #tools}.  In the following example an &lt;a> tag is used to provide a
     * visual indication when hovering over the tool:</p><pre><code>
var win = new Ext.Window({
    tools: [{
        id: 'download',
        href: '/MyPdfDoc.pdf'
    }],
    toolTemplate: new Ext.XTemplate(
        '&lt;tpl if="id==\'download\'">',
            '&lt;a class="x-tool x-tool-pdf" href="{href}">&lt;/a>',
        '&lt;/tpl>',
        '&lt;tpl if="id!=\'download\'">',
            '&lt;div class="x-tool x-tool-{id}">&amp;#160;&lt;/div>',
        '&lt;/tpl>'
    ),
    width:500,
    height:300,
    closeAction:'hide'
});</code></pre>
     * <p>Note that the CSS class 'x-tool-pdf' should have an associated style rule which provides an
     * appropriate background image, something like:</p>
    <pre><code>
    a.x-tool-pdf {background-image: url(../shared/extjs/images/pdf.gif)!important;}
    </code></pre>
     */
    /**
     * @cfg {Boolean} hideCollapseTool
     * <code>true</code> to hide the expand/collapse toggle button when <code>{@link #collapsible} == true</code>,
     * <code>false</code> to display it (defaults to <code>false</code>).
     */
    /**
     * @cfg {Boolean} titleCollapse
     * <code>true</code> to allow expanding and collapsing the panel (when <code>{@link #collapsible} = true</code>)
     * by clicking anywhere in the header bar, <code>false</code>) to allow it only by clicking to tool button
     * (defaults to <code>false</code>)). If this panel is a child item of a border layout also see the
     * {@link Ext.layout.BorderLayout.Region BorderLayout.Region}
     * <code>{@link Ext.layout.BorderLayout.Region#floatable floatable}</code> config option.
     */

    /**
     * @cfg {Mixed} floating
     * <p>This property is used to configure the underlying {@link Ext.Layer}. Acceptable values for this
     * configuration property are:</p><div class="mdetail-params"><ul>
     * <li><b><code>false</code></b> : <b>Default.</b><div class="sub-desc">Display the panel inline where it is
     * rendered.</div></li>
     * <li><b><code>true</code></b> : <div class="sub-desc">Float the panel (absolute position it with automatic
     * shimming and shadow).<ul>
     * <div class="sub-desc">Setting floating to true will create an Ext.Layer for this panel and display the
     * panel at negative offsets so that it is hidden.</div>
     * <div class="sub-desc">Since the panel will be absolute positioned, the position must be set explicitly
     * <i>after</i> render (e.g., <code>myPanel.setPosition(100,100);</code>).</div>
     * <div class="sub-desc"><b>Note</b>: when floating a panel you should always assign a fixed width,
     * otherwise it will be auto width and will expand to fill to the right edge of the viewport.</div>
     * </ul></div></li>
     * <li><b><code>{@link Ext.Layer object}</code></b> : <div class="sub-desc">The specified object will be used
     * as the configuration object for the {@link Ext.Layer} that will be created.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Boolean/String} shadow
     * <code>true</code> (or a valid Ext.Shadow {@link Ext.Shadow#mode} value) to display a shadow behind the
     * panel, <code>false</code> to display no shadow (defaults to <code>'sides'</code>).  Note that this option
     * only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Number} shadowOffset
     * The number of pixels to offset the shadow if displayed (defaults to <code>4</code>). Note that this
     * option only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Boolean} shim
     * <code>false</code> to disable the iframe shim in browsers which need one (defaults to <code>true</code>).
     * Note that this option only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Object/Array} keys
     * A {@link Ext.KeyMap} config object (in the format expected by {@link Ext.KeyMap#addBinding}
     * used to assign custom key handling to this panel (defaults to <code>null</code>).
     */
    /**
     * @cfg {Boolean/Object} draggable
     * <p><code>true</code> to enable dragging of this Panel (defaults to <code>false</code>).</p>
     * <p>For custom drag/drop implementations, an <b>Ext.Panel.DD</b> config could also be passed
     * in this config instead of <code>true</code>. Ext.Panel.DD is an internal, undocumented class which
     * moves a proxy Element around in place of the Panel's element, but provides no other behaviour
     * during dragging or on drop. It is a subclass of {@link Ext.dd.DragSource}, so behaviour may be
     * added by implementing the interface methods of {@link Ext.dd.DragDrop} e.g.:
     * <pre><code>
new Ext.Panel({
    title: 'Drag me',
    x: 100,
    y: 100,
    renderTo: Ext.getBody(),
    floating: true,
    frame: true,
    width: 400,
    height: 200,
    draggable: {
//      Config option of Ext.Panel.DD class.
//      It&#39;s a floating Panel, so do not show a placeholder proxy in the original position.
        insertProxy: false,

//      Called for each mousemove event while dragging the DD object.
        onDrag : function(e){
//          Record the x,y position of the drag proxy so that we can
//          position the Panel at end of drag.
            var pel = this.proxy.getEl();
            this.x = pel.getLeft(true);
            this.y = pel.getTop(true);

//          Keep the Shadow aligned if there is one.
            var s = this.panel.getEl().shadow;
            if (s) {
                s.realign(this.x, this.y, pel.getWidth(), pel.getHeight());
            }
        },

//      Called on the mouseup event.
        endDrag : function(e){
            this.panel.setPosition(this.x, this.y);
        }
    }
}).show();
</code></pre>
     */
    /**
     * @cfg {Boolean} disabled
     * Render this panel disabled (default is <code>false</code>). An important note when using the disabled
     * config on panels is that IE will often fail to initialize the disabled mask element correectly if
     * the panel's layout has not yet completed by the time the Panel is disabled during the render process.
     * If you experience this issue, you may need to instead use the {@link #afterlayout} event to initialize
     * the disabled state:
     * <pre><code>
new Ext.Panel({
    ...
    listeners: {
        'afterlayout': {
            fn: function(p){
                p.disable();
            },
            single: true // important, as many layouts can occur
        }
    }
});
</code></pre>
     */
    /**
     * @cfg {Boolean} autoHeight
     * <code>true</code> to use height:'auto', <code>false</code> to use fixed height (defaults to <code>false</code>).
     * <b>Note</b>: Setting <code>autoHeight: true</code> means that the browser will manage the panel's height
     * based on its contents, and that Ext will not manage it at all. If the panel is within a layout that
     * manages dimensions (<code>fit</code>, <code>border</code>, etc.) then setting <code>autoHeight: true</code>
     * can cause issues with scrolling and will not generally work as expected since the panel will take
     * on the height of its contents rather than the height required by the Ext layout.
     */


    /**
     * @cfg {String} baseCls
     * The base CSS class to apply to this panel's element (defaults to <code>'x-panel'</code>).
     * <p>Another option available by default is to specify <code>'x-plain'</code> which strips all styling
     * except for required attributes for Ext layouts to function (e.g. overflow:hidden).
     * See <code>{@link #unstyled}</code> also.</p>
     */
    baseCls : 'x-panel',
    /**
     * @cfg {String} collapsedCls
     * A CSS class to add to the panel's element after it has been collapsed (defaults to
     * <code>'x-panel-collapsed'</code>).
     */
    collapsedCls : 'x-panel-collapsed',
    /**
     * @cfg {Boolean} maskDisabled
     * <code>true</code> to mask the panel when it is {@link #disabled}, <code>false</code> to not mask it (defaults
     * to <code>true</code>).  Either way, the panel will always tell its contained elements to disable themselves
     * when it is disabled, but masking the panel can provide an additional visual cue that the panel is
     * disabled.
     */
    maskDisabled : true,
    /**
     * @cfg {Boolean} animCollapse
     * <code>true</code> to animate the transition when the panel is collapsed, <code>false</code> to skip the
     * animation (defaults to <code>true</code> if the {@link Ext.Fx} class is available, otherwise <code>false</code>).
     */
    animCollapse : Ext.enableFx,
    /**
     * @cfg {Boolean} headerAsText
     * <code>true</code> to display the panel <code>{@link #title}</code> in the <code>{@link #header}</code>,
     * <code>false</code> to hide it (defaults to <code>true</code>).
     */
    headerAsText : true,
    /**
     * @cfg {String} buttonAlign
     * The alignment of any {@link #buttons} added to this panel.  Valid values are <code>'right'</code>,
     * <code>'left'</code> and <code>'center'</code> (defaults to <code>'right'</code>).
     */
    buttonAlign : 'right',
    /**
     * @cfg {Boolean} collapsed
     * <code>true</code> to render the panel collapsed, <code>false</code> to render it expanded (defaults to
     * <code>false</code>).
     */
    collapsed : false,
    /**
     * @cfg {Boolean} collapseFirst
     * <code>true</code> to make sure the collapse/expand toggle button always renders first (to the left of)
     * any other tools in the panel's title bar, <code>false</code> to render it last (defaults to <code>true</code>).
     */
    collapseFirst : true,
    /**
     * @cfg {Number} minButtonWidth
     * Minimum width in pixels of all {@link #buttons} in this panel (defaults to <code>75</code>)
     */
    minButtonWidth : 75,
    /**
     * @cfg {Boolean} unstyled
     * Overrides the <code>{@link #baseCls}</code> setting to <code>{@link #baseCls} = 'x-plain'</code> which renders
     * the panel unstyled except for required attributes for Ext layouts to function (e.g. overflow:hidden).
     */
    /**
     * @cfg {String} elements
     * A comma-delimited list of panel elements to initialize when the panel is rendered.  Normally, this list will be
     * generated automatically based on the items added to the panel at config time, but sometimes it might be useful to
     * make sure a structural element is rendered even if not specified at config time (for example, you may want
     * to add a button or toolbar dynamically after the panel has been rendered).  Adding those elements to this
     * list will allocate the required placeholders in the panel when it is rendered.  Valid values are<div class="mdetail-params"><ul>
     * <li><code>header</code></li>
     * <li><code>tbar</code> (top bar)</li>
     * <li><code>body</code></li>
     * <li><code>bbar</code> (bottom bar)</li>
     * <li><code>footer</code></li>
     * </ul></div>
     * Defaults to '<code>body</code>'.
     */
    elements : 'body',
    /**
     * @cfg {Boolean} preventBodyReset
     * Defaults to <code>false</code>.  When set to <code>true</code>, an extra css class <code>'x-panel-normal'</code>
     * will be added to the panel's element, effectively applying css styles suggested by the W3C
     * (see http://www.w3.org/TR/CSS21/sample.html) to the Panel's <b>body</b> element (not the header,
     * footer, etc.).
     */
    preventBodyReset : false,

    /**
     * @cfg {Number/String} padding
     * A shortcut for setting a padding style on the body element. The value can either be
     * a number to be applied to all sides, or a normal css string describing padding.
     * Defaults to <tt>undefined</tt>.
     *
     */
    padding: undefined,

    /** @cfg {String} resizeEvent
     * The event to listen to for resizing in layouts. Defaults to <tt>'bodyresize'</tt>.
     */
    resizeEvent: 'bodyresize',

    // protected - these could be used to customize the behavior of the window,
    // but changing them would not be useful without further mofifications and
    // could lead to unexpected or undesirable results.
    toolTarget : 'header',
    collapseEl : 'bwrap',
    slideAnchor : 't',
    disabledClass : '',

    // private, notify box this class will handle heights
    deferHeight : true,
    // private
    expandDefaults: {
        duration : 0.25
    },
    // private
    collapseDefaults : {
        duration : 0.25
    },

    // private
    initComponent : function(){
        Ext.Panel.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event bodyresize
             * Fires after the Panel has been resized.
             * @param {Ext.Panel} p the Panel which has been resized.
             * @param {Number} width The Panel body's new width.
             * @param {Number} height The Panel body's new height.
             */
            'bodyresize',
            /**
             * @event titlechange
             * Fires after the Panel title has been {@link #title set} or {@link #setTitle changed}.
             * @param {Ext.Panel} p the Panel which has had its title changed.
             * @param {String} The new title.
             */
            'titlechange',
            /**
             * @event iconchange
             * Fires after the Panel icon class has been {@link #iconCls set} or {@link #setIconClass changed}.
             * @param {Ext.Panel} p the Panel which has had its {@link #iconCls icon class} changed.
             * @param {String} The new icon class.
             * @param {String} The old icon class.
             */
            'iconchange',
            /**
             * @event collapse
             * Fires after the Panel has been collapsed.
             * @param {Ext.Panel} p the Panel that has been collapsed.
             */
            'collapse',
            /**
             * @event expand
             * Fires after the Panel has been expanded.
             * @param {Ext.Panel} p The Panel that has been expanded.
             */
            'expand',
            /**
             * @event beforecollapse
             * Fires before the Panel is collapsed.  A handler can return false to cancel the collapse.
             * @param {Ext.Panel} p the Panel being collapsed.
             * @param {Boolean} animate True if the collapse is animated, else false.
             */
            'beforecollapse',
            /**
             * @event beforeexpand
             * Fires before the Panel is expanded.  A handler can return false to cancel the expand.
             * @param {Ext.Panel} p The Panel being expanded.
             * @param {Boolean} animate True if the expand is animated, else false.
             */
            'beforeexpand',
            /**
             * @event beforeclose
             * Fires before the Panel is closed.  Note that Panels do not directly support being closed, but some
             * Panel subclasses do (like {@link Ext.Window}) or a Panel within a Ext.TabPanel.  This event only
             * applies to such subclasses.
             * A handler can return false to cancel the close.
             * @param {Ext.Panel} p The Panel being closed.
             */
            'beforeclose',
            /**
             * @event close
             * Fires after the Panel is closed.  Note that Panels do not directly support being closed, but some
             * Panel subclasses do (like {@link Ext.Window}) or a Panel within a Ext.TabPanel.
             * @param {Ext.Panel} p The Panel that has been closed.
             */
            'close',
            /**
             * @event activate
             * Fires after the Panel has been visually activated.
             * Note that Panels do not directly support being activated, but some Panel subclasses
             * do (like {@link Ext.Window}). Panels which are child Components of a TabPanel fire the
             * activate and deactivate events under the control of the TabPanel.
             * @param {Ext.Panel} p The Panel that has been activated.
             */
            'activate',
            /**
             * @event deactivate
             * Fires after the Panel has been visually deactivated.
             * Note that Panels do not directly support being deactivated, but some Panel subclasses
             * do (like {@link Ext.Window}). Panels which are child Components of a TabPanel fire the
             * activate and deactivate events under the control of the TabPanel.
             * @param {Ext.Panel} p The Panel that has been deactivated.
             */
            'deactivate'
        );

        if(this.unstyled){
            this.baseCls = 'x-plain';
        }


        this.toolbars = [];
        // shortcuts
        if(this.tbar){
            this.elements += ',tbar';
            this.topToolbar = this.createToolbar(this.tbar);
            this.tbar = null;

        }
        if(this.bbar){
            this.elements += ',bbar';
            this.bottomToolbar = this.createToolbar(this.bbar);
            this.bbar = null;
        }

        if(this.header === true){
            this.elements += ',header';
            this.header = null;
        }else if(this.headerCfg || (this.title && this.header !== false)){
            this.elements += ',header';
        }

        if(this.footerCfg || this.footer === true){
            this.elements += ',footer';
            this.footer = null;
        }

        if(this.buttons){
            this.fbar = this.buttons;
            this.buttons = null;
        }
        if(this.fbar){
            this.createFbar(this.fbar);
        }
        if(this.autoLoad){
            this.on('render', this.doAutoLoad, this, {delay:10});
        }
    },

    // private
    createFbar : function(fbar){
        var min = this.minButtonWidth;
        this.elements += ',footer';
        this.fbar = this.createToolbar(fbar, {
            buttonAlign: this.buttonAlign,
            toolbarCls: 'x-panel-fbar',
            enableOverflow: false,
            defaults: function(c){
                return {
                    minWidth: c.minWidth || min
                };
            }
        });
        // @compat addButton and buttons could possibly be removed
        // @target 4.0
        /**
         * This Panel's Array of buttons as created from the <code>{@link #buttons}</code>
         * config property. Read only.
         * @type Array
         * @property buttons
         */
        this.fbar.items.each(function(c){
            c.minWidth = c.minWidth || this.minButtonWidth;
        }, this);
        this.buttons = this.fbar.items.items;
    },

    // private
    createToolbar: function(tb, options){
        var result;
        // Convert array to proper toolbar config
        if(Ext.isArray(tb)){
            tb = {
                items: tb
            };
        }
        result = tb.events ? Ext.apply(tb, options) : this.createComponent(Ext.apply({}, tb, options), 'toolbar');
        this.toolbars.push(result);
        return result;
    },

    // private
    createElement : function(name, pnode){
        if(this[name]){
            pnode.appendChild(this[name].dom);
            return;
        }

        if(name === 'bwrap' || this.elements.indexOf(name) != -1){
            if(this[name+'Cfg']){
                this[name] = Ext.fly(pnode).createChild(this[name+'Cfg']);
            }else{
                var el = document.createElement('div');
                el.className = this[name+'Cls'];
                this[name] = Ext.get(pnode.appendChild(el));
            }
            if(this[name+'CssClass']){
                this[name].addClass(this[name+'CssClass']);
            }
            if(this[name+'Style']){
                this[name].applyStyles(this[name+'Style']);
            }
        }
    },

    // private
    onRender : function(ct, position){
        Ext.Panel.superclass.onRender.call(this, ct, position);
        this.createClasses();

        var el = this.el,
            d = el.dom,
            bw,
            ts;


        if(this.collapsible && !this.hideCollapseTool){
            this.tools = this.tools ? this.tools.slice(0) : [];
            this.tools[this.collapseFirst?'unshift':'push']({
                id: 'toggle',
                handler : this.toggleCollapse,
                scope: this
            });
        }

        if(this.tools){
            ts = this.tools;
            this.elements += (this.header !== false) ? ',header' : '';
        }
        this.tools = {};

        el.addClass(this.baseCls);
        if(d.firstChild){ // existing markup
            this.header = el.down('.'+this.headerCls);
            this.bwrap = el.down('.'+this.bwrapCls);
            var cp = this.bwrap ? this.bwrap : el;
            this.tbar = cp.down('.'+this.tbarCls);
            this.body = cp.down('.'+this.bodyCls);
            this.bbar = cp.down('.'+this.bbarCls);
            this.footer = cp.down('.'+this.footerCls);
            this.fromMarkup = true;
        }
        if (this.preventBodyReset === true) {
            el.addClass('x-panel-reset');
        }
        if(this.cls){
            el.addClass(this.cls);
        }

        if(this.buttons){
            this.elements += ',footer';
        }

        // This block allows for maximum flexibility and performance when using existing markup

        // framing requires special markup
        if(this.frame){
            el.insertHtml('afterBegin', String.format(Ext.Element.boxMarkup, this.baseCls));

            this.createElement('header', d.firstChild.firstChild.firstChild);
            this.createElement('bwrap', d);

            // append the mid and bottom frame to the bwrap
            bw = this.bwrap.dom;
            var ml = d.childNodes[1], bl = d.childNodes[2];
            bw.appendChild(ml);
            bw.appendChild(bl);

            var mc = bw.firstChild.firstChild.firstChild;
            this.createElement('tbar', mc);
            this.createElement('body', mc);
            this.createElement('bbar', mc);
            this.createElement('footer', bw.lastChild.firstChild.firstChild);

            if(!this.footer){
                this.bwrap.dom.lastChild.className += ' x-panel-nofooter';
            }
            /*
             * Store a reference to this element so:
             * a) We aren't looking it up all the time
             * b) The last element is reported incorrectly when using a loadmask
             */
            this.ft = Ext.get(this.bwrap.dom.lastChild);
            this.mc = Ext.get(mc);
        }else{
            this.createElement('header', d);
            this.createElement('bwrap', d);

            // append the mid and bottom frame to the bwrap
            bw = this.bwrap.dom;
            this.createElement('tbar', bw);
            this.createElement('body', bw);
            this.createElement('bbar', bw);
            this.createElement('footer', bw);

            if(!this.header){
                this.body.addClass(this.bodyCls + '-noheader');
                if(this.tbar){
                    this.tbar.addClass(this.tbarCls + '-noheader');
                }
            }
        }

        if(Ext.isDefined(this.padding)){
            this.body.setStyle('padding', this.body.addUnits(this.padding));
        }

        if(this.border === false){
            this.el.addClass(this.baseCls + '-noborder');
            this.body.addClass(this.bodyCls + '-noborder');
            if(this.header){
                this.header.addClass(this.headerCls + '-noborder');
            }
            if(this.footer){
                this.footer.addClass(this.footerCls + '-noborder');
            }
            if(this.tbar){
                this.tbar.addClass(this.tbarCls + '-noborder');
            }
            if(this.bbar){
                this.bbar.addClass(this.bbarCls + '-noborder');
            }
        }

        if(this.bodyBorder === false){
           this.body.addClass(this.bodyCls + '-noborder');
        }

        this.bwrap.enableDisplayMode('block');

        if(this.header){
            this.header.unselectable();

            // for tools, we need to wrap any existing header markup
            if(this.headerAsText){
                this.header.dom.innerHTML =
                    '<span class="' + this.headerTextCls + '">'+this.header.dom.innerHTML+'</span>';

                if(this.iconCls){
                    this.setIconClass(this.iconCls);
                }
            }
        }

        if(this.floating){
            this.makeFloating(this.floating);
        }

        if(this.collapsible && this.titleCollapse && this.header){
            this.mon(this.header, 'click', this.toggleCollapse, this);
            this.header.setStyle('cursor', 'pointer');
        }
        if(ts){
            this.addTool.apply(this, ts);
        }

        // Render Toolbars.
        if(this.fbar){
            this.footer.addClass('x-panel-btns');
            this.fbar.ownerCt = this;
            this.fbar.render(this.footer);
            this.footer.createChild({cls:'x-clear'});
        }
        if(this.tbar && this.topToolbar){
            this.topToolbar.ownerCt = this;
            this.topToolbar.render(this.tbar);
        }
        if(this.bbar && this.bottomToolbar){
            this.bottomToolbar.ownerCt = this;
            this.bottomToolbar.render(this.bbar);
        }
    },

    /**
     * Sets the CSS class that provides the icon image for this panel.  This method will replace any existing
     * icon class if one has already been set and fire the {@link #iconchange} event after completion.
     * @param {String} cls The new CSS class name
     */
    setIconClass : function(cls){
        var old = this.iconCls;
        this.iconCls = cls;
        if(this.rendered && this.header){
            if(this.frame){
                this.header.addClass('x-panel-icon');
                this.header.replaceClass(old, this.iconCls);
            }else{
                var hd = this.header,
                    img = hd.child('img.x-panel-inline-icon');
                if(img){
                    Ext.fly(img).replaceClass(old, this.iconCls);
                }else{
                    var hdspan = hd.child('span.' + this.headerTextCls);
                    if (hdspan) {
                        Ext.DomHelper.insertBefore(hdspan.dom, {
                            tag:'img', alt: '', src: Ext.BLANK_IMAGE_URL, cls:'x-panel-inline-icon '+this.iconCls
                        });
                    }
                 }
            }
        }
        this.fireEvent('iconchange', this, cls, old);
    },

    // private
    makeFloating : function(cfg){
        this.floating = true;
        this.el = new Ext.Layer(Ext.apply({}, cfg, {
            shadow: Ext.isDefined(this.shadow) ? this.shadow : 'sides',
            shadowOffset: this.shadowOffset,
            constrain:false,
            shim: this.shim === false ? false : undefined
        }), this.el);
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the top (<code>{@link #tbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getTopToolbar : function(){
        return this.topToolbar;
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the bottom (<code>{@link #bbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getBottomToolbar : function(){
        return this.bottomToolbar;
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the footer (<code>{@link #fbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getFooterToolbar : function() {
        return this.fbar;
    },

    /**
     * Adds a button to this panel.  Note that this method must be called prior to rendering.  The preferred
     * approach is to add buttons via the {@link #buttons} config.
     * @param {String/Object} config A valid {@link Ext.Button} config.  A string will become the text for a default
     * button config, an object will be treated as a button config object.
     * @param {Function} handler The function to be called on button {@link Ext.Button#click}
     * @param {Object} scope The scope (<code>this</code> reference) in which the button handler function is executed. Defaults to the Button.
     * @return {Ext.Button} The button that was added
     */
    addButton : function(config, handler, scope){
        if(!this.fbar){
            this.createFbar([]);
        }
        if(handler){
            if(Ext.isString(config)){
                config = {text: config};
            }
            config = Ext.apply({
                handler: handler,
                scope: scope
            }, config);
        }
        return this.fbar.add(config);
    },

    // private
    addTool : function(){
        if(!this.rendered){
            if(!this.tools){
                this.tools = [];
            }
            Ext.each(arguments, function(arg){
                this.tools.push(arg);
            }, this);
            return;
        }
         // nowhere to render tools!
        if(!this[this.toolTarget]){
            return;
        }
        if(!this.toolTemplate){
            // initialize the global tool template on first use
            var tt = new Ext.Template(
                 '<div class="x-tool x-tool-{id}">&#160;</div>'
            );
            tt.disableFormats = true;
            tt.compile();
            Ext.Panel.prototype.toolTemplate = tt;
        }
        for(var i = 0, a = arguments, len = a.length; i < len; i++) {
            var tc = a[i];
            if(!this.tools[tc.id]){
                var overCls = 'x-tool-'+tc.id+'-over';
                var t = this.toolTemplate.insertFirst(this[this.toolTarget], tc, true);
                this.tools[tc.id] = t;
                t.enableDisplayMode('block');
                this.mon(t, 'click',  this.createToolHandler(t, tc, overCls, this));
                if(tc.on){
                    this.mon(t, tc.on);
                }
                if(tc.hidden){
                    t.hide();
                }
                if(tc.qtip){
                    if(Ext.isObject(tc.qtip)){
                        Ext.QuickTips.register(Ext.apply({
                              target: t.id
                        }, tc.qtip));
                    } else {
                        t.dom.qtip = tc.qtip;
                    }
                }
                t.addClassOnOver(overCls);
            }
        }
    },

    onLayout : function(shallow, force){
        Ext.Panel.superclass.onLayout.apply(this, arguments);
        if(this.hasLayout && this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.doLayout(undefined, force);
            });
            this.syncHeight();
        }
    },

    syncHeight : function(){
        var h = this.toolbarHeight,
                bd = this.body,
                lsh = this.lastSize.height,
                sz;

        if(this.autoHeight || !Ext.isDefined(lsh) || lsh == 'auto'){
            return;
        }


        if(h != this.getToolbarHeight()){
            h = Math.max(0, lsh - this.getFrameHeight());
            bd.setHeight(h);
            sz = bd.getSize();
            this.toolbarHeight = this.getToolbarHeight();
            this.onBodyResize(sz.width, sz.height);
        }
    },

    // private
    onShow : function(){
        if(this.floating){
            return this.el.show();
        }
        Ext.Panel.superclass.onShow.call(this);
    },

    // private
    onHide : function(){
        if(this.floating){
            return this.el.hide();
        }
        Ext.Panel.superclass.onHide.call(this);
    },

    // private
    createToolHandler : function(t, tc, overCls, panel){
        return function(e){
            t.removeClass(overCls);
            if(tc.stopEvent !== false){
                e.stopEvent();
            }
            if(tc.handler){
                tc.handler.call(tc.scope || t, e, t, panel, tc);
            }
        };
    },

    // private
    afterRender : function(){
        if(this.floating && !this.hidden){
            this.el.show();
        }
        if(this.title){
            this.setTitle(this.title);
        }
        Ext.Panel.superclass.afterRender.call(this); // do sizing calcs last
        if (this.collapsed) {
            this.collapsed = false;
            this.collapse(false);
        }
        this.initEvents();
    },

    // private
    getKeyMap : function(){
        if(!this.keyMap){
            this.keyMap = new Ext.KeyMap(this.el, this.keys);
        }
        return this.keyMap;
    },

    // private
    initEvents : function(){
        if(this.keys){
            this.getKeyMap();
        }
        if(this.draggable){
            this.initDraggable();
        }
        if(this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.doLayout();
                tb.on({
                    scope: this,
                    afterlayout: this.syncHeight,
                    remove: this.syncHeight
                });
            }, this);
            this.syncHeight();
        }

    },

    // private
    initDraggable : function(){
        /**
         * <p>If this Panel is configured {@link #draggable}, this property will contain
         * an instance of {@link Ext.dd.DragSource} which handles dragging the Panel.</p>
         * The developer must provide implementations of the abstract methods of {@link Ext.dd.DragSource}
         * in order to supply behaviour for each stage of the drag/drop process. See {@link #draggable}.
         * @type Ext.dd.DragSource.
         * @property dd
         */
        this.dd = new Ext.Panel.DD(this, Ext.isBoolean(this.draggable) ? null : this.draggable);
    },

    // private
    beforeEffect : function(anim){
        if(this.floating){
            this.el.beforeAction();
        }
        if(anim !== false){
            this.el.addClass('x-panel-animated');
        }
    },

    // private
    afterEffect : function(anim){
        this.syncShadow();
        this.el.removeClass('x-panel-animated');
    },

    // private - wraps up an animation param with internal callbacks
    createEffect : function(a, cb, scope){
        var o = {
            scope:scope,
            block:true
        };
        if(a === true){
            o.callback = cb;
            return o;
        }else if(!a.callback){
            o.callback = cb;
        }else { // wrap it up
            o.callback = function(){
                cb.call(scope);
                Ext.callback(a.callback, a.scope);
            };
        }
        return Ext.applyIf(o, a);
    },

    /**
     * Collapses the panel body so that it becomes hidden.  Fires the {@link #beforecollapse} event which will
     * cancel the collapse action if it returns false.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    collapse : function(animate){
        if(this.collapsed || this.el.hasFxBlock() || this.fireEvent('beforecollapse', this, animate) === false){
            return;
        }
        var doAnim = animate === true || (animate !== false && this.animCollapse);
        this.beforeEffect(doAnim);
        this.onCollapse(doAnim, animate);
        return this;
    },

    // private
    onCollapse : function(doAnim, animArg){
        if(doAnim){
            this[this.collapseEl].slideOut(this.slideAnchor,
                    Ext.apply(this.createEffect(animArg||true, this.afterCollapse, this),
                        this.collapseDefaults));
        }else{
            this[this.collapseEl].hide(this.hideMode);
            this.afterCollapse(false);
        }
    },

    // private
    afterCollapse : function(anim){
        this.collapsed = true;
        this.el.addClass(this.collapsedCls);
        if(anim !== false){
            this[this.collapseEl].hide(this.hideMode);
        }
        this.afterEffect(anim);

        // Reset lastSize of all sub-components so they KNOW they are in a collapsed container
        this.cascade(function(c) {
            if (c.lastSize) {
                c.lastSize = { width: undefined, height: undefined };
            }
        });
        this.fireEvent('collapse', this);
    },

    /**
     * Expands the panel body so that it becomes visible.  Fires the {@link #beforeexpand} event which will
     * cancel the expand action if it returns false.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    expand : function(animate){
        if(!this.collapsed || this.el.hasFxBlock() || this.fireEvent('beforeexpand', this, animate) === false){
            return;
        }
        var doAnim = animate === true || (animate !== false && this.animCollapse);
        this.el.removeClass(this.collapsedCls);
        this.beforeEffect(doAnim);
        this.onExpand(doAnim, animate);
        return this;
    },

    // private
    onExpand : function(doAnim, animArg){
        if(doAnim){
            this[this.collapseEl].slideIn(this.slideAnchor,
                    Ext.apply(this.createEffect(animArg||true, this.afterExpand, this),
                        this.expandDefaults));
        }else{
            this[this.collapseEl].show(this.hideMode);
            this.afterExpand(false);
        }
    },

    // private
    afterExpand : function(anim){
        this.collapsed = false;
        if(anim !== false){
            this[this.collapseEl].show(this.hideMode);
        }
        this.afterEffect(anim);
        if (this.deferLayout) {
            delete this.deferLayout;
            this.doLayout(true);
        }
        this.fireEvent('expand', this);
    },

    /**
     * Shortcut for performing an {@link #expand} or {@link #collapse} based on the current state of the panel.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    toggleCollapse : function(animate){
        this[this.collapsed ? 'expand' : 'collapse'](animate);
        return this;
    },

    // private
    onDisable : function(){
        if(this.rendered && this.maskDisabled){
            this.el.mask();
        }
        Ext.Panel.superclass.onDisable.call(this);
    },

    // private
    onEnable : function(){
        if(this.rendered && this.maskDisabled){
            this.el.unmask();
        }
        Ext.Panel.superclass.onEnable.call(this);
    },

    // private
    onResize : function(adjWidth, adjHeight, rawWidth, rawHeight){
        var w = adjWidth,
            h = adjHeight;

        if(Ext.isDefined(w) || Ext.isDefined(h)){
            if(!this.collapsed){
                // First, set the the Panel's body width.
                // If we have auto-widthed it, get the resulting full offset width so we can size the Toolbars to match
                // The Toolbars must not buffer this resize operation because we need to know their heights.

                if(Ext.isNumber(w)){
                    this.body.setWidth(w = this.adjustBodyWidth(w - this.getFrameWidth()));
                } else if (w == 'auto') {
                    w = this.body.setWidth('auto').dom.offsetWidth;
                } else {
                    w = this.body.dom.offsetWidth;
                }

                if(this.tbar){
                    this.tbar.setWidth(w);
                    if(this.topToolbar){
                        this.topToolbar.setSize(w);
                    }
                }
                if(this.bbar){
                    this.bbar.setWidth(w);
                    if(this.bottomToolbar){
                        this.bottomToolbar.setSize(w);
                        // The bbar does not move on resize without this.
                        if (Ext.isIE) {
                            this.bbar.setStyle('position', 'static');
                            this.bbar.setStyle('position', '');
                        }
                    }
                }
                if(this.footer){
                    this.footer.setWidth(w);
                    if(this.fbar){
                        this.fbar.setSize(Ext.isIE ? (w - this.footer.getFrameWidth('lr')) : 'auto');
                    }
                }

                // At this point, the Toolbars must be layed out for getFrameHeight to find a result.
                if(Ext.isNumber(h)){
                    h = Math.max(0, h - this.getFrameHeight());
                    //h = Math.max(0, h - (this.getHeight() - this.body.getHeight()));
                    this.body.setHeight(h);
                }else if(h == 'auto'){
                    this.body.setHeight(h);
                }

                if(this.disabled && this.el._mask){
                    this.el._mask.setSize(this.el.dom.clientWidth, this.el.getHeight());
                }
            }else{
                // Adds an event to set the correct height afterExpand.  This accounts for the deferHeight flag in panel
                this.queuedBodySize = {width: w, height: h};
                if(!this.queuedExpand && this.allowQueuedExpand !== false){
                    this.queuedExpand = true;
                    this.on('expand', function(){
                        delete this.queuedExpand;
                        this.onResize(this.queuedBodySize.width, this.queuedBodySize.height);
                    }, this, {single:true});
                }
            }
            this.onBodyResize(w, h);
        }
        this.syncShadow();
        Ext.Panel.superclass.onResize.call(this, adjWidth, adjHeight, rawWidth, rawHeight);

    },

    // private
    onBodyResize: function(w, h){
        this.fireEvent('bodyresize', this, w, h);
    },

    // private
    getToolbarHeight: function(){
        var h = 0;
        if(this.rendered){
            Ext.each(this.toolbars, function(tb){
                h += tb.getHeight();
            }, this);
        }
        return h;
    },

    // deprecate
    adjustBodyHeight : function(h){
        return h;
    },

    // private
    adjustBodyWidth : function(w){
        return w;
    },

    // private
    onPosition : function(){
        this.syncShadow();
    },

    /**
     * Returns the width in pixels of the framing elements of this panel (not including the body width).  To
     * retrieve the body width see {@link #getInnerWidth}.
     * @return {Number} The frame width
     */
    getFrameWidth : function(){
        var w = this.el.getFrameWidth('lr') + this.bwrap.getFrameWidth('lr');

        if(this.frame){
            var l = this.bwrap.dom.firstChild;
            w += (Ext.fly(l).getFrameWidth('l') + Ext.fly(l.firstChild).getFrameWidth('r'));
            w += this.mc.getFrameWidth('lr');
        }
        return w;
    },

    /**
     * Returns the height in pixels of the framing elements of this panel (including any top and bottom bars and
     * header and footer elements, but not including the body height).  To retrieve the body height see {@link #getInnerHeight}.
     * @return {Number} The frame height
     */
    getFrameHeight : function() {
        var h  = this.el.getFrameWidth('tb') + this.bwrap.getFrameWidth('tb');
        h += (this.tbar ? this.tbar.getHeight() : 0) +
             (this.bbar ? this.bbar.getHeight() : 0);

        if(this.frame){
            h += this.el.dom.firstChild.offsetHeight + this.ft.dom.offsetHeight + this.mc.getFrameWidth('tb');
        }else{
            h += (this.header ? this.header.getHeight() : 0) +
                (this.footer ? this.footer.getHeight() : 0);
        }
        return h;
    },

    /**
     * Returns the width in pixels of the body element (not including the width of any framing elements).
     * For the frame width see {@link #getFrameWidth}.
     * @return {Number} The body width
     */
    getInnerWidth : function(){
        return this.getSize().width - this.getFrameWidth();
    },

    /**
     * Returns the height in pixels of the body element (not including the height of any framing elements).
     * For the frame height see {@link #getFrameHeight}.
     * @return {Number} The body height
     */
    getInnerHeight : function(){
        return this.body.getHeight();
        /* Deprecate
            return this.getSize().height - this.getFrameHeight();
        */
    },

    // private
    syncShadow : function(){
        if(this.floating){
            this.el.sync(true);
        }
    },

    // private
    getLayoutTarget : function(){
        return this.body;
    },

    // private
    getContentTarget : function(){
        return this.body;
    },

    /**
     * <p>Sets the title text for the panel and optionally the {@link #iconCls icon class}.</p>
     * <p>In order to be able to set the title, a header element must have been created
     * for the Panel. This is triggered either by configuring the Panel with a non-blank <code>{@link #title}</code>,
     * or configuring it with <code><b>{@link #header}: true</b></code>.</p>
     * @param {String} title The title text to set
     * @param {String} iconCls (optional) {@link #iconCls iconCls} A user-defined CSS class that provides the icon image for this panel
     */
    setTitle : function(title, iconCls){
        this.title = title;
        if(this.header && this.headerAsText){
            this.header.child('span').update(title);
        }
        if(iconCls){
            this.setIconClass(iconCls);
        }
        this.fireEvent('titlechange', this, title);
        return this;
    },

    /**
     * Get the {@link Ext.Updater} for this panel. Enables you to perform Ajax updates of this panel's body.
     * @return {Ext.Updater} The Updater
     */
    getUpdater : function(){
        return this.body.getUpdater();
    },

     /**
     * Loads this content panel immediately with content returned from an XHR call.
     * @param {Object/String/Function} config A config object containing any of the following options:
<pre><code>
panel.load({
    url: 'your-url.php',
    params: {param1: 'foo', param2: 'bar'}, // or a URL encoded string
    callback: yourFunction,
    scope: yourObject, // optional scope for the callback
    discardUrl: false,
    nocache: false,
    text: 'Loading...',
    timeout: 30,
    scripts: false
});
</code></pre>
     * The only required property is url. The optional properties nocache, text and scripts
     * are shorthand for disableCaching, indicatorText and loadScripts and are used to set their
     * associated property on this panel Updater instance.
     * @return {Ext.Panel} this
     */
    load : function(){
        var um = this.body.getUpdater();
        um.update.apply(um, arguments);
        return this;
    },

    // private
    beforeDestroy : function(){
        Ext.Panel.superclass.beforeDestroy.call(this);
        if(this.header){
            this.header.removeAllListeners();
        }
        if(this.tools){
            for(var k in this.tools){
                Ext.destroy(this.tools[k]);
            }
        }
        if(this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.un('afterlayout', this.syncHeight, this);
                tb.un('remove', this.syncHeight, this);
            }, this);
        }
        if(Ext.isArray(this.buttons)){
            while(this.buttons.length) {
                Ext.destroy(this.buttons[0]);
            }
        }
        if(this.rendered){
            Ext.destroy(
                this.ft,
                this.header,
                this.footer,
                this.tbar,
                this.bbar,
                this.body,
                this.mc,
                this.bwrap,
                this.dd
            );
            if (this.fbar) {
                Ext.destroy(
                    this.fbar,
                    this.fbar.el
                );
            }
        }
        Ext.destroy(this.toolbars);
    },

    // private
    createClasses : function(){
        this.headerCls = this.baseCls + '-header';
        this.headerTextCls = this.baseCls + '-header-text';
        this.bwrapCls = this.baseCls + '-bwrap';
        this.tbarCls = this.baseCls + '-tbar';
        this.bodyCls = this.baseCls + '-body';
        this.bbarCls = this.baseCls + '-bbar';
        this.footerCls = this.baseCls + '-footer';
    },

    // private
    createGhost : function(cls, useShim, appendTo){
        var el = document.createElement('div');
        el.className = 'x-panel-ghost ' + (cls ? cls : '');
        if(this.header){
            el.appendChild(this.el.dom.firstChild.cloneNode(true));
        }
        Ext.fly(el.appendChild(document.createElement('ul'))).setHeight(this.bwrap.getHeight());
        el.style.width = this.el.dom.offsetWidth + 'px';;
        if(!appendTo){
            this.container.dom.appendChild(el);
        }else{
            Ext.getDom(appendTo).appendChild(el);
        }
        if(useShim !== false && this.el.useShim !== false){
            var layer = new Ext.Layer({shadow:false, useDisplay:true, constrain:false}, el);
            layer.show();
            return layer;
        }else{
            return new Ext.Element(el);
        }
    },

    // private
    doAutoLoad : function(){
        var u = this.body.getUpdater();
        if(this.renderer){
            u.setRenderer(this.renderer);
        }
        u.update(Ext.isObject(this.autoLoad) ? this.autoLoad : {url: this.autoLoad});
    },

    /**
     * Retrieve a tool by id.
     * @param {String} id
     * @return {Object} tool
     */
    getTool : function(id) {
        return this.tools[id];
    }

/**
 * @cfg {String} autoEl @hide
 */
});
Ext.reg('panel', Ext.Panel);
