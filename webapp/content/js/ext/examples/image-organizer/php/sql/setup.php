<?php
/* The SQLite extension is enabled by default as of PHP 5.
 * Before that time the SQLite library is needed.
 *
 * For more info on setting up SQLite See:
 * http://www.php.net/manual/en/sqlite.installation.php
 *
 */
    if ($db = new SQLiteDatabase('imgorg.db')) {
        // Albums
//        $db->queryExec('DROP TABLE Albums');
        $db->queryExec('CREATE TABLE Albums (
            id INTEGER PRIMARY KEY,
            text STRING,
            created STRING,
            description TEXT
        );
        INSERT INTO Albums (text) VALUES ("Test");
        INSERT INTO Albums (text) VALUES ("Album2");');

        // Albums_Images
//        $db->queryExec('DROP TABLE Albums_Images');
        $db->queryExec('CREATE TABLE Albums_Images (
            album_id INTEGER,
            image_id INTEGER
        )');

        // Images_Tags
        $db->queryExec('CREATE TABLE Images_Tags (
            tag_id INTEGER,
            image_id INTEGER
        )');

        // Tags
//        $db->queryExec('DROP Table Tags');
        $db->queryExec('CREATE TABLE Tags (
            id INTEGER PRIMARY KEY,
            text STRING
        );
        INSERT INTO Tags (text) VALUES("Family");
        INSERT INTO Tags (text) VALUES("Friends");
        INSERT INTO Tags (text) VALUES("Other")');

        // Images
//        $db->queryExec('DROP TABLE Images');
        $db->queryExec('CREATE TABLE Images (
            id INTEGER PRIMARY KEY,
            filename STRING,
            url STRING,
            album_id INTEGER,
            description TEXT
        )');

//        $dir = "../../images/thumbs/";
//        $images = array();
//        $d = dir($dir);
//        $i = 0;
//        while($name = $d->read()){
//            if(!preg_match('/\.(jpg|gif|png)$/', $name)) continue;
//            $size = filesize($dir.$name);
//            $lastmod = filemtime($dir.$name)*1000;
//            $db->queryExec('INSERT INTO Images (filename, url) VALUES
//                ("'.$name.'","images/thumbs/'.$name.'")');
//        }
//        $d->close();


        echo json_encode($db->query('select * from Images')->fetchAll());
    } else {
        die($err);
    }

