<?php

	/*
	 *  PHP 7.2 (UTF-8)
	 */
	 
	define('BASEPATH',1);
	require_once($_SERVER['DOCUMENT_ROOT']."/Axcrypto.php");
	
	function decrypt($text, $key) {
		if ($key != "") {
			  $obj = new Axcrypto($key);    
    		$decoded_data = $obj->encrypt($text);

			return $decoded_data;
		}

		return $text;
	}

	function beginApp($device_id, $os_version, $app_version, $state, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
		
	}

	function beginContent($user_id, $device_id, $os_version, $app_version, $content_id, $content_url, $play_type, $state, $created_date) {
		//Todo

		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message>begin_contents</message>");
	//	echo("<debug>" . $content_url . "</debug>");
		echo("</axis-app>");

	}

	function endContent($user_id, $device_id, $content_id, $content_url, $play_type, $play_time, $current_position, $created_date, $latest_playtime, $content_duration) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function playingContent($user_id, $device_id, $content_id, $content_url, $play_type, $play_time, $current_position, $created_date, $latest_playtime, $content_duration) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message>playing</message>");
		echo("</axis-app>");
	}

	function downloadBeginContent($user_id, $device_id, $os_version, $app_version, $content_id, $content_url, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function downloadContent($user_id, $device_id, $os_version, $app_version, $content_id, $content_url, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function deleteContent($user_id, $device_id, $content_id, $content_url, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function registerDeviceId($user_id, $device_id, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function unRegisterDeviceId($user_id, $device_id, $created_date) {
		//Todo
		
		echo("<axis-app>");
		echo("<error>0</error>");
		echo("<message></message>");
		echo("</axis-app>");
	}

	function getParam($name) {
		if ($_SERVER['REQUEST_METHOD'] == "GET") {
			$data = $_GET[$name];
		} else {
			$data = $_POST[$name];
		}
		return $data;
	}
	
	////////////////////////////////////////////

	header('Expires: -1');
	header('Cache-Control: no-cache');
	header('Pragma: no-cache');
	header('Content-type: text/plain');
	// header('Content-type: text/xml');
	echo('<?xml version="1.0" encoding="UTF-8"?>');	

	$license = getParam("license");
        $event = getParam("event");
        
	if ($event == "begin_app")
		beginApp(getParam("device_id"), getParam("os_version"), getParam("app_version"), getParam("state"), getParam("date"));
	else if ($event == "begin_content")
		beginContent(getParam("user_id"), getParam("device_id"), getParam("os_version"), getParam("app_version"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("play_type"), getParam("state"), getParam("date"));
	else if ($event == "end_content")
		endContent(getParam("user_id"), getParam("device_id"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("play_type"), getParam("play_time"), getParam("current_position"), getParam("date"), getParam("latest_playtime"), getParam("content_duration"));
	else if ($event == "playing_content")
		playingContent(getParam("user_id"), getParam("device_id"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("play_type"), getParam("play_time"), getParam("current_position"), getParam("date"), getParam("latest_playtime"), getParam("content_duration"));
	else if ($event == "download_begin_content")
		downloadBeginContent(getParam("user_id"), getParam("device_id"), getParam("os_version"), getParam("app_version"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("date"));
	else if ($event == "download_content")
		downloadContent(getParam("user_id"), getParam("device_id"), getParam("os_version"), getParam("app_version"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("date"));
	else if ($event == "delete_content")
		deleteContent(getParam("user_id"), getParam("device_id"), getParam("content_id"), decrypt(getParam("content_url"), $license), getParam("date"));
	else if ($event == "register_device_id")
		registerDeviceId(getParam("user_id"), getParam("device_id"), getParam("date"));
	else if ($event == "unregister_device_id")
		unRegisterDeviceId(getParam("user_id"), getParam("device_id"), getParam("date"));
	else {
		echo("<axis-app>");
		echo("<error>-1</error>");
		echo("<message>유효한 이벤트가 아닙니다.</message>");
		echo("</axis-app>");
	}
?>
