<?php
class Albums {
    function loadtree(){
        $db = new SQLiteDatabase("sql/imgorg.db");

        $res = $db->query('select * from Albums');
        $json = array();
        while ($o = $res->fetchObject()) {
            $o->leaf = true;
            array_push($json,$o);
        }
        return $json;
    }

    function addOrUpdate($data){
        $db = new SQLiteDatabase('sql/imgorg.db');
        $q = $db->query('SELECT * FROM Albums where id = "'.$data->id.'"');
        if (sizeof($q) == 0) {
            $res = $db->query('INSERT INTO Albums (text) VALUES ("'.$data->text.'")');
        } else {
            $res = $db->query('UPDATE Albums SET text ="'.$data->text.'" WHERE id = "'.$data->id.'"');
        }
        return array(success => true);
    }

    function remove($data) {
        $db = new SQLiteDatabase('sql/imgorg.db');
        $q = $db->queryExec('DELETE FROM Albums where id ="'.$data->album.'"');
        return array(success=>true, album => $data->album);
    }

    function load($data){
        // use $query for type-ahead
        $query = $data->query;
        $db = new SQLiteDatabase('sql/imgorg.db');
        $qryStr = 'SELECT * FROM Albums';
        if ($query) {
            $qryStr .= ' where text like "'.$query.'%"';
        }
        $q = $db->query($qryStr);
        return $q->fetchAll();
    }

    function getAlbums($data) {
        $db = new SQLiteDatabase('sql/imgorg.db');
        $image = $data->image;

        $q = $db->query('SELECT a.text as text, a.id as id FROM Albums a INNER JOIN Images i ON a.id = i.album_id WHERE i.id = "'.$image.'"');
        return $q->fetchAll();
    }

    function getAllInfo($data) {
        $db = new SQLiteDatabase('sql/imgorg.db');
        $res = $db->query('select * from Albums');
        $json = array();
        while ($o = $res->fetchObject()) {
            $q = $db->query('SELECT * FROM Images WHERE album_id = "'.$o->id.'"');
            $qres = $q->fetchObject();
            if ($qres) {
                $path = $qres->url;
                $filename = '../'.$path;
                if (file_exists($filename)) {
                    $o->exif = exif_read_data($filename);
                }
                $o->filename = $qres->filename;
            }
            $o->size = sizeof($q->fetchAll());
            array_push($json,$o);
        }
        return $json;
    }
}
