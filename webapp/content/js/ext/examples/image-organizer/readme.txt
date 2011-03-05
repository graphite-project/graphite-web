-------------------------------------------------------------------------------
1. This example utilizes SQLite.  You may need to enable these extensions in php.ini:

extension=php_pdo.dll
extension=php_sqlite.dll

-------------------------------------------------------------------------------
2. Also make sure these are enabled for exif module:

extension=php_mbstring.dll 
extension=php_exif.dll

-------------------------------------------------------------------------------

3. Do not forget to restart your webserver if you made changes.

-------------------------------------------------------------------------------

4. A sample database is included, to recreate the database navigate to this file in your browser:
/examples/image-organizer/php/sql/setup.php