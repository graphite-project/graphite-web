<?php
$tree = stripslashes($_REQUEST['data']);
file_put_contents('./dep-tree.json', $tree);
