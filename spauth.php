<?php
	define("__ROOT__", $_SERVER['DOCUMENT_ROOT'].'/spauth');
	define("__LOG__", $_SERVER['DOCUMENT_ROOT'].'/spauth/log');

//	header("Content-type: text/html");
	header("Content-type: application/xml");
//	header("Cache-Control: no-cache, must-revalidate");
	header("Cache-Control: max-age=86400, must-revalidate");    //1일 캐싱
//	header("Pragma: no-cache");
	function ip_visitor_country(){
		$client  = @$_SERVER['HTTP_CLIENT_IP'];
		$forward = @$_SERVER['HTTP_X_FORWARDED_FOR'];
		$remote  = $_SERVER['REMOTE_ADDR'];
		$country  = "Unknown";

		if (filter_var($client, FILTER_VALIDATE_IP)) {
			$ip = $client;
		} elseif (filter_var($forward, FILTER_VALIDATE_IP)) {
			$ip = $forward;
		} else {
			$ip = $remote;
		}
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "http://www.geoplugin.net/json.gp?ip=" . $ip);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
		$ip_data_in = curl_exec($ch); // string
		curl_close($ch);
		$ip_data = json_decode($ip_data_in, true);
		$ip_data = str_replace('&quot;', '"',
			$ip_data
		); // for PHP 5.2 see stackoverflow.com/questions/3110487/
		if ($ip_data && $ip_data['geoplugin_timezone'] != null) {
			$country = $ip_data['geoplugin_timezone'];
		}
		return $country;
	}




	error_reporting(E_ALL);
//	ini_set("display_errors", 1);
	ini_set('log_errors', '1');
	ini_set('error_log', __LOG__.'/custom_'.date("Ymd").'.log');

	include_once( __ROOT__.'/config/db.conn.php');

	//변수 초기화
	$ref = $error = $message = $xml_body = null;

	//라이센스코드 key
	$license_code = isset($_REQUEST['license_code']) ? addslashes($_REQUEST['license_code']) : null;

	//라이센스코드 validate.
	if($license_code){
		if(preg_match('/[^A-Z0-9\-]/', $license_code)) {
			$error = 1;
			$message .= "wrong license_code.";
		}
		if(strlen($license_code) != 36){
			$error = 1;
			$message .= "wrong license_code length.";
		}
	}else{
		$error = 1;
		$message .= "no parameter.";
	}
	if($license_code == "780FE6EC-BA01-4D38-A27F-A02111D02D8E" || $license_code == "F89E4F66-D6DB-48BA-A5AE-08191910ED8C" || $license_code == "7F939736-A851-48FA-B77B-26B24CBA2327" || $license_code=="6B310E7B-A764-4579-B4DA-79CFE28FF7CC"){
		$national = ip_visitor_country();
		date_default_timezone_set($national);
		if(!date_default_timezone_get()){
			date_default_timezone_set("Asia/Seoul");
		}
	}
	else{
		date_default_timezone_set("Asia/Seoul");
	}
	if(!$error){
		//고객사 데이터
		$query = "SELECT * FROM spauth WHERE license_code = :license_code and enable='Y'";
//		$query = "SELECT * FROM spauth WHERE license_code = :license_code";
		$stmt = $pdo->prepare($query);
		$stmt->bindParam(":license_code", $license_code);
		$stmt->execute();
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if($row){
			$error = 0;
			$message = "success";
            //$server_time = ip_visitor_country();
			//파일경로 가져오기
//			$icon_url = "http://".str_replace("//","/","license.starplayer.net/files/".$row['service_icon']);
//			$image_url = "http://".str_replace("//","/","license.starplayer.net/files/".$row['launcher_image']);

			$icon_url = "http://".str_replace("//","/","axissoft1.cdn3.cafe24.com/web/images/".$row['service_icon']);
			$image_url = "http://".str_replace("//","/","axissoft1.cdn3.cafe24.com/web/images/".$row['launcher_image']);

			$xml_body .= "<updated_date><![CDATA[".$row['updated_date']."]]></updated_date>\n";
			$xml_body .= "<company_name><![CDATA[".$row['company_name']."]]></company_name>\n";
			$xml_body .= "<service_name><![CDATA[".$row['service_name']."]]></service_name>\n";
			$xml_body .= "<service_domain><![CDATA[".$row['service_domain']."]]></service_domain>\n";
			$xml_body .= "<service_icon><![CDATA[".$icon_url."]]></service_icon>\n";
			$xml_body .= "<launcher_image><![CDATA[".$image_url."]]></launcher_image>\n";
			$xml_body .= "<app_event><![CDATA[".$row['app_event']."]]></app_event>\n";
			$xml_body .= "<scms_url><![CDATA[".$row['scms_url']."]]></scms_url>\n";
			$xml_body .= "<mp3_enable><![CDATA[".$row['mp3_enable']."]]></mp3_enable>\n";
			$xml_body .= "<enable><![CDATA[".$row['enable']."]]></enable>\n";
			$xml_body .= "<ptype><![CDATA[".$row['ptype']."]]></ptype>\n";
			$xml_body .= "<server_time><![CDATA[". date('YmdHis')."]]></server_time>\n";
			$xml_body .= "<spkid><![CDATA[".$row['spkid']."]]></spkid>\n";
			$xml_body .= "<pc_download_yn><![CDATA[".$row['pc_download_yn']."]]></pc_download_yn>\n";
			$xml_body .= "<pc_config_url><![CDATA[".$row['pc_config_url']."]]></pc_config_url>\n";
			$xml_body .= "<pc_history_url><![CDATA[".$row['pc_history_url']."]]></pc_history_url>\n";
			$xml_body .= "<pc_only_online><![CDATA[".$row['pc_only_online']."]]></pc_only_online>\n";
			$xml_body .= "<pc_watermark_yn><![CDATA[".$row['pc_watermark_yn']."]]></pc_watermark_yn>\n";
			$xml_body .= "<pc_watermark_interval><![CDATA[".$row['pc_watermark_interval']."]]></pc_watermark_interval>\n";
			$xml_body .= "<pc_watermark_duration><![CDATA[".$row['pc_watermark_duration']."]]></pc_watermark_duration>\n";
			$xml_body .= "<color><![CDATA[".$row['pc_site_color']."]]></color>\n";
			$xml_body .= "<event_required><![CDATA[".$row['event_required']."]]></event_required>\n";

		}else{
			$error = 1;
			$message = "no data.";
		}

		$stmt->closeCursor();
	}

	$xml = null;
	$xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	$xml .= "<response>\n";
	$xml .= "<error>".$error."</error>\n";
	$xml .= "<message>".$message."</message>\n";
	$xml .= $xml_body;
	$xml .= "</response>\n";
	echo $xml;

	//log 만들기
	$log_txt = "\r\n";
	$log_txt .= $license_code."\r\n";
	$log_txt .= "ip : ".$_SERVER['REMOTE_ADDR']."\r\n";
	$log_txt .= "error : ".$error."\r\n";
	$log_txt .= "message : ".$message."\r\n\r\n";

	if($error == 1)	error_log($log_txt);
//	error_log($log_txt);
