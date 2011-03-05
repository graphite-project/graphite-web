<?php
class Tags {
    function load($data){
        $db = new SQLiteDatabase('sql/imgorg.db');
        // use $query for type-ahead
        $query = $data->query;

        $qryStr = 'SELECT * FROM Tags';
        if ($query) {
            $qryStr .= ' where text like "'.$query.'%"';
        }
        $q = $db->query($qryStr);
        return $q->fetchAll();
    }

    function getTags($data) {
        $db = new SQLiteDatabase('sql/imgorg.db');
        $image = $data->image;

        $q = $db->query('SELECT t.text as text, t.id as id FROM Tags t INNER JOIN Images_Tags it ON t.id = it.tag_id WHERE it.image_id = "'.$image.'"');
        return $q->fetchAll();
    }
}
