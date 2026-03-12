<?php
//	$conn = mysqli_connect('localhost', 'license', 'dortltmDB&(', 'auth'); // mysql에 연결
//	$conn =  new mysqli('localhost', 'license', 'dortltmDB&(', 'auth'); // mysql에 연결
//	mysqli_query($conn,'set names utf8;');

	try {
		$pdo = new PDO('mysql:host=license.c7dtsruidub0.ap-northeast-2.rds.amazonaws.com;dbname=spauth', 'axissoft', 'axis7!73450'); // mysql에 연결
		$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
		$pdo->setAttribute(PDO::ATTR_TIMEOUT, 30);
		$pdo->query("SET NAMES utf8");
	}catch(PDOException $e){
		$e->getMessage();
		die();
	}
?>
