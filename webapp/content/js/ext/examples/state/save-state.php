<?php
session_start();
if(!isset($_SESSION['state'])){
    $_SESSION['state'] = array(
        'sessionId'=>session_id()
    );
}
foreach($_COOKIE as $name=>$value){
    // look for state cookies
    if(strpos($name, 'ys-') === 0){
        // store in session
        $_SESSION['state'][substr($name, 3)] = $value;
        // remove cookie
        setCookie($name, '', time()-10000, '/');
    }
}
