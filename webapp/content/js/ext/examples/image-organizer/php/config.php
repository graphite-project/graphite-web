<?php
$API = array(
	'Tags'=>array(
	    'methods'=>array(
	        'load'=>array(
	            'len'=>1
	        ),
	        'getTags'=>array(
	            'len'=>1
	        )
	    )
	),
    'Albums' => array(
        'methods' => array(
            'loadtree' => array(
                'len' => 1
            ),
            'addOrUpdate' => array(
                'len' => 1
            ),
            'remove' => array(
                'len' => 1
            ),
	        'load'=>array(
	            'len'=>1
	        ),
	        'getAlbums'=>array(
	            'len'=>1
	        ),
	        'getAllInfo'=>array(
	            'len'=>1
	        )
        )
    ),
    'Images' => array(
        'methods' => array(
            'load' => array(
                'len' => 1
            ),
            'upload' => array(
                'len' => 1
            ),
            'addToAlbum' => array(
                'len' => 1
            ),
            'tagImage' => array(
                'len' => 1
            ),
            'rename' => array(
                'len' => 1
            ),
            'remove' => array(
                'len' => 1
            ),
            'getInfo' => array(
                'len' => 1
            )
        )
    )
);