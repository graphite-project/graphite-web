<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
    <title>Ext.Direct Form Integration</title>
    <link rel="stylesheet" type="text/css" href="../../resources/css/ext-all.css" />
    <!-- Common Styles for the examples -->
    <link rel="stylesheet" type="text/css" href="../shared/examples.css" />

    <!-- GC -->
 	<!-- LIBS -->
 	<script type="text/javascript" src="../../adapter/ext/ext-base.js"></script>
 	<!-- ENDLIBS -->
    <script type="text/javascript" src="../../ext-all.js"></script>
    <script language="javascript" src="direct-form.js"></script>
	<script type="text/javascript" src="php/api.php"></script>
</head>
<body>
<script type="text/javascript" src="../shared/examples.js"></script><!-- EXAMPLES -->

<h1>Ext.Direct Form Integration</h1>

<p>The js is not minified so it is readable. See <a href="direct-form.js">direct-form.js</a>.</p>

<p>The following example illustrates how to load a FormPanel or BasicForm through Ext.Direct.</p>
<p>Notice that Direct requests will batch together if they occur within the enableBuffer delay period (in milliseconds).</p>
<p>The Ext.Direct Form api also supports submit in addition to load. The server-side must mark the submit handler as a 'formHandler' and will not be batched.</p>

</body>
</html>
