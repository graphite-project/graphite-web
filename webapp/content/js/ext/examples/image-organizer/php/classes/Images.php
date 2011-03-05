<?php
class Images {
    function load($data){
        $db = new SQLiteDatabase("sql/imgorg.db");
        $tags = $data->tags;
        $album = $data->album;
        $qry = 'select i.filename as filename, i.url as url, i.id as id from Images i';
        $where = array();
        if ($tags) {
            for ($i = 0;$i < sizeof($tags);$i++) {
                $qry .= ' INNER JOIN Images_Tags it'.$i.' ON i.id = it'.$i.'.image_id';
                array_push($where,' it'.$i.'.tag_id = "'.$tags[$i].'"');
            }
        }
        if ($album) {
            $qry .= ' INNER JOIN Albums a ON i.album_id = a.id';
            array_push($where, ' a.id ="'.$album.'"');
        }
        if ($where) {
            $qry .= ' WHERE'.join(" AND", $where);
        }
        $res = $db->query($qry);
        return $res->fetchAll();
//        return $qry;
    }

    function upload($data, $files){
        $name = $files["Filedata"]["name"];
        $db = new SQLiteDatabase("sql/imgorg.db");
        $db->queryExec('INSERT INTO Images (filename, url) VALUES("'.$name.'","images/'.$name.'")');
        $q = $db->query('SELECT * FROM Images WHERE filename = "'.$name.'"');
        move_uploaded_file($files["Filedata"]["tmp_name"],"../images/".$name);

        return array(
            'data' => $files["Filedata"],
            'res'  => $q->fetchObject()
            //,
            //'test' => $phm->getImageQuality()
            );
    }

    function addToAlbum($data) {
        $images = $data->images;
        $album = $data->album;
        $db = new SQLiteDatabase("sql/imgorg.db");
        for ($i = 0;$i < sizeof($images);$i++) {
//            $db->queryExec('INSERT INTO Albums_Images (image_id, album_id) VALUES ("'.$images[$i].'","'.$album.'")');
            $db->queryExec('UPDATE Images SET album_id = "'.$album.'" WHERE id ="'.$images[$i].'"');
        }
        return array('success' => true, 'images' => $images, 'album' => $album);
    }

    function tagImage($data) {
        $images = $data->images;
        $tag = $data->tag;
        $db = new SQLiteDatabase("sql/imgorg.db");
        // if it is a known tag the id is sent, otherwise a new string is, so we need to insert
        if (!is_numeric($tag)) {
            $db->queryExec('INSERT INTO Tags (text) VALUES ("'.$tag.'")');
            $q = $db->query('SELECT id FROM Tags WHERE text = "'.$tag.'"');
            $tag = $q->fetchObject()->id;
        }
        for ($i = 0;$i < sizeof($images);$i++) {
            $db->queryExec('INSERT INTO Images_Tags (image_id, tag_id) VALUES ("'.$images[$i].'","'.$tag.'")');
        }
        return array('success' => true, 'images' => $images, 'tag' => $tag);
    }

    function rename($data) {
        $db = new SQLiteDatabase("sql/imgorg.db");
        $image = $data->image;
        $name = $data->name;
        $url = $data->url;
        $urls = split('/',$url);
        array_pop($urls);
        $newUrl = (join('/',$urls)).'/'.$name;

        $db->queryExec('UPDATE Images SET url = "'.$newUrl.'", filename = "'.$name.'" WHERE id = "'.$image.'"');
        rename('../'.$url, '../'.$newUrl);

        return array('image' => $image, 'name' => $name, 'url' => $newUrl);
    }

    function remove($data) {
        $db = new SQLiteDatabase("sql/imgorg.db");
        $images = $data->images;
        for ($i = 0;$i < sizeof($images);$i++) {
            $res = $db->query('SELECT url FROM Images where id ="'.$images[$i].'"');
            $url = $res->fetchObject()->url;
            unlink('../'.$url);
            $db->queryExec('DELETE FROM Images WHERE id ="'.$images[$i].'"');
            $db->queryExec('DELETE FROM Images_Tags WHERE image_id ="'.$images[$i].'"');
        }
    }

    function getInfo($data) {
        $db = new SQLiteDatabase("sql/imgorg.db");
        $image = $data->image;
        $q = $db->query('SELECT url FROM Images WHERE id = "'.$image.'"');
        $path = $q->fetchObject()->url;
        $ret = exif_read_data('../'.$path);
        return $ret;
    }
}
