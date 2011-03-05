<?php
session_start();
if(!isset($_SESSION['state'])){
    $_SESSION['state'] = array(
        'sessionId'=>session_id()
    );
}
echo 'Ext.appState = ';
echo json_encode($_SESSION['state']);
echo ';';
