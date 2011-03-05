<?php
require('config.php');
header('Content-Type: text/javascript');

// convert API config to Ext.Direct spec
$actions = array();
foreach($API as $aname=>&$a){
	$methods = array();
	foreach($a['methods'] as $mname=>&$m){
		$md = array(
			'name'=>$mname,
			'len'=>$m['len']
		);
		if(isset($m['formHandler'])){
			$md['formHandler'] = true;
		}
		$methods[] = $md;
	}
	$actions[$aname] = $methods;
}

$cfg = array(
    'url'=>'php/router.php',
    'type'=>'remoting',
	'actions'=>$actions,
    'namespace'=>'Imgorg.ss'
);

echo 'Imgorg.REMOTING_API = ';

echo json_encode($cfg);
echo ';';
